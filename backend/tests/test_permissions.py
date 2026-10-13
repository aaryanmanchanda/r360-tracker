"""Role permissions are enforced by the API itself, so these go straight at the
endpoints the UI would hide. Also: no token = 401, and nobody approves their own request."""

import pytest

from .test_purchase_orders import raise_po
from .test_vouchers import record


def test_no_token_is_401(client):
    assert client.get("/api/budgets").status_code == 401
    assert client.get("/api/budgets", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_wrong_password_is_401(client):
    res = client.post("/api/auth/login", json={"email": "requester@r360.test", "password": "nope"})
    assert res.status_code == 401


def test_requester_cannot_approve_reject_or_issue_vrn(client, requester, approved_budget, po):
    v = record(client, requester, po["id"], "A1", "100").json()
    assert client.post(f"/api/budgets/{approved_budget['id']}/approve", headers=requester).status_code == 403
    assert client.post(f"/api/budgets/{approved_budget['id']}/reject", headers=requester, json={"reason": "x"}).status_code == 403
    assert client.post(f"/api/vouchers/{v['id']}/vrn", headers=requester, json={}).status_code == 403


def test_approver_cannot_create_budget_po_or_voucher(client, approver, approved_budget, po):
    assert client.post("/api/budgets", headers=approver, json={"title": "t", "purpose": "p", "amount": "10"}).status_code == 403
    assert raise_po(client, approver, approved_budget["id"], "10").status_code == 403
    assert record(client, approver, po["id"], "A1", "10").status_code == 403


def test_both_roles_can_read(client, requester, approver, approved_budget):
    for headers in (requester, approver):
        assert client.get("/api/budgets", headers=headers).status_code == 200
        assert client.get(f"/api/budgets/{approved_budget['id']}", headers=headers).status_code == 200


@pytest.mark.parametrize("action", ["approve", "reject"])
def test_nobody_decides_their_own_request(client, requester, action):
    """roles already block this over http, so poke the service directly to prove the rule itself holds"""
    from app import services
    from app.db import SessionLocal
    from app.models import User
    from sqlalchemy import select

    b = client.post("/api/budgets", headers=requester, json={"title": "t", "purpose": "p", "amount": "10"}).json()
    with SessionLocal() as db:
        owner = db.scalar(select(User).where(User.id == b["created_by_id"]))
        with pytest.raises(services.DomainError, match="your own"):
            if action == "approve":
                services.approve_budget(db, owner, b["id"])
            else:
                services.reject_budget(db, owner, b["id"], "nope")
