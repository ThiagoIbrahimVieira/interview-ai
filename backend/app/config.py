from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "AI Interview Platform"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]

    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_interview.db"
    DATABASE_ECHO: bool = False

    JWT_SECRET_KEY: str = "change-me-jwt"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    RATE_LIMIT_PER_MINUTE: int = 60
    LOG_LEVEL: str = "INFO"

    model_config = {"env_file": str(ENV_FILE), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
