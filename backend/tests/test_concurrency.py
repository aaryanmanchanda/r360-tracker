"""The FOR UPDATE lock is the whole point of services.py, so prove it: fire many
POs at once that together would blow the budget and check the cap still holds."""

from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from app.main import app


def test_parallel_pos_cannot_overspend_the_budget(requester, approved_budget):
    #10 requests of 30,000 against a 100,000 budget, only 3 can fit
    def attempt(_):
        return TestClient(app).post(
            "/api/purchase-orders",
            headers=requester,
            json={"budget_id": approved_budget["id"], "vendor_name": "Dell", "amount": "30000"},
        ).status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = list(pool.map(attempt, range(10)))

    assert codes.count(201) == 3
    assert codes.count(400) == 7
    detail = TestClient(app).get(f"/api/budgets/{approved_budget['id']}", headers=requester).json()
    assert detail["po_total"] == "90000.00"
