import enum
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class MachineProtocol(str, enum.Enum):
    mqtt = "mqtt"
    opcua = "opcua"
    simulated = "simulated"


class MachineState(str, enum.Enum):
    running = "running"
    idle = "idle"
    fault = "fault"
    offline = "offline"


class MachineSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    line_id: uuid.UUID
    name: str
    machine_type: str
    asset_tag: str | None
    protocol: MachineProtocol
    is_active: bool
    created_at: datetime
    default_product_id: uuid.UUID | None

    model_config = {"from_attributes": True}


class MachineCreateRequest(BaseModel):
    name: str
    machine_type: str
    protocol: MachineProtocol = MachineProtocol.simulated
    asset_tag: str | None = None
    endpoint_config: dict[str, Any] | None = None
    default_product_id: uuid.UUID | None = None


class MachineUpdateRequest(BaseModel):
    name: str | None = None
    machine_type: str | None = None
    asset_tag: str | None = None
    endpoint_config: dict[str, Any] | None = None
    default_product_id: uuid.UUID | None = None


class MachineStatusSchema(BaseModel):
    machine_id: uuid.UUID
    name: str
    line_id: uuid.UUID
    current_state: MachineState
    state_since: datetime
    last_event_at: datetime | None

    model_config = {"from_attributes": True}
