import uuid
from datetime import datetime

from sqlalchemy import Float, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ShiftHandoverReport(Base):
    __tablename__ = "shift_handover_reports"
    __table_args__ = (
        Index("idx_shift_handover_org", "organization_id"),
        Index("idx_shift_handover_date", "shift_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    shift_name: Mapped[str] = mapped_column(Text, nullable=False)
    shift_date: Mapped[str] = mapped_column(Text, nullable=False)
    from_time: Mapped[str] = mapped_column(Text, nullable=False)
    to_time: Mapped[str] = mapped_column(Text, nullable=False)
    supervisor_name: Mapped[str] = mapped_column(Text, nullable=False)
    production_target: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    production_actual: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fpy_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    oee_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    downtime_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    open_ncrs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    issues: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    handover_items: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="submitted")
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now(), onupdate=func.now())
