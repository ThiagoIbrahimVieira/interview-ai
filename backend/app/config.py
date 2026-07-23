"""
Application settings.

Uses a custom EnvSettingsSource to gracefully handle ALLOWED_ORIGINS (and
any future List[str] field) provided as a plain URL, comma-separated URLs,
or a JSON array string.  pydantic-settings v2 only accepts JSON arrays for
list-typed fields, which causes a SettingsError on platforms like Render
where users typically enter plain text values.
"""

from pydantic_settings import BaseSettings, EnvSettingsSource
from functools import lru_cache
from typing import Any
from pathlib import Path
import json

ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


# ---------------------------------------------------------------------------
# Custom env source
# ---------------------------------------------------------------------------

class FlexibleListEnvSource(EnvSettingsSource):
    """EnvSettingsSource that tolerates non-JSON list values.

    pydantic-settings v2 calls ``decode_complex_value`` (``json.loads``) on
    every field it considers complex (``list``, ``dict``, …).  When the raw
    env var is a plain URL such as ``https://app.vercel.app`` the JSON parse
    fails and the application crashes before it even starts.

    This subclass intercepts that path: if the raw value looks like a
    JSON array it delegates to the parent; otherwise it treats the value
    as a comma-separated list.  All other field types pass through
    unchanged.
    """

    def prepare_field_value(
        self,
        field_name: str,
        field: Any,
        value: Any,
        value_is_complex: bool,
    ) -> Any:
        # Check the field's own complexity classification (not the parameter,
        # which can be False even for list[str] depending on pydantic-settings
        # version internals).
        is_complex, _ = self._field_is_complex(field)

        if (is_complex or value_is_complex) and isinstance(value, str):
            stripped = value.strip()

            import logging
            trace_cfg = logging.getLogger("trace")
            trace_cfg.info(f"[TRACE] config: field={field_name} raw={repr(value)} stripped={repr(stripped)} is_complex={is_complex} value_is_complex={value_is_complex}")

            # Empty string → empty list
            if not stripped:
                return []

            # Looks like a JSON array → let the parent parse it normally
            if stripped.startswith("["):
                return super().prepare_field_value(
                    field_name, field, value, value_is_complex
                )

            # Plain text: single URL or comma-separated URLs
            result = [item.strip() for item in stripped.split(",") if item.strip()]
            trace_cfg.info(f"[TRACE] config: field={field_name} parsed result={result}")
            return result

        return super().prepare_field_value(field_name, field, value, value_is_complex)


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class Settings(BaseSettings):
    APP_NAME: str = "AI Interview Platform"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8080"]

    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_interview.db"
    DATABASE_ECHO: bool = False

    JWT_SECRET_KEY: str = "change-me-jwt"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 10
    RATE_LIMIT_AI_PER_MINUTE: int = 20
    LOG_LEVEL: str = "INFO"

    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15

    MAX_INPUT_LENGTH: int = 5000
    MAX_CUSTOM_INSTRUCTIONS_LENGTH: int = 2000
    MAX_PER_PAGE: int = 50

    model_config = {"env_file": str(ENV_FILE), "extra": "ignore"}

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        """Replace the default EnvSettingsSource with our flexible version."""
        return (
            init_settings,
            FlexibleListEnvSource(
                settings_cls,
                env_prefix=env_settings.env_prefix,
                env_parse_none_str=env_settings.env_parse_none_str,
                env_parse_enums=env_settings.env_parse_enums,
                env_nested_delimiter=env_settings.env_nested_delimiter,
            ),
            dotenv_settings,
            file_secret_settings,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
