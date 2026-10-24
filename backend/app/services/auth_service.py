from datetime import datetime, timedelta, timezone
import secrets
import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from ..config import get_settings
from ..database.models import User
from ..database.session import get_db

settings = get_settings()
password_hasher = PasswordHash.recommended()
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
DUMMY_HASH = password_hasher.hash(secrets.token_urlsafe(32))


def hash_password(plain: str) -> str:
    return password_hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        if hashed.startswith(("$2a$", "$2b$", "$2y$")):
            encoded = plain.encode("utf-8")
            return len(encoded) <= 72 and bcrypt.checkpw(encoded, hashed.encode("ascii"))
        return password_hasher.verify(plain, hashed)
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(data["sub"]), "iat": now, "nbf": now,
                       "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
                       "iss": settings.jwt_issuer, "aud": settings.jwt_audience,
                       "jti": secrets.token_urlsafe(24), "type": "access"},
                      settings.secret_key, algorithm="HS256")


def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    error = HTTPException(401, "Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        if len(token) > 4096:
            raise error
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"],
                             issuer=settings.jwt_issuer, audience=settings.jwt_audience,
                             options={"require": ["exp", "iat", "nbf", "sub", "iss", "aud", "jti"]})
        subject = payload["sub"]
        if payload.get("type") != "access" or not isinstance(subject, str) or not subject.isascii() or not subject.isdigit() or not 0 < int(subject) <= 2147483647:
            raise error
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise error from None
    user = db.query(User).filter(User.id == int(subject), User.is_active.is_(True)).first()
    if user is None:
        raise error
    return user


def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.id not in settings.admin_ids:
        raise HTTPException(403, "Administrator access required")
    return user
