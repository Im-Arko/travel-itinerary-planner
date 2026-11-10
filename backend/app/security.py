"""Bound requests before parsing; persist rate limits across workers and restarts."""
import hashlib
import hmac
import secrets
import time
import ipaddress
import anyio
from fastapi import Depends, HTTPException, Request
from sqlalchemy import delete, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse
from .config import get_settings
from .database.models import SecurityRateLimit, User
from .database.session import get_db
from .services.auth_service import get_current_user

settings = get_settings()


def enforce_limit(db: Session, scope: str, subject: str, maximum: int, seconds: int):
    now = int(time.time())
    window = now // seconds
    key = hmac.new(settings.secret_key.encode(), f"{scope}:{subject}:{window}".encode(), hashlib.sha256).hexdigest()
    try:
        # A conditional atomic UPDATE prevents races between workers.
        result = db.execute(update(SecurityRateLimit).where(
            SecurityRateLimit.key == key, SecurityRateLimit.hits < maximum
        ).values(hits=SecurityRateLimit.hits + 1))
        if result.rowcount == 0:
            if db.get(SecurityRateLimit, key):
                db.rollback()
                raise HTTPException(429, "Too many requests. Please try again later.",
                                    headers={"Retry-After": str(seconds - now % seconds)})
            db.add(SecurityRateLimit(key=key, hits=1, expires_at=(window + 1) * seconds))
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                # Another worker inserted the bucket; retry its conditional update.
                return enforce_limit(db, scope, subject, maximum, seconds)
        else:
            db.commit()
        if secrets.randbelow(100) == 0:
            db.execute(delete(SecurityRateLimit).where(SecurityRateLimit.expires_at < now))
            db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(503, "Request protection is temporarily unavailable") from None


def auth_limit(request: Request, db: Session = Depends(get_db)):
    enforce_limit(db, "auth-ip", client_address(request), 20, 900)


def client_address(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    try:
        trusted = [ipaddress.ip_network(value.strip()) for value in settings.trusted_proxy_networks.split(",") if value.strip()]
        address = ipaddress.ip_address(peer)
        if not any(address in network for network in trusted):
            return str(address)
        forwarded = request.headers.get("x-forwarded-for", "")
        if len(forwarded) > 1024:
            return peer
        for value in reversed(forwarded.split(",")):
            candidate = ipaddress.ip_address(value.strip())
            if not any(candidate in network for network in trusted):
                return str(candidate)
    except ValueError:
        pass
    return peer


def search_limit(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    enforce_limit(db, "search", str(user.id), 30, 60)


class RequestProtection:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        async def reject(code, detail):
            await JSONResponse({"detail": detail}, status_code=code)(scope, receive, send)

        if len(scope.get("query_string", b"")) > 4096:
            return await reject(414, "Query string is too long")
        # Buffer only bounded bodies, including chunked requests with no Content-Length.
        length = headers.get(b"content-length")
        if length is not None:
            try:
                if int(length) < 0:
                    raise ValueError()
                if int(length) > settings.max_request_bytes:
                    return await reject(413, "Request body is too large")
            except ValueError:
                return await reject(400, "Invalid Content-Length")
        if headers.get(b"content-encoding", b"identity").lower() != b"identity":
            return await reject(415, "Compressed request bodies are not supported")
        chunks = []
        size = 0
        try:
            with anyio.fail_after(15):
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return
                    chunk = message.get("body", b"")
                    size += len(chunk)
                    if size > settings.max_request_bytes:
                        return await reject(413, "Request body is too large")
                    chunks.append(chunk)
                    if not message.get("more_body", False):
                        break
        except TimeoutError:
            return await reject(408, "Request body timed out")
        body = b"".join(chunks)
        delivered = False
        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        async def secure_send(message):
            if message["type"] == "http.response.start":
                extra = [(b"x-content-type-options", b"nosniff"),
                         (b"x-frame-options", b"DENY"),
                         (b"referrer-policy", b"no-referrer"),
                         (b"cache-control", b"no-store")]
                if settings.app_env == "production":
                    extra.append((b"strict-transport-security", b"max-age=31536000; includeSubDomains"))
                message["headers"] = list(message.get("headers", [])) + extra
            await send(message)
        await self.app(scope, bounded_receive, secure_send)
