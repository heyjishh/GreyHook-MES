import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Machine(Base):
    __tablename__ = "machines"
    __table_args__ = (
        Index("idx_machines_line", "line_id"),
        Index("idx_machines_org", "organization_id"),
        CheckConstraint("protocol IN ('mqtt', 'opcua', 'simulated')", name="ck_machines_protocol"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    line_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("production_lines.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    machine_type: Mapped[str] = mapped_column(Text, nullable=False)
    asset_tag: Mapped[str | None] = mapped_column(Text, nullable=True)
    protocol: Mapped[str] = mapped_column(Text, nullable=False)
    endpoint_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    default_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_definitions.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
