from functools import lru_cache
from pathlib import Path

from arq.connections import RedisSettings
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+psycopg://jurisflow:jurisflow@localhost:5432/jurisflow"
    redis_url: str = "redis://localhost:6379/0"
    storage_root: Path = Path("/data/files")
    enable_structured_llm: bool = False
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-5-mini"
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openrouter/google/gemini-2.5-flash"
    openrouter_site_url: str = "http://localhost:3000"
    openrouter_app_name: str = "Jurisflow AI"
    federal_law_api_base: str = "https://api.rechtsinformationen.bund.de"
    eurlex_api_base: str = "https://eur-lex.europa.eu"
    firecrawl_api_key: str | None = None
    default_tenant_id: str = Field(
        default="00000000-0000-0000-0000-000000000001",
        validation_alias=AliasChoices("DEFAULT_TENANT_ID", "default_tenant_id"),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    try:
        settings.storage_root.mkdir(parents=True, exist_ok=True)
    except OSError:
        fallback = Path.cwd() / "data" / "files"
        fallback.mkdir(parents=True, exist_ok=True)
        settings.storage_root = fallback
    return settings


def get_redis_settings() -> RedisSettings:
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    redis_settings.conn_timeout = 5
    redis_settings.conn_retries = 30
    redis_settings.conn_retry_delay = 2
    redis_settings.retry_on_timeout = True
    return redis_settings
