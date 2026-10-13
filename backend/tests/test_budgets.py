"""Budget request rules: starts pending, decided once, reject needs a reason, no self-approval."""


def test_new_budget_starts_pending(client, requester):
    res = client.post("/api/budgets", headers=requester, json={"title": "Chairs", "purpose": "Office", "amount": "5000.50"})
    assert res.status_code == 201
    assert res.json()["status"] == "PENDING"
    assert res.json()["amount"] == "5000.50"  #string, never a float


def test_budget_rejects_zero_negative_and_blank(client, requester):
    for bad in ({"amount": "0"}, {"amount": "-5"}, {"title": "   "}, {"amount": "10.999"}):
        body = {"title": "t", "purpose": "p", "amount": "100", **bad}
        assert client.post("/api/budgets", headers=requester, json=body).status_code == 422


def test_approve_then_status_is_approved(client, requester, approver):
    b = client.post("/api/budgets", headers=requester, json={"title": "t", "purpose": "p", "amount": "100"}).json()
    res = client.post(f"/api/budgets/{b['id']}/approve", headers=approver)
    assert res.json()["status"] == "APPROVED"
    assert res.json()["decided_by"] == "Anita Approver"


def test_reject_needs_a_reason(client, requester, approver):
    b = client.post("/api/budgets", headers=requester, json={"title": "t", "purpose": "p", "amount": "100"}).json()
    assert client.post(f"/api/budgets/{b['id']}/reject", headers=approver, json={"reason": "   "}).status_code == 422
    res = client.post(f"/api/budgets/{b['id']}/reject", headers=approver, json={"reason": "Over quarterly limit"})
    assert res.json()["status"] == "REJECTED"
    assert res.json()["rejection_reason"] == "Over quarterly limit"


def test_cannot_decide_twice(client, approved_budget, approver):
    res = client.post(f"/api/budgets/{approved_budget['id']}/reject", headers=approver, json={"reason": "changed my mind"})
    assert res.status_code == 400
    assert "already approved" in res.json()["detail"]


def test_unknown_budget_is_404(client, approver):
    assert client.post("/api/budgets/999/approve", headers=approver).status_code == 404
