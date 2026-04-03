"""Centralised SlowAPI limiter instance."""

from __future__ import annotations

from functools import lru_cache

from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import get_settings


@lru_cache(maxsize=1)
def get_limiter() -> Limiter:
    """Return a singleton limiter configured from settings."""

    settings = get_settings()
    return Limiter(
        key_func=get_remote_address,
        default_limits=[settings.api_rate_limit],
        headers_enabled=True,
    )
