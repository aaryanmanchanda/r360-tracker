"""Rupee formatting for error messages, matching the Indian lakh/crore grouping the UI shows."""

from decimal import Decimal


def rupees(amount: Decimal) -> str:
    """₹1,00,000.00 not ₹100,000.00: the last three digits group together, then every two."""
    whole, _, fraction = f"{amount:.2f}".partition(".")
    head, tail = whole[:-3], whole[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return f"₹{','.join([*groups, tail])}.{fraction}"
