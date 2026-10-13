"""Seeds one user per role (plus a second requester, handy for showing nobody can
touch someone else's flow). Safe to run on every boot, it skips existing emails."""

from sqlalchemy import select

from .auth import hash_password
from .db import SessionLocal
from .models import Role, User

SEED_PASSWORD = "Passw0rd!"  #demo only, listed in the README so the reviewer can log straight in

SEED_USERS = [
    ("requester@r360.test", "Riya Requester", Role.REQUESTER),
    ("requester2@r360.test", "Rohan Requester", Role.REQUESTER),
    ("approver@r360.test", "Anita Approver", Role.APPROVER),
]


def seed():
    with SessionLocal() as db:
        for email, name, role in SEED_USERS:
            if db.scalar(select(User).where(User.email == email)):
                continue
            db.add(User(email=email, full_name=name, role=role, password_hash=hash_password(SEED_PASSWORD)))
        db.commit()


if __name__ == "__main__":
    seed()
    print("seeded users")
