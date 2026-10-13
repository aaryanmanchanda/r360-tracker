"""Voucher + VRN rules: capped by the PO, unique coupons, one VRN per voucher."""


def record(client, headers, po_id, code, amount):
    return client.post("/api/vouchers", headers=headers, json={"purchase_order_id": po_id, "coupon_code": code, "amount": amount, "received_date": "2026-10-10"})


def test_voucher_over_po_is_refused(client, requester, po):
    record(client, requester, po["id"], "A1", "30000")
    res = record(client, requester, po["id"], "A2", "10000.01")
    assert res.status_code == 400
    assert "₹10,000.00 remains" in res.json()["detail"]


def test_voucher_exactly_the_remaining_is_allowed(client, requester, po):
    assert record(client, requester, po["id"], "A1", "40000").status_code == 201


def test_coupon_codes_are_unique_case_insensitive(client, requester, po):
    assert record(client, requester, po["id"], "save10", "100").status_code == 201
    res = record(client, requester, po["id"], " SAVE10 ", "100")
    assert res.status_code == 409
    assert "SAVE10" in res.json()["detail"]


def test_voucher_on_missing_po_is_404(client, requester):
    assert record(client, requester, 999, "A1", "10").status_code == 404


def test_new_voucher_is_pending_acknowledgement(client, requester, po):
    v = record(client, requester, po["id"], "A1", "100").json()
    assert v["acknowledged"] is False
    assert v["vrn"] is None


def test_issue_vrn_marks_voucher_acknowledged(client, requester, approver, po):
    v = record(client, requester, po["id"], "A1", "100").json()
    res = client.post(f"/api/vouchers/{v['id']}/vrn", headers=approver, json={"remarks": "all good"})
    assert res.status_code == 201
    assert res.json()["acknowledged"] is True
    assert res.json()["vrn"]["vrn_number"] == "VRN-00001"
    assert res.json()["vrn"]["acknowledged_by"] == "Anita Approver"


def test_second_vrn_for_same_voucher_is_refused(client, requester, approver, po):
    v = record(client, requester, po["id"], "A1", "100").json()
    client.post(f"/api/vouchers/{v['id']}/vrn", headers=approver, json={})
    assert client.post(f"/api/vouchers/{v['id']}/vrn", headers=approver, json={}).status_code == 409


def test_voucher_list_filters_by_status(client, requester, approver, po):
    done = record(client, requester, po["id"], "A1", "100").json()
    record(client, requester, po["id"], "A2", "100")
    client.post(f"/api/vouchers/{done['id']}/vrn", headers=approver, json={})
    pending = client.get("/api/vouchers?status=pending", headers=requester).json()
    acknowledged = client.get("/api/vouchers?status=acknowledged", headers=requester).json()
    assert [v["coupon_code"] for v in pending] == ["A2"]
    assert [v["coupon_code"] for v in acknowledged] == ["A1"]


def test_po_detail_shows_remaining(client, requester, po):
    record(client, requester, po["id"], "A1", "15000")
    detail = client.get(f"/api/purchase-orders/{po['id']}", headers=requester).json()
    assert detail["voucher_total"] == "15000.00"
    assert detail["remaining"] == "25000.00"
