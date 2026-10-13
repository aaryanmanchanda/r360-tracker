"""The four records from the brief (+ users). Constraints live here too, as a
second line of defence behind the rules in services.py."""

import enum
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Numeric, Sequence, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

Money = Numeric(14, 2)  #exact decimals, never float for rupees

#postgres sequences hand out PO-00001 / VRN-00001 numbers, gap-safe under concurrency unlike max(id)+1
po_number_seq = Sequence("po_number_seq", metadata=Base.metadata)
vrn_number_seq = Sequence("vrn_number_seq", metadata=Base.metadata)


def now():
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    REQUESTER = "REQUESTER"
    APPROVER = "APPROVER"


class BudgetStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[Role] = mapped_column(Enum(Role, name="role"))


class BudgetRequest(Base):
    __tablename__ = "budget_requests"
    __table_args__ = (
        CheckConstraint("amount > 0", name="budget_amount_positive"),
        CheckConstraint("status <> 'REJECTED' OR length(trim(rejection_reason)) > 0", name="rejection_needs_reason"),
        CheckConstraint("decided_by IS NULL OR decided_by <> created_by", name="no_self_approval"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    purpose: Mapped[str] = mapped_column(Text)
    amount: Mapped[Decimal] = mapped_column(Money)
    status: Mapped[BudgetStatus] = mapped_column(Enum(BudgetStatus, name="budget_status"), default=BudgetStatus.PENDING)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped[User] = relationship(foreign_keys=[created_by])
    decider: Mapped[User | None] = relationship(foreign_keys=[decided_by])
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="budget", order_by="PurchaseOrder.id")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    __table_args__ = (CheckConstraint("amount > 0", name="po_amount_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    po_number: Mapped[str] = mapped_column(String(20), unique=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budget_requests.id"))
    vendor_name: Mapped[str] = mapped_column(String(200))
    amount: Mapped[Decimal] = mapped_column(Money)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    budget: Mapped[BudgetRequest] = relationship(back_populates="purchase_orders")
    creator: Mapped[User] = relationship()
    vouchers: Mapped[list["Voucher"]] = relationship(back_populates="purchase_order", order_by="Voucher.id")


class Voucher(Base):
    __tablename__ = "vouchers"
    __table_args__ = (CheckConstraint("amount > 0", name="voucher_amount_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    coupon_code: Mapped[str] = mapped_column(String(64), unique=True)  #stored trimmed + uppercase, see services
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    amount: Mapped[Decimal] = mapped_column(Money)
    received_date: Mapped[date] = mapped_column(Date)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))

    purchase_order: Mapped[PurchaseOrder] = relationship(back_populates="vouchers")
    vrn: Mapped["VoucherReceivedNote | None"] = relationship(back_populates="voucher")


class VoucherReceivedNote(Base):
    __tablename__ = "voucher_received_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    vrn_number: Mapped[str] = mapped_column(String(20), unique=True)
    voucher_id: Mapped[int] = mapped_column(ForeignKey("vouchers.id"), unique=True)  #unique = one VRN per voucher, enforced by the db
    acknowledged_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    remarks: Mapped[str | None] = mapped_column(Text)

    voucher: Mapped[Voucher] = relationship(back_populates="vrn")
    acknowledger: Mapped[User] = relationship()
