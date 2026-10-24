from urllib.parse import parse_qs
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from ..database.session import get_db
from ..database.models import User
from ..schemas.schemas import UserRegister, UserLogin, Token, UserOut, AccountDelete
from ..services.auth_service import (
    DUMMY_HASH, hash_password, verify_password, create_access_token, get_current_user,
)
from ..security import auth_limit, enforce_limit

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=201, dependencies=[Depends(auth_limit)])
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter((User.email == payload.email) | (User.username == payload.username)).first():
        raise HTTPException(409, "An account with these details already exists")
    user = User(email=payload.email, username=payload.username,
                password_hash=hash_password(payload.password), full_name=payload.full_name)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with these details already exists") from None
    db.refresh(user)
    return user


def authenticate(payload: UserLogin, db: Session):
    enforce_limit(db, "login-account", str(payload.email).casefold(), 10, 900)
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    valid = verify_password(payload.password, user.password_hash if user else DUMMY_HASH)
    if not valid or not user or not user.is_active:
        raise HTTPException(401, "Invalid credentials", headers={"WWW-Authenticate": "Bearer"})
    if user.password_hash.startswith(("$2a$", "$2b$", "$2y$")):
        user.password_hash = hash_password(payload.password)
        db.commit()
    return {"access_token": create_access_token({"sub": str(user.id)}), "token_type": "bearer"}


@router.post("/login", response_model=Token, dependencies=[Depends(auth_limit)])
async def login(request: Request, db: Session = Depends(get_db)):
    # OAuth2-compatible bounded URL-encoded parser; multipart uploads are unnecessary.
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/x-www-form-urlencoded":
        raise HTTPException(415, "Use application/x-www-form-urlencoded")
    try:
        form = parse_qs((await request.body()).decode("utf-8"), keep_blank_values=True,
                        max_num_fields=6, errors="strict")
        if len(form.get("username", [])) != 1 or len(form.get("password", [])) != 1:
            raise ValueError("Missing or duplicate credentials")
        payload = UserLogin(email=form["username"][0], password=form["password"][0])
    except (ValueError, UnicodeError, ValidationError):
        raise HTTPException(422, "Invalid login form") from None
    return await run_in_threadpool(authenticate, payload, db)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=204, dependencies=[Depends(auth_limit)])
def delete_account(payload: AccountDelete, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    enforce_limit(db, "account-delete", str(current_user.id), 5, 900)
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    db.delete(current_user)
    db.commit()
