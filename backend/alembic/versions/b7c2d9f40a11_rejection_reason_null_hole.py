"""close the NULL hole in rejection_needs_reason

A CHECK passes when its expression is NULL, so a REJECTED row with rejection_reason NULL
slipped through. coalesce turns NULL into '' so it fails like a blank string does.

Revision ID: b7c2d9f40a11
Revises: e1077a3e5caa
Create Date: 2026-10-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'b7c2d9f40a11'
down_revision: Union[str, None] = 'e1077a3e5caa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NAME = 'rejection_needs_reason'


def upgrade() -> None:
    op.drop_constraint(NAME, 'budget_requests', type_='check')
    op.create_check_constraint(
        NAME, 'budget_requests',
        "status <> 'REJECTED' OR length(trim(coalesce(rejection_reason, ''))) > 0",
    )


def downgrade() -> None:
    op.drop_constraint(NAME, 'budget_requests', type_='check')
    op.create_check_constraint(
        NAME, 'budget_requests',
        "status <> 'REJECTED' OR length(trim(rejection_reason)) > 0",
    )
