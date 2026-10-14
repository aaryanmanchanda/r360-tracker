"""PO rules: only on an approved budget, and the PO total can never pass the budget."""

from .helpers import raise_po


def test_no_po_on_pending_budget(client, requester):
    b = client.post("/api/budgets", headers=requester, json={"title": "t", "purpose": "p", "amount": "1000"}).json()
    res = raise_po(client, requester, b["id"], "100")
    assert res.status_code == 400
    assert "approved budget" in res.json()["detail"]


def test_no_po_on_rejected_budget(client, requester, approver):
    b = client.post("/api/budgets", headers=requester, json={"title": "t", "purpose": "p", "amount": "1000"}).json()
    client.post(f"/api/budgets/{b['id']}/reject", headers=approver, json={"reason": "no"})
    assert raise_po(client, requester, b["id"], "100").status_code == 400


def test_po_over_budget_is_refused_with_remaining(client, requester, approved_budget):
    raise_po(client, requester, approved_budget["id"], "90000")
    res = raise_po(client, requester, approved_budget["id"], "10000.01")
    assert res.status_code == 400
    assert "₹10,000.00 remains" in res.json()["detail"]


def test_po_exactly_the_remaining_is_allowed(client, requester, approved_budget):
    raise_po(client, requester, approved_budget["id"], "90000")
    assert raise_po(client, requester, approved_budget["id"], "10000").status_code == 201


def test_budget_detail_shows_totals(client, requester, approved_budget):
    raise_po(client, requester, approved_budget["id"], "30000")
    raise_po(client, requester, approved_budget["id"], "20000")
    detail = client.get(f"/api/budgets/{approved_budget['id']}", headers=requester).json()
    assert detail["po_total"] == "50000.00"
    assert detail["remaining"] == "50000.00"
    assert [p["po_number"] for p in detail["purchase_orders"]] == ["PO-00001", "PO-00002"]


def test_po_on_missing_budget_is_404(client, requester):
    assert raise_po(client, requester, 999, "10").status_code == 404
