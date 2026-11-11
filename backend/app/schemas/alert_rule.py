import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AlertRuleCreate(BaseModel):
    name: str
    event_type: str
    threshold: float | None = None
    channel_type: str
    channel_config: dict[str, Any] = {}
    enabled: bool = True


class AlertRuleUpdate(BaseModel):
    name: str | None = None
    threshold: float | None = None
    channel_config: dict[str, Any] | None = None
    enabled: bool | None = None


class AlertRuleSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    event_type: str
    threshold: float | None
    channel_type: str
    channel_config: dict[str, Any]
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
