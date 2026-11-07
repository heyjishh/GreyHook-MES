import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class ProductionOrder(TimestampMixin, Base):
    __tablename__ = "production_orders"
    __table_args__ = (
        Index("idx_orders_line_time", "line_id", "planned_start"),
        Index("idx_orders_org", "organization_id"),
        Index(
            "idx_orders_status",
            "organization_id",
            "status",
            postgresql_where="status IN ('scheduled', 'running', 'paused')",
        ),
        CheckConstraint(
            "status IN ('scheduled', 'running', 'paused', 'completed', 'cancelled')",
            name="ck_orders_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    line_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("production_lines.id"), nullable=False
    )
    shift_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("shifts.id"), nullable=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_definitions.id"), nullable=True
    )
    order_number: Mapped[str] = mapped_column(Text, nullable=False)
    product_code: Mapped[str] = mapped_column(Text, nullable=False)
    planned_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rejected_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    planned_start: Mapped[datetime] = mapped_column(nullable=False)
    planned_end: Mapped[datetime] = mapped_column(nullable=False)
    actual_start: Mapped[datetime | None] = mapped_column(nullable=True)
    actual_end: Mapped[datetime | None] = mapped_column(nullable=True)
