import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OEEAggregate(Base):
    __tablename__ = "oee_aggregates"
    __table_args__ = (
        Index("idx_oee_machine_period", "machine_id", "period_start", "granularity"),
        CheckConstraint(
            "granularity IN ('hour', 'shift', 'day')",
            name="ck_oee_granularity",
        ),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    machine_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("machines.id"), primary_key=True
    )
    period_start: Mapped[datetime] = mapped_column(primary_key=True, nullable=False)
    period_end: Mapped[datetime] = mapped_column(nullable=False)
    granularity: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    planned_time_s: Mapped[int] = mapped_column(Integer, nullable=False)
    run_time_s: Mapped[int] = mapped_column(Integer, nullable=False)
    idle_time_s: Mapped[int] = mapped_column(Integer, nullable=False)
    fault_time_s: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    rejected_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    availability: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    performance: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    quality: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    oee: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    calculated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
