import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


ERPSystem = Literal["sap_s4hana", "sap_ecc", "oracle_erp_cloud", "oracle_ebs"]
AuthType = Literal["basic", "oauth2", "api_key"]
SyncDirection = Literal["erp_to_mes", "mes_to_erp", "bidirectional"]
SyncStatus = Literal["success", "partial", "error", "running"]

SAP_MODULES = Literal["PP", "MM", "QM", "PM", "SD", "WM", "FI", "CO"]
ORACLE_MODULES = Literal["MFG", "WMS", "QUALITY", "INV", "PO", "ORDER"]


class ConnectorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    system_type: ERPSystem
    base_url: str = Field(..., min_length=1)
    auth_type: AuthType = "basic"
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    factory_id: uuid.UUID | None = None
    enabled_modules: list[str] = Field(default_factory=list)
    sap_client: str | None = None
    sap_plant: str | None = None
    oracle_org_id: str | None = None
    sync_interval_minutes: int = Field(default=15, ge=1, le=1440)

    @field_validator("base_url")
    @classmethod
    def strip_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")


class ConnectorUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    enabled_modules: list[str] | None = None
    sync_interval_minutes: int | None = None
    sap_plant: str | None = None
    oracle_org_id: str | None = None


class ConnectorOut(BaseModel):
    id: uuid.UUID
    name: str
    system_type: ERPSystem
    base_url: str
    auth_type: AuthType
    factory_id: uuid.UUID | None
    enabled_modules: list[str]
    sap_client: str | None
    sap_plant: str | None
    oracle_org_id: str | None
    sync_interval_minutes: int
    is_active: bool
    last_tested_at: datetime | None
    last_test_ok: bool | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectivityTestResult(BaseModel):
    ok: bool
    latency_ms: float | None
    message: str
    system_info: dict[str, Any] | None = None


class SyncRequest(BaseModel):
    modules: list[str] | None = None
    full_refresh: bool = False


class SyncLogOut(BaseModel):
    id: uuid.UUID
    connector_id: uuid.UUID
    module: str
    direction: SyncDirection
    status: SyncStatus
    records_fetched: int
    records_written: int
    error_count: int
    error_detail: str | None
    started_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class ERPProductionOrderOut(BaseModel):
    id: uuid.UUID
    connector_id: uuid.UUID
    erp_id: str
    erp_system: str
    module: str
    order_number: str
    material_number: str | None
    material_description: str | None
    planned_qty: str | None
    confirmed_qty: str | None
    unit: str | None
    planned_start: datetime | None
    planned_finish: datetime | None
    erp_status: str | None
    mes_status: str
    work_center: str | None
    plant: str | None
    synced_at: datetime

    model_config = {"from_attributes": True}


class ERPMaterialOut(BaseModel):
    id: uuid.UUID
    connector_id: uuid.UUID
    material_number: str
    description: str | None
    material_type: str | None
    base_unit: str | None
    stock_qty: str | None
    plant: str | None
    storage_location: str | None
    synced_at: datetime

    model_config = {"from_attributes": True}


class ModuleHealth(BaseModel):
    module: str
    display_name: str
    direction: SyncDirection
    status: SyncStatus
    last_sync: datetime | None
    records: int
    errors: int


class ConnectorHealthOut(BaseModel):
    connector_id: uuid.UUID
    connector_name: str
    system_type: str
    is_active: bool
    overall_status: SyncStatus
    modules: list[ModuleHealth]
