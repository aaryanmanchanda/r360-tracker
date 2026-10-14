"""Passwords, JWTs and the two FastAPI dependencies every router leans on:
get_current_user (who are you) and require_role (are you allowed)."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Role, User

bearer = HTTPBearer(auto_error=False)  #auto_error off so we return our own 401 message


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": str(user.id), "exp": expires}, settings.jwt_secret, algorithm="HS256")


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status_code=401, detail="Please log in to continue.")
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])  #checks signature + exp for us
    except jwt.PyJWTError:
        raise unauthorized from None
    user = db.get(User, int(payload["sub"]))
    if user is None:  #token outlived the user
        raise unauthorized
    return user


def require_role(role: Role):
    """Dependency factory: Depends(require_role(Role.APPROVER)) 403s everyone else.
    This is the backend half of role permissions, the UI hiding buttons is only cosmetic."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=403, detail=f"Only {role.value.title()}s can do this.")
        return user

    return checker
