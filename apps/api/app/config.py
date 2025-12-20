"""Runtime configuration loaded via environment variables."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Literal
 
from urllib.parse import urlparse
 
from pydantic import AliasChoices, AnyHttpUrl, EmailStr, Field, field_validator, model_validator, ValidationInfo
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
    
    # Storage Configuration
    storage_type: Literal["local", "s3"] = Field(
        default="local",
        description="Backend storage type for uploads. Use 's3' for cloud storage.",
    )
    s3_bucket: str = Field(default="")
    s3_region: str = Field(default="auto")
    s3_access_key_id: str = Field(default="")
    s3_secret_access_key: str = Field(default="")
    s3_endpoint_url: str | None = Field(
        default=None, 
        alias="S3_ENDPOINT_URL",
        description="Required for R2 (e.g. https://<id>.r2.cloudflarestorage.com)"
    )
    s3_custom_domain: str | None = Field(default=None)

    api_rate_limit: str = Field(default="120/minute")
    api_rate_limit_burst: int = Field(default=240, ge=1)
    login_rate_limit: str = Field(default="10/minute")

    @field_validator("database_url", mode="before")
    @classmethod
    def ensure_asyncpg_protocol(cls, value: str | None) -> str:
        if not value:
            return DEFAULT_DATABASE_URL

        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

        # Check if the URL is a PostgreSQL variant
        if not any(value.startswith(p) for p in ("postgres://", "postgresql://", "postgresql+asyncpg://")):
            return value

        parsed = urlparse(value)
        
        # 1. Standardize protocol to postgresql+asyncpg
        scheme = "postgresql+asyncpg"
        
        # 2. Extract and sanitize query parameters
        query_params = parse_qs(parsed.query)
        
        # Convert sslmode -> ssl if ssl isn't already set
        if "sslmode" in query_params:
            ssl_val = query_params.pop("sslmode")[0]
            if "ssl" not in query_params:
                query_params["ssl"] = [ssl_val]

        # 3. Strip known incompatible psycopg2 parameters
        unsupported = {"channel_binding", "target_session_attrs", "gssencmode", "sslmode"}
        for param in unsupported:
            query_params.pop(param, None)

        # 4. Reconstruct the URL
        new_query = urlencode(query_params, doseq=True)
        new_parts = parsed._replace(scheme=scheme, query=new_query)
        return urlunparse(new_parts)

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

    @field_validator("s3_custom_domain", mode="before")
    @classmethod
    def ensure_s3_custom_domain_protocol(cls, value: str | None) -> str | None:
        """Ensure the custom domain has a protocol prefix to prevent frontend misinterpretation."""
        if not value:
            return value
        stripped = value.strip().rstrip("/")
        if not stripped:
            return None
        if not stripped.startswith(("http://", "https://")):
            return f"https://{stripped}"
        return stripped

    @field_validator("trusted_hosts", "trusted_proxies")
    @classmethod
    def ensure_non_empty(cls, value: list[str], info: ValidationInfo) -> list[str]:
        # Allow empty trusted_hosts if we are in development or if it's explicitly managed
        if info.field_name == "trusted_proxies" and not value:
            raise ValueError("Trusted proxy lists must not be empty.")
        
        # We allow empty trusted_hosts here because we might populate it 
        # based on environment (e.g. Vercel) in the model_validator.
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
    def adjust_for_vercel(self) -> "Settings":
        """Automatically trust Vercel domains if running in that environment."""
        if os.getenv("VERCEL") == "1":
            # Add *.vercel.app to trusted hosts if not already there or if wildcard not present
            if "*" not in self.trusted_hosts and "*.vercel.app" not in self.trusted_hosts:
                self.trusted_hosts.append("*.vercel.app")
            
            # Vercel deployments often need to trust all proxies for X-Forwarded-For
            if "*" not in self.trusted_proxies:
                self.trusted_proxies.append("*")
        
        return self

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
        
        # S3 validation is required even in development if STORAGE_TYPE=s3
        if self.storage_type == "s3":
            if not all([self.s3_bucket, self.s3_access_key_id, self.s3_secret_access_key]):
                raise ValueError(
                    "S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY must be set when STORAGE_TYPE=s3"
                )
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
