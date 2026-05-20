from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import hashlib, secrets

from ..database.models import User, RefreshToken
from ..database.session import get_db
from ..config import get_settings

settings  = get_settings()
pwd_ctx   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2    = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ── Password helpers ──────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ── JWT helpers ───────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload["type"] = "access"
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ── DB helpers ────────────────────────────────────────────────

def save_refresh_token(db: Session, user_id: int, token: str) -> None:
    rt = RefreshToken(
        user_id    = user_id,
        token_hash = _hash_token(token),
        expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(rt)
    db.commit()

def revoke_refresh_token(db: Session, token: str) -> bool:
    rt = db.query(RefreshToken).filter_by(token_hash=_hash_token(token), revoked=False).first()
    if not rt:
        return False
    rt.revoked = True
    db.commit()
    return True

def validate_refresh_token(db: Session, token: str) -> Optional[int]:
    rt = db.query(RefreshToken).filter_by(
        token_hash=_hash_token(token), revoked=False
    ).first()
    if not rt or rt.expires_at < datetime.utcnow():
        return None
    return rt.user_id


# ── Current user dependency ───────────────────────────────────

def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "access":
            raise credentials_exc
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if user is None:
        raise credentials_exc
    return user
