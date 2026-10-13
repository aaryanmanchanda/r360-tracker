"""Budget requests. Create is Requester-only, approve/reject Approver-only."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import queries, services
from ..auth import get_current_user, require_role
from ..db import get_db
from ..models import Role, User
from ..schemas import BudgetDetailOut, BudgetIn, BudgetOut, RejectIn

router = APIRouter(prefix="/budgets", tags=["budgets"], dependencies=[Depends(get_current_user)])  #every route here needs a login


@router.get("", response_model=list[BudgetOut])
def list_budgets(db: Session = Depends(get_db)):
    return queries.list_budgets(db)


@router.post("", response_model=BudgetDetailOut, status_code=201)
def create_budget(
    data: BudgetIn, db: Session = Depends(get_db), user: User = Depends(require_role(Role.REQUESTER))
):
    budget = services.create_budget(db, user, data)
    return queries.get_budget(db, budget.id)


@router.get("/{budget_id}", response_model=BudgetDetailOut)
def get_budget(budget_id: int, db: Session = Depends(get_db)):
    return queries.get_budget(db, budget_id)


@router.post("/{budget_id}/approve", response_model=BudgetDetailOut)
def approve_budget(
    budget_id: int, db: Session = Depends(get_db), user: User = Depends(require_role(Role.APPROVER))
):
    services.approve_budget(db, user, budget_id)
    return queries.get_budget(db, budget_id)


@router.post("/{budget_id}/reject", response_model=BudgetDetailOut)
def reject_budget(
    budget_id: int, data: RejectIn, db: Session = Depends(get_db), user: User = Depends(require_role(Role.APPROVER))
):
    services.reject_budget(db, user, budget_id, data.reason)
    return queries.get_budget(db, budget_id)
