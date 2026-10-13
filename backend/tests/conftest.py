"""Tests run against a REAL postgres (tracker_test), not sqlite, because the rules
lean on FOR UPDATE and unique indexes that sqlite doesn't behave the same on."""

import os

import pytest
from sqlalchemy import create_engine, text

BASE_URL = os.environ.get("TEST_DATABASE_URL_BASE", "postgresql+psycopg://tracker:tracker@localhost:5432")
os.environ["DATABASE_URL"] = f"{BASE_URL}/tracker_test"  #must be set before app.* is imported, settings reads it once

from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import SEED_PASSWORD, seed  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _database():
    admin = create_engine(f"{BASE_URL}/postgres", isolation_level="AUTOCOMMIT")  #CREATE DATABASE can't run in a transaction
    with admin.connect() as conn:
        if not conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = 'tracker_test'")):
            conn.execute(text("CREATE DATABASE tracker_test"))
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture(autouse=True)
def _clean_tables():
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE users, budget_requests, purchase_orders, vouchers, voucher_received_notes RESTART IDENTITY CASCADE"))
        conn.execute(text("ALTER SEQUENCE po_number_seq RESTART"))  #standalone sequences aren't reset by RESTART IDENTITY
        conn.execute(text("ALTER SEQUENCE vrn_number_seq RESTART"))
    seed()


@pytest.fixture
def client():
    return TestClient(app)


def _login(client: TestClient, email: str) -> dict:
    res = client.post("/api/auth/login", json={"email": email, "password": SEED_PASSWORD})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture
def requester(client):
    return _login(client, "requester@r360.test")


@pytest.fixture
def requester2(client):
    return _login(client, "requester2@r360.test")


@pytest.fixture
def approver(client):
    return _login(client, "approver@r360.test")


@pytest.fixture
def approved_budget(client, requester, approver):
    """a 100,000 budget that's already approved, the starting point for PO tests"""
    budget = client.post("/api/budgets", headers=requester, json={"title": "Laptops", "purpose": "Dev team", "amount": "100000"}).json()
    assert client.post(f"/api/budgets/{budget['id']}/approve", headers=approver).status_code == 200
    return budget


@pytest.fixture
def po(client, requester, approved_budget):
    """a 40,000 PO on the approved budget, the starting point for voucher tests"""
    res = client.post("/api/purchase-orders", headers=requester, json={"budget_id": approved_budget["id"], "vendor_name": "Dell", "amount": "40000"})
    assert res.status_code == 201
    return res.json()
