from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "aro"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./aro.db"

    # Security
    SECRET_KEY: str
    ENCRYPTION_KEY: str  # base64-encoded 32 bytes
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    DEFAULT_MODEL: str = "claude-sonnet-4-20250514"
    HAIKU_MODEL: str = "claude-haiku-4-5-20251001"
    OPUS_MODEL: str = "claude-opus-4-20250414"

    # Ollama (offline fallback)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "exaone3.5:7.8b"

    # Initial admin seeding
    INITIAL_ADMIN_PASSWORD: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
