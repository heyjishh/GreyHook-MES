from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_JWT_DEFAULTS = {
    "dev-jwt-secret-change-in-prod",
    "change-me-in-production",
    "secret",
    "your-secret-key-here",
}

_INSECURE_DB_DEFAULTS = {"devpassword", "password", "changeme", ""}


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://greyhook:devpassword@localhost:5432/greyhook_mes"

    jwt_secret: str = "dev-jwt-secret-change-in-prod"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    kafka_bootstrap_servers: str = "localhost:9092"

    valkey_url: str = "redis://localhost:6379"

    temporal_host: str = "localhost:7233"
    temporal_namespace: str = "default"

    llm_provider: str = "claude"
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    environment: str = "development"
    log_level: str = "INFO"

    cors_origins: list[str] = []

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v or []

    @model_validator(mode="after")
    def reject_insecure_defaults_in_production(self) -> "Settings":
        if self.environment == "development":
            return self
        if self.jwt_secret in _INSECURE_JWT_DEFAULTS or len(self.jwt_secret) < 32:
            raise ValueError(
                "JWT_SECRET must be set to a strong secret (≥32 chars) in production. "
                "Generate one with: openssl rand -hex 32"
            )
        db_password = self.database_url.split("@")[0].rsplit(":", 1)[-1] if "@" in self.database_url else ""
        if db_password in _INSECURE_DB_DEFAULTS:
            raise ValueError(
                "Database URL contains a known-weak password in production. "
                "Set POSTGRES_PASSWORD to a strong value."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
