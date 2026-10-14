"""Tiny request helpers shared by the test modules."""


def raise_po(client, headers, budget_id, amount):
    return client.post(
        "/api/purchase-orders",
        headers=headers,
        json={"budget_id": budget_id, "vendor_name": "Dell", "amount": amount},
    )


def record(client, headers, po_id, code, amount):
    return client.post(
        "/api/vouchers",
        headers=headers,
        json={"purchase_order_id": po_id, "coupon_code": code, "amount": amount, "received_date": "2026-10-10"},
    )
