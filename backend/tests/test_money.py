from decimal import Decimal

import pytest

from app.money import rupees


@pytest.mark.parametrize(
    ("amount", "expected"),
    [
        ("0", "₹0.00"),
        ("999", "₹999.00"),
        ("1000", "₹1,000.00"),
        ("100000", "₹1,00,000.00"),
        ("1234567.5", "₹12,34,567.50"),
        ("123456789.99", "₹12,34,56,789.99"),
    ],
)
def test_rupees_uses_indian_grouping(amount, expected):
    assert rupees(Decimal(amount)) == expected
