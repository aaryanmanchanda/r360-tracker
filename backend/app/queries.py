"""Read side: turns rows into the response schemas. Totals come from one grouped
aggregate per list (no query per row), then get stitched on in python."""

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from .models import BudgetRequest, PurchaseOrder, Voucher, VoucherReceivedNote
from .schemas import (
    BudgetDetailOut,
    BudgetOut,
    PurchaseOrderDetailOut,
    PurchaseOrderOut,
    VoucherOut,
    VrnOut,
)
from .services import NotFound


def _po_totals(db: Session, budget_ids: list[int]) -> dict[int, Decimal]:
    rows = db.execute(
        select(PurchaseOrder.budget_id, func.sum(PurchaseOrder.amount))
        .where(PurchaseOrder.budget_id.in_(budget_ids))
        .group_by(PurchaseOrder.budget_id)
    )
    return {budget_id: total for budget_id, total in rows}  # budgets with no POs just aren't in here


def _voucher_totals(db: Session, po_ids: list[int]) -> dict[int, Decimal]:
    rows = db.execute(
        select(Voucher.purchase_order_id, func.sum(Voucher.amount))
        .where(Voucher.purchase_order_id.in_(po_ids))
        .group_by(Voucher.purchase_order_id)
    )
    return {po_id: total for po_id, total in rows}


def _budget_out(b: BudgetRequest, po_total: Decimal) -> BudgetOut:
    return BudgetOut(
        id=b.id,
        title=b.title,
        purpose=b.purpose,
        amount=b.amount,
        status=b.status,
        rejection_reason=b.rejection_reason,
        created_by_id=b.created_by,
        created_by=b.creator.full_name,
        created_at=b.created_at,
        decided_by=b.decider.full_name if b.decider else None,
        decided_at=b.decided_at,
        po_total=po_total,
        remaining=b.amount - po_total,
    )


def _po_out(po: PurchaseOrder, voucher_total: Decimal) -> PurchaseOrderOut:
    return PurchaseOrderOut(
        id=po.id,
        po_number=po.po_number,
        budget_id=po.budget_id,
        budget_title=po.budget.title,
        vendor_name=po.vendor_name,
        amount=po.amount,
        created_by=po.creator.full_name,
        created_at=po.created_at,
        voucher_total=voucher_total,
        remaining=po.amount - voucher_total,
    )


def _voucher_out(v: Voucher) -> VoucherOut:
    vrn = None
    if v.vrn:
        vrn = VrnOut(
            vrn_number=v.vrn.vrn_number,
            acknowledged_by=v.vrn.acknowledger.full_name,
            acknowledged_at=v.vrn.acknowledged_at,
            remarks=v.vrn.remarks,
        )
    return VoucherOut(
        id=v.id,
        coupon_code=v.coupon_code,
        purchase_order_id=v.purchase_order_id,
        po_number=v.purchase_order.po_number,
        amount=v.amount,
        received_date=v.received_date,
        acknowledged=vrn is not None,
        vrn=vrn,
    )


def list_budgets(db: Session) -> list[BudgetOut]:
    budgets = db.scalars(
        select(BudgetRequest)
        .options(joinedload(BudgetRequest.creator), joinedload(BudgetRequest.decider))
        .order_by(BudgetRequest.id.desc())
    ).all()
    totals = _po_totals(db, [b.id for b in budgets])
    return [_budget_out(b, totals.get(b.id, Decimal(0))) for b in budgets]


def get_budget(db: Session, budget_id: int) -> BudgetDetailOut:
    b = db.scalar(
        select(BudgetRequest)
        .where(BudgetRequest.id == budget_id)
        .options(joinedload(BudgetRequest.creator), joinedload(BudgetRequest.decider))
    )
    if b is None:
        raise NotFound(f"Budget {budget_id} does not exist.")
    pos = db.scalars(
        select(PurchaseOrder)
        .where(PurchaseOrder.budget_id == b.id)
        .options(joinedload(PurchaseOrder.budget), joinedload(PurchaseOrder.creator))
        .order_by(PurchaseOrder.id)
    ).all()
    voucher_totals = _voucher_totals(db, [po.id for po in pos])
    po_total = sum((po.amount for po in pos), Decimal(0))
    return BudgetDetailOut(
        **_budget_out(b, po_total).model_dump(),
        purchase_orders=[_po_out(po, voucher_totals.get(po.id, Decimal(0))) for po in pos],
    )


def get_purchase_order(db: Session, po_id: int) -> PurchaseOrderDetailOut:
    po = db.scalar(
        select(PurchaseOrder)
        .where(PurchaseOrder.id == po_id)
        .options(joinedload(PurchaseOrder.budget), joinedload(PurchaseOrder.creator))
    )
    if po is None:
        raise NotFound(f"Purchase order {po_id} does not exist.")
    vouchers = list_vouchers(db, po_id=po.id)
    voucher_total = sum((v.amount for v in vouchers), Decimal(0))
    return PurchaseOrderDetailOut(**_po_out(po, voucher_total).model_dump(), vouchers=vouchers)


def _voucher_stmt():
    return select(Voucher).options(
        joinedload(Voucher.purchase_order),
        joinedload(Voucher.vrn).joinedload(VoucherReceivedNote.acknowledger),
    )


def list_vouchers(db: Session, acknowledged: bool | None = None, po_id: int | None = None) -> list[VoucherOut]:
    stmt = _voucher_stmt().order_by(Voucher.id.desc())
    if po_id is not None:
        stmt = stmt.where(Voucher.purchase_order_id == po_id)
    if acknowledged is True:
        stmt = stmt.where(Voucher.vrn.has())  # has() = exists-subquery on the one-to-one
    if acknowledged is False:
        stmt = stmt.where(~Voucher.vrn.has())
    return [_voucher_out(v) for v in db.scalars(stmt)]


def get_voucher(db: Session, voucher_id: int) -> VoucherOut:
    voucher = db.scalar(_voucher_stmt().where(Voucher.id == voucher_id))
    if voucher is None:
        raise NotFound(f"Voucher {voucher_id} does not exist.")
    return _voucher_out(voucher)
