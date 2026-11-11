from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    kafka_bootstrap_servers: str = "redpanda:9092"
    kafka_consumer_group: str = "ai-service"
    kafka_request_topic: str = "ai.investigation.requested"
    kafka_result_topic: str = "ai.investigation.completed"
    postgres_dsn: str = "postgresql://greyhook:devpassword@postgres:5432/greyhook_mes"
    anthropic_api_key: str = ""
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
