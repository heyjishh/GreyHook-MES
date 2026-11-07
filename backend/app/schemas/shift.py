import uuid
from datetime import time

from pydantic import BaseModel


class PlannedStop(BaseModel):
    name: str
    duration_minutes: int


class ShiftSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    factory_id: uuid.UUID
    name: str
    start_time: time
    end_time: time
    days_of_week: list[int]
    planned_stops: list[PlannedStop]
    planned_production_time_minutes: int
    is_active: bool

    model_config = {"from_attributes": True}


class ShiftCreateRequest(BaseModel):
    name: str
    start_time: time
    end_time: time
    days_of_week: list[int]
    planned_stops: list[PlannedStop] = []


class ShiftUpdateRequest(BaseModel):
    name: str
    start_time: time
    end_time: time
    days_of_week: list[int]
    planned_stops: list[PlannedStop] = []
