from pydantic import BaseModel


class LLMProviderInfo(BaseModel):
    has_key: bool
    model: str
    is_active: bool


class LLMProvidersResponse(BaseModel):
    providers: dict[str, LLMProviderInfo]


class SaveLLMProviderRequest(BaseModel):
    api_key: str | None = None
    model_id: str
