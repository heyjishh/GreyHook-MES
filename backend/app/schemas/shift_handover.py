import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class HandoverIssue(BaseModel):
    severity: str
    description: str
    action: str
    resolved: bool = False


class HandoverItem(BaseModel):
    category: str
    item: str
    from_name: str
    to_name: str | None = None


class ShiftHandoverCreate(BaseModel):
    shift_name: str
    shift_date: str
    from_time: str
    to_time: str
    supervisor_name: str
    production_target: int = 0
    production_actual: int = 0
    fpy_pct: float = 0.0
    oee_pct: float = 0.0
    downtime_minutes: int = 0
    open_ncrs: int = 0
    notes: str = ""
    issues: list[dict[str, Any]] = []
    handover_items: list[dict[str, Any]] = []


class ShiftHandoverUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None


class ShiftHandoverSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    shift_name: str
    shift_date: str
    from_time: str
    to_time: str
    supervisor_name: str
    production_target: int
    production_actual: int
    fpy_pct: float
    oee_pct: float
    downtime_minutes: int
    open_ncrs: int
    notes: str
    issues: list[Any]
    handover_items: list[Any]
    status: str
    submitted_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
