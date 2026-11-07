import enum
import uuid
from datetime import datetime

from pydantic import BaseModel


class OEEGranularity(str, enum.Enum):
    hour = "hour"
    shift = "shift"
    day = "day"


class OEEAggregateSchema(BaseModel):
    period_start: datetime
    period_end: datetime
    granularity: OEEGranularity
    availability: float | None
    performance: float | None
    quality: float | None
    oee: float | None

    model_config = {"from_attributes": True}


class OEESummarySchema(BaseModel):
    availability: float | None
    performance: float | None
    quality: float | None
    oee: float | None
    period: dict


class OEEDayItem(BaseModel):
    date: str
    availability: float | None
    performance: float | None
    quality: float | None
    oee: float | None


class OEE7DayResponse(BaseModel):
    items: list[OEEDayItem]
    factory_id: uuid.UUID


class PerMachineOEEItem(BaseModel):
    machine_id: uuid.UUID
    machine_name: str
    availability: float | None
    performance: float | None
    quality: float | None
    oee: float | None
    period_start: datetime | None
    period_end: datetime | None


class PerMachineOEEResponse(BaseModel):
    items: list[PerMachineOEEItem]
    factory_id: uuid.UUID


class MachineHourlyOEEResponse(BaseModel):
    machine_id: uuid.UUID
    items: list[OEEAggregateSchema]
