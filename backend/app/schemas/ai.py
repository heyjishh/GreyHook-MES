import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class AIContextWindowRequest(BaseModel):
    machine_id: uuid.UUID | None = None
    from_time: datetime = Field(alias="from")
    to: datetime

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def validate_time_range(self) -> "AIContextWindowRequest":
        if self.to <= self.from_time:
            raise ValueError("'to' must be after 'from'")
        return self


class AIInvestigationCreateRequest(BaseModel):
    question: str = Field(min_length=1)
    context: AIContextWindowRequest


class AIInvestigationCreateResponse(BaseModel):
    investigation_id: uuid.UUID
    status: str


class EvidenceItem(BaseModel):
    source: str
    value: Any
    timestamp: str | None = None


class Observation(BaseModel):
    claim: str
    evidence: list[EvidenceItem] = []


class Hypothesis(BaseModel):
    text: str
    confidence: Literal["low", "medium", "high"]
    supporting_evidence: list[EvidenceItem] = []


class Recommendation(BaseModel):
    action: str
    rationale: str


class AIResultSchema(BaseModel):
    summary: str
    observations: list[Observation] = []
    hypotheses: list[Hypothesis] = []
    recommendations: list[Recommendation] = []


class AIInvestigationSchema(BaseModel):
    id: uuid.UUID
    status: str
    question: str
    result: AIResultSchema | None = None
    model_provider: str | None = None
    model_id: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class FeedbackRequest(BaseModel):
    feedback: Literal["positive", "negative"]
    comment: str | None = None
