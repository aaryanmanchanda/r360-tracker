"""ALL the workflow rules live here, nowhere else. Routers only call these.

Every write follows the same shape:
  1. lock the parent row (SELECT ... FOR UPDATE) so concurrent requests queue up
  2. check the rules against fresh numbers
  3. insert + commit (commit releases the lock)
Without step 1, two requests could both read "10k remaining" and both spend it."""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import (
    BudgetRequest,
    BudgetStatus,
    PurchaseOrder,
    User,
    Voucher,
    VoucherReceivedNote,
    po_number_seq,
    vrn_number_seq,
)
from .schemas import BudgetIn, PurchaseOrderIn, VoucherIn


class DomainError(Exception):
    """A broken business rule. main.py turns it into a readable json error."""

    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFound(DomainError):
    status_code = 404


class Conflict(DomainError):
    status_code = 409  #duplicates, e.g. coupon already used


def rupees(amount: Decimal) -> str:
    return f"₹{amount:,.2f}"


def _lock(db: Session, model, row_id: int, label: str):
    row = db.scalar(select(model).where(model.id == row_id).with_for_update())
    if row is None:
        raise NotFound(f"{label} {row_id} does not exist.")
    return row


def _sum(db: Session, column, where) -> Decimal:
    return db.scalar(select(func.coalesce(func.sum(column), 0)).where(where))  #coalesce so no rows = 0 not None


# ---------- budgets ----------
def create_budget(db: Session, user: User, data: BudgetIn) -> BudgetRequest:
    budget = BudgetRequest(title=data.title, purpose=data.purpose, amount=data.amount, created_by=user.id)
    db.add(budget)
    db.commit()
    return budget


def _decidable_budget(db: Session, user: User, budget_id: int) -> BudgetRequest:
    budget = _lock(db, BudgetRequest, budget_id, "Budget")
    if budget.status != BudgetStatus.PENDING:
        raise DomainError(f"This budget is already {budget.status.value.lower()}, it can't be decided again.")
    if budget.created_by == user.id:  #roles already split this, kept as defence in depth
        raise DomainError("You can't approve or reject your own budget request.")
    return budget


def approve_budget(db: Session, user: User, budget_id: int) -> BudgetRequest:
    budget = _decidable_budget(db, user, budget_id)
    budget.status = BudgetStatus.APPROVED
    budget.decided_by = user.id
    budget.decided_at = datetime.now(timezone.utc)
    db.commit()
    return budget


def reject_budget(db: Session, user: User, budget_id: int, reason: str) -> BudgetRequest:
    budget = _decidable_budget(db, user, budget_id)
    budget.status = BudgetStatus.REJECTED
    budget.rejection_reason = reason
    budget.decided_by = user.id
    budget.decided_at = datetime.now(timezone.utc)
    db.commit()
    return budget


# ---------- purchase orders ----------
def create_purchase_order(db: Session, user: User, data: PurchaseOrderIn) -> PurchaseOrder:
    budget = _lock(db, BudgetRequest, data.budget_id, "Budget")  #lock = no two POs can race past the cap
    if budget.status != BudgetStatus.APPROVED:
        raise DomainError(f"POs can only be raised on an approved budget, this one is {budget.status.value.lower()}.")

    already_ordered = _sum(db, PurchaseOrder.amount, PurchaseOrder.budget_id == budget.id)
    remaining = budget.amount - already_ordered
    if data.amount > remaining:
        raise DomainError(
            f"This PO is {rupees(data.amount)} but only {rupees(remaining)} remains on the budget "
            f"({rupees(already_ordered)} of {rupees(budget.amount)} already ordered)."
        )

    po = PurchaseOrder(
        po_number=f"PO-{db.scalar(po_number_seq.next_value()):05d}",
        budget_id=budget.id,
        vendor_name=data.vendor_name,
        amount=data.amount,
        created_by=user.id,
    )
    db.add(po)
    db.commit()
    return po


# ---------- vouchers ----------
def record_voucher(db: Session, user: User, data: VoucherIn) -> Voucher:
    po = _lock(db, PurchaseOrder, data.purchase_order_id, "Purchase order")
    code = data.coupon_code.upper()  #SAVE10 and save10 are the same coupon

    if db.scalar(select(Voucher.id).where(Voucher.coupon_code == code)):
        raise Conflict(f"Coupon code {code} has already been recorded.")

    already_received = _sum(db, Voucher.amount, Voucher.purchase_order_id == po.id)
    remaining = po.amount - already_received
    if data.amount > remaining:
        raise DomainError(
            f"This voucher is {rupees(data.amount)} but only {rupees(remaining)} remains on {po.po_number} "
            f"({rupees(already_received)} of {rupees(po.amount)} already received)."
        )

    voucher = Voucher(
        coupon_code=code,
        purchase_order_id=po.id,
        amount=data.amount,
        received_date=data.received_date,
        created_by=user.id,
    )
    db.add(voucher)
    try:
        db.commit()
    except IntegrityError:  #the unique index caught a race the select above couldn't
        db.rollback()
        raise Conflict(f"Coupon code {code} has already been recorded.")
    return voucher


# ---------- VRNs ----------
def issue_vrn(db: Session, user: User, voucher_id: int, remarks: str | None) -> VoucherReceivedNote:
    voucher = _lock(db, Voucher, voucher_id, "Voucher")
    if db.scalar(select(VoucherReceivedNote.id).where(VoucherReceivedNote.voucher_id == voucher.id)):
        raise Conflict(f"Voucher {voucher.coupon_code} already has a VRN.")

    vrn = VoucherReceivedNote(
        vrn_number=f"VRN-{db.scalar(vrn_number_seq.next_value()):05d}",
        voucher_id=voucher.id,
        acknowledged_by=user.id,
        remarks=(remarks or "").strip() or None,  #blank remarks stored as null
    )
    db.add(vrn)
    db.commit()
    return vrn
