import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin


class IntegrationConnector(TimestampMixin, Base):
    __tablename__ = "integration_connectors"
    __table_args__ = (
        Index("idx_connectors_org", "organization_id"),
        Index("idx_connectors_factory", "factory_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    factory_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    system_type: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[str] = mapped_column(Text, nullable=False)
    auth_type: Mapped[str] = mapped_column(Text, nullable=False, default="basic")
    credentials_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    enabled_modules: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    sap_client: Mapped[str | None] = mapped_column(Text, nullable=True)
    sap_plant: Mapped[str | None] = mapped_column(Text, nullable=True)
    oracle_org_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    sync_interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_tested_at: Mapped[datetime | None] = mapped_column(nullable=True)
    last_test_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)


class IntegrationSyncLog(Base):
    __tablename__ = "integration_sync_logs"
    __table_args__ = (
        Index("idx_sync_logs_connector", "connector_id"),
        Index("idx_sync_logs_started", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connector_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_connectors.id"), nullable=False)
    module: Mapped[str] = mapped_column(Text, nullable=False)
    direction: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    records_fetched: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    records_written: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)


class ERPProductionOrder(TimestampMixin, Base):
    __tablename__ = "erp_production_orders"
    __table_args__ = (
        Index("idx_erp_po_connector", "connector_id"),
        Index("idx_erp_po_org", "organization_id"),
        Index("idx_erp_po_erp_id", "erp_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connector_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_connectors.id"), nullable=False)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    factory_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=True)
    erp_id: Mapped[str] = mapped_column(Text, nullable=False)
    erp_system: Mapped[str] = mapped_column(Text, nullable=False)
    module: Mapped[str] = mapped_column(Text, nullable=False)
    order_number: Mapped[str] = mapped_column(Text, nullable=False)
    material_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    material_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    planned_qty: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirmed_qty: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    planned_start: Mapped[datetime | None] = mapped_column(nullable=True)
    planned_finish: Mapped[datetime | None] = mapped_column(nullable=True)
    actual_start: Mapped[datetime | None] = mapped_column(nullable=True)
    actual_finish: Mapped[datetime | None] = mapped_column(nullable=True)
    erp_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    mes_status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    work_center: Mapped[str | None] = mapped_column(Text, nullable=True)
    plant: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    synced_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())


class ERPMaterial(TimestampMixin, Base):
    __tablename__ = "erp_materials"
    __table_args__ = (
        Index("idx_erp_mat_connector", "connector_id"),
        Index("idx_erp_mat_number", "material_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connector_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("integration_connectors.id"), nullable=False)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    material_number: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    material_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    stock_qty: Mapped[str | None] = mapped_column(Text, nullable=True)
    plant: Mapped[str | None] = mapped_column(Text, nullable=True)
    storage_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    synced_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
