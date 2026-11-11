from pydantic import BaseModel


class InvestigationRequest(BaseModel):
    investigation_id: str
    organization_id: str
    question: str
    machine_id: str | None = None
    from_time: str
    to_time: str
    model_id: str = "claude-sonnet-4-6"
    model_provider: str = "anthropic"
    api_key: str | None = None
    created_at: str


class EvidenceSnippet(BaseModel):
    content: str
    source: str


class InvestigationResult(BaseModel):
    investigation_id: str
    organization_id: str
    status: str
    answer: str | None = None
    evidence_snippets: list[EvidenceSnippet] = []
    error_message: str | None = None
    tokens_used: int = 0
    model_id: str = "claude-sonnet-4-6"
    completed_at: str
