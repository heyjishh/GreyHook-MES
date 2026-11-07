import uuid
from datetime import datetime

from pydantic import BaseModel


class DowntimeEventSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    machine_id: uuid.UUID
    order_id: uuid.UUID | None
    category: str
    reason: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    is_planned: bool
    logged_by: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DowntimeCreateRequest(BaseModel):
    category: str
    reason: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    is_planned: bool = False


class DowntimeUpdateRequest(BaseModel):
    category: str | None = None
    reason: str | None = None
    ended_at: datetime | None = None


class ParetoCategorySchema(BaseModel):
    category: str
    duration_s: int
    event_count: int
    pct: float
    cumulative_pct: float = 0.0
