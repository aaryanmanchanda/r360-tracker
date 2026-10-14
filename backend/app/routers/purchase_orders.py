"""Purchase orders. Only a Requester raises them, and only on an approved budget (services.py checks that)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import queries, services
from ..auth import get_current_user, require_role
from ..db import get_db
from ..models import Role, User
from ..schemas import PurchaseOrderDetailOut, PurchaseOrderIn

router = APIRouter(prefix="/purchase-orders", tags=["purchase orders"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=PurchaseOrderDetailOut, status_code=201)
def create_purchase_order(
    data: PurchaseOrderIn, db: Session = Depends(get_db), user: User = Depends(require_role(Role.REQUESTER))
):
    po = services.create_purchase_order(db, user, data)
    return queries.get_purchase_order(db, po.id)


@router.get("/{po_id}", response_model=PurchaseOrderDetailOut)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    return queries.get_purchase_order(db, po_id)
