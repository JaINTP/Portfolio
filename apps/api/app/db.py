"""Database helpers for interacting with PostgreSQL."""

from __future__ import annotations

import logging
from typing import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings


class BaseModel(DeclarativeBase):
    """Declarative base for ORM models."""


logger = logging.getLogger(__name__)

settings = get_settings()
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_recycle=1800,
)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Dependency that provides a session per-request."""

    async with SessionFactory() as session:
        yield session


async def init_database() -> None:
    """Verify that the database connection is healthy."""

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - defensive startup guard
        logger.exception("Database connectivity check failed")
        raise


async def close_database() -> None:
    """Dispose of the connection pool."""

    await engine.dispose()
