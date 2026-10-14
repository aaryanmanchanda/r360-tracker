"""Pydantic models: what comes in (validated) and what goes out.
Decimal fields serialize as strings in json so the browser never does float maths on rupees."""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from .models import BudgetStatus, Role

Amount = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]  # positive, 2dp, fits Numeric(14,2)
NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]  # blank-after-trim is rejected


# ---------- in ----------
class LoginIn(BaseModel):
    email: str  # plain str on purpose: a bad login should say "invalid email or password", not a format error
    password: str


class BudgetIn(BaseModel):
    title: Annotated[NonBlank, Field(max_length=200)]
    purpose: NonBlank
    amount: Amount


class RejectIn(BaseModel):
    reason: NonBlank


class PurchaseOrderIn(BaseModel):
    budget_id: int
    vendor_name: Annotated[NonBlank, Field(max_length=200)]
    amount: Amount


class VoucherIn(BaseModel):
    purchase_order_id: int
    coupon_code: Annotated[NonBlank, Field(max_length=64)]
    amount: Amount
    received_date: date


class VrnIn(BaseModel):
    remarks: str | None = None


# ---------- out ----------
class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: Role


class LoginOut(BaseModel):
    token: str
    user: UserOut


class VrnOut(BaseModel):
    vrn_number: str
    acknowledged_by: str
    acknowledged_at: datetime
    remarks: str | None


class VoucherOut(BaseModel):
    id: int
    coupon_code: str
    purchase_order_id: int
    po_number: str
    amount: Decimal
    received_date: date
    acknowledged: bool  # true only once a VRN exists
    vrn: VrnOut | None


class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    budget_id: int
    budget_title: str
    vendor_name: str
    amount: Decimal
    created_by: str
    created_at: datetime
    voucher_total: Decimal
    remaining: Decimal  # po amount minus vouchers received


class PurchaseOrderDetailOut(PurchaseOrderOut):
    vouchers: list[VoucherOut]


class BudgetOut(BaseModel):
    id: int
    title: str
    purpose: str
    amount: Decimal
    status: BudgetStatus
    rejection_reason: str | None
    created_by_id: int
    created_by: str
    created_at: datetime
    decided_by: str | None
    decided_at: datetime | None
    po_total: Decimal
    remaining: Decimal  # budget amount minus POs raised (only meaningful once approved)


class BudgetDetailOut(BudgetOut):
    purchase_orders: list[PurchaseOrderOut]
