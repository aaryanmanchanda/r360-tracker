"""Vouchers (Requester records them) and VRNs (Approver acknowledges them)."""

from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import queries, services
from ..auth import get_current_user, require_role
from ..db import get_db
from ..models import Role, User
from ..schemas import VoucherIn, VoucherOut, VrnIn

router = APIRouter(prefix="/vouchers", tags=["vouchers"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[VoucherOut])
def list_vouchers(status: Literal["pending", "acknowledged"] | None = None, db: Session = Depends(get_db)):
    acknowledged = None if status is None else status == "acknowledged"
    return queries.list_vouchers(db, acknowledged=acknowledged)


@router.post("", response_model=VoucherOut, status_code=201)
def record_voucher(data: VoucherIn, db: Session = Depends(get_db), user: User = Depends(require_role(Role.REQUESTER))):
    voucher = services.record_voucher(db, user, data)
    return queries.get_voucher(db, voucher.id)


@router.post("/{voucher_id}/vrn", response_model=VoucherOut, status_code=201)
def issue_vrn(
    voucher_id: int, data: VrnIn, db: Session = Depends(get_db), user: User = Depends(require_role(Role.APPROVER))
):
    services.issue_vrn(db, user, voucher_id, data.remarks)
    return queries.get_voucher(db, voucher_id)
