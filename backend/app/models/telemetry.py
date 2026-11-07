import uuid
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Integer

from app.core.database import Base


class MachineEvent(Base):
    __tablename__ = "machine_events"
    __table_args__ = (
        Index("idx_events_machine_time", "machine_id", "event_time"),
        UniqueConstraint("event_id", "event_time", name="idx_events_dedup"),
    )

    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, nullable=False)
    event_time: Mapped[datetime] = mapped_column(primary_key=True, nullable=False)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    machine_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False
    )
    ingested_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    source_seq: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    gateway_id: Mapped[str] = mapped_column(Text, nullable=False)


class MachineStatePeriod(Base):
    __tablename__ = "machine_state_periods"
    __table_args__ = (
        Index("idx_state_machine_time", "machine_id", "started_at"),
        CheckConstraint(
            "state IN ('running', 'idle', 'fault', 'offline')",
            name="ck_state_periods_state",
        ),
        CheckConstraint(
            "source IN ('telemetry', 'manual')",
            name="ck_state_periods_source",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    machine_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("machines.id"), nullable=False
    )
    state: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(Text, nullable=False)
