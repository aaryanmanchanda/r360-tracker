"""Login + who-am-i. The only routes that don't need a token (login) or any role (me)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import create_token, get_current_user, verify_password
from ..db import get_db
from ..models import User
from ..schemas import LoginIn, LoginOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.strip().lower()))
    if user is None or not verify_password(data.password, user.password_hash):
        #same message for both so we don't leak which emails exist
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return LoginOut(token=create_token(user), user=UserOut.model_validate(user, from_attributes=True))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
