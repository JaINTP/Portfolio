"""In-memory caching service for high-traffic data."""

from __future__ import annotations

import asyncio
import logging
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import SessionFactory
from ..models import BlogPost, BlogPostRecord, Project, ProjectRecord

logger = logging.getLogger(__name__)


class CacheService:
    """Singleton service to manage in-memory caching of blogs and projects."""

    _instance: CacheService | None = None
    _lock: asyncio.Lock

    def __init__(self):
        """Initialize empty cache state."""
        self._blogs: List[BlogPost] = []
        self._projects: List[Project] = []
        self._lock = asyncio.Lock()

    @classmethod
    def get_instance(cls) -> CacheService:
        """Return the singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def blogs(self) -> List[BlogPost]:
        """Return a copy of the cached blog posts."""
        return list(self._blogs)

    @property
    def projects(self) -> List[Project]:
        """Return a copy of the cached projects."""
        return list(self._projects)

    async def refresh(self) -> None:
        """Fetch fresh data from the database and update the cache."""
        async with self._lock:
            try:
                async with SessionFactory() as session:
                    await self._refresh_blogs(session)
                    await self._refresh_projects(session)
                logger.info("Cache refreshed successfully")
            except Exception:
                logger.exception("Failed to refresh cache")
                raise

    async def _refresh_blogs(self, session: AsyncSession) -> None:
        """Load all blog posts ordered by publication date."""
        result = await session.execute(
            select(BlogPostRecord).order_by(BlogPostRecord.published_at.desc())
        )
        records = result.scalars().all()
        self._blogs = [BlogPost.from_record(record) for record in records]

    async def _refresh_projects(self, session: AsyncSession) -> None:
        """Load all projects ordered by creation date."""
        result = await session.execute(
            select(ProjectRecord).order_by(ProjectRecord.created_at.desc())
        )
        records = result.scalars().all()
        self._projects = [Project.from_record(record) for record in records]
