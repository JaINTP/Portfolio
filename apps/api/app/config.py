"""Runtime configuration loaded via environment variables."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Iterable

from urllib.parse import urlparse

from pydantic import AliasChoices, AnyHttpUrl, EmailStr, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings.sources import DotEnvSettingsSource, EnvSettingsSource

DEFAULT_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/portfolio"
DEFAULT_FRONTEND_ORIGIN = "http://127.0.0.1:3000"
DEFAULT_DEVELOPMENT_ORIGINS = ("http://localhost:3000",)
DEFAULT_TRUSTED_HOSTS = ("127.0.0.1", "localhost")
DEFAULT_TRUSTED_PROXIES = ("127.0.0.1",)
DELIMITED_LIST_FIELDS = {"development_origins", "trusted_hosts", "trusted_proxies"}


def _parse_delimited_list(value: Iterable[str] | str | None) -> list[str] | None:
    """Return a list of non-empty, stripped strings from env-style inputs."""

    if value is None:
        return None
    if isinstance(value, str):
        stripped_value = value.strip()
        if not stripped_value:
            return None
        if stripped_value.startswith("[") and stripped_value.endswith("]"):
            try:
                parsed = json.loads(stripped_value)
            except json.JSONDecodeError:
                parsed = None
            else:
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
        tokens: list[str] = []
        for chunk in stripped_value.replace("\n", ",").split(","):
            item = chunk.strip()
            if item:
                tokens.append(item)
        return tokens
    return [str(item).strip() for item in value if str(item).strip()]


class Settings(BaseSettings):
    """Application settings validated with pydantic-settings."""

    model_config = SettingsConfigDict(
        env_file=(".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        env_ignore_empty=True,
    )

    database_url: str = Field(default=DEFAULT_DATABASE_URL)
    environment: str = Field(default="development")
    frontend_origin: AnyHttpUrl = Field(
        default=DEFAULT_FRONTEND_ORIGIN,
        description="Primary SPA origin allowed to access the API.",
    )
    development_origins: list[AnyHttpUrl] = Field(
        default_factory=list,
        description="Additional origins allowed during development only.",
    )
    admin_email: EmailStr = Field(
        default="admin@example.com",
        description="Email address used as the administrative login identifier.",
        validation_alias=AliasChoices("ADMIN_EMAIL", "ADMIN_USERNAME"),
        alias="ADMIN_EMAIL",
    )
    admin_password_hash: str = Field(
        default="",
        description="BCrypt hash for the administrative user password.",
    )
    jwt_secret_key: str = Field(default="dev-secret", min_length=1)
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60, ge=5, le=24 * 60)
    uploads_dir: Path = Field(default=Path("uploads"))
    database_pool_size: int = Field(default=5, ge=1, le=20)
    database_max_overflow: int = Field(default=5, ge=0, le=20)
    database_pool_timeout: int = Field(default=10, ge=1, le=60)
    trusted_hosts: list[str] = Field(
        default_factory=lambda: list(DEFAULT_TRUSTED_HOSTS),
        description="Explicit list of Host headers accepted by the API tier.",
    )
    trusted_proxies: list[str] = Field(
        default_factory=lambda: list(DEFAULT_TRUSTED_PROXIES),
        description="IP ranges allowed to forward X-Forwarded-* headers.",
    )
    enable_hsts: bool = Field(default=True)
    session_secret_key: str = Field(
        default="dev-session-secret",
        description="Secret key used for signing server-side session data.",
    )
    session_cookie_name: str = Field(default="portfolio_session")
    session_cookie_secure: bool = Field(default=True)
    session_cookie_samesite: str = Field(default="strict")
    session_cookie_domain: str | None = Field(default=None)
    session_cookie_max_age_seconds: int = Field(default=3600, ge=300)
    forwarded_allow_ips: str = Field(default="127.0.0.1")
    api_rate_limit: str = Field(default="120/minute")
    api_rate_limit_burst: int = Field(default=240, ge=1)
    login_rate_limit: str = Field(default="10/minute")

    @field_validator("development_origins", mode="before")
    @classmethod
    def parse_development_origins(cls, value: Iterable[str] | str | None) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            parsed = _parse_delimited_list(value)
            if parsed is None:
                return []
            return parsed
        return [item.strip() for item in value if str(item).strip()]

    @field_validator("development_origins")
    @classmethod
    def validate_development_origins(cls, value: list[AnyHttpUrl]) -> list[AnyHttpUrl]:
        cleaned: list[AnyHttpUrl] = []
        for origin in value:
            s_origin = str(origin)
            if s_origin == "*":
                raise ValueError("Wildcards are not permitted in development_origins.")
            # We don't need to manually strip / if using AnyHttpUrl, but let's just return as is
            cleaned.append(origin)
        return cleaned

    @field_validator("trusted_hosts", "trusted_proxies", mode="before")
    @classmethod
    def parse_csv(cls, value: Iterable[str] | str | None) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            parsed = _parse_delimited_list(value)
            if parsed is None:
                return []
            return parsed
        return [item.strip() for item in value if str(item).strip()]

    @field_validator("trusted_hosts", "trusted_proxies")
    @classmethod
    def ensure_non_empty(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("Trusted host/proxy lists must not be empty.")
        return value

    @field_validator("environment")
    @classmethod
    def normalise_environment(cls, value: str) -> str:
        return value.lower()

    @field_validator("session_cookie_samesite")
    @classmethod
    def validate_samesite(cls, value: str) -> str:
        normalised = value.lower()
        allowed = {"lax", "strict", "none"}
        if normalised not in allowed:
            raise ValueError(f"session_cookie_samesite must be one of {allowed}.")
        if normalised == "none":
            # When SameSite=None, cookies must be Secure per modern browser requirements.
            raise ValueError("SameSite=None is not supported for security reasons.")
        return normalised

    @field_validator("uploads_dir", mode="after")
    @classmethod
    def ensure_uploads_dir(cls, value: Path) -> Path:
        """Ensure the uploads directory exists, but don't crash if read-only."""
        resolved = value.expanduser().resolve()
        try:
            resolved.mkdir(parents=True, exist_ok=True)
        except (OSError, PermissionError):
            # Fallback for serverless/read-only environments like Vercel.
            # We log a warning but allow the application to start.
            from logging import getLogger
            getLogger("app.config").warning(
                "Could not create uploads_dir at %s (read-only filesystem?)", resolved
            )
        return resolved

    @property
    def allowed_cors_origins(self) -> list[str]:
        origins = {str(self.frontend_origin).rstrip("/")}
        if self.environment == "development":
            additional = (
                self.development_origins
                if self.development_origins
                else DEFAULT_DEVELOPMENT_ORIGINS
            )
            for origin in additional:
                origins.add(str(origin).rstrip("/"))
        return sorted(origins)

    @model_validator(mode="after")
    def check_required_secrets(self) -> "Settings":
        if self.environment != "development":
            parsed = urlparse(str(self.frontend_origin))
            if parsed.scheme.lower() != "https":
                raise ValueError("FRONTEND_ORIGIN must use HTTPS outside development.")
            if self.development_origins:
                raise ValueError(
                    "DEVELOPMENT_ORIGINS must be empty outside development to avoid accidental exposure."
                )
            if not self.jwt_secret_key or self.jwt_secret_key == "dev-secret":
                raise ValueError(
                    "JWT_SECRET_KEY must be set to a strong secret value."
                )
            if not self.session_secret_key or self.session_secret_key == "dev-session-secret":
                raise ValueError("SESSION_SECRET_KEY must be set for secure cookies.")
            if not self.admin_password_hash:
                raise ValueError("ADMIN_PASSWORD_HASH must be set for the administrative user.")
        return self

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        class CorsAwareEnvSettingsSource(EnvSettingsSource):
            def prepare_field_value(self, field_name, field, field_value, value_is_complex):
                if (
                    field_name in DELIMITED_LIST_FIELDS
                    and isinstance(field_value, str)
                ):
                    parsed = _parse_delimited_list(field_value)
                    if parsed is not None:
                        return parsed
                return super().prepare_field_value(
                    field_name, field, field_value, value_is_complex
                )

        class CorsAwareDotEnvSettingsSource(DotEnvSettingsSource):
            def prepare_field_value(self, field_name, field, field_value, value_is_complex):
                if (
                    field_name in DELIMITED_LIST_FIELDS
                    and isinstance(field_value, str)
                ):
                    parsed = _parse_delimited_list(field_value)
                    if parsed is not None:
                        return parsed
                return super().prepare_field_value(
                    field_name, field, field_value, value_is_complex
                )

        return (
            init_settings,
            CorsAwareEnvSettingsSource(settings_cls),
            CorsAwareDotEnvSettingsSource(settings_cls),
            file_secret_settings,
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""

    return Settings()  # type: ignore[call-arg]
