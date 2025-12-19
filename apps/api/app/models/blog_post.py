"""Blog post models and schemas."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import ARRAY, Date, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db import BaseModel as ORMBase
from ..utils import sanitize_media_path, sanitize_plain_text, sanitize_rich_text, sanitize_url


class BlogPostRecord(ORMBase):
    """SQLAlchemy representation of a blog post."""

    __tablename__ = "blog_posts"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    published_at: Mapped[date] = mapped_column(Date, nullable=False)
    read_time: Mapped[str] = mapped_column(String(32), nullable=False)
    image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class BlogPostBase(BaseModel):
    """Shared fields for blog operations with sanitisation."""

    title: str = Field(max_length=255)
    excerpt: str
    content: str
    category: str = Field(max_length=64)
    tags: List[str] = Field(default_factory=list)
    published_at: date
    read_time: str = Field(max_length=32)
    image: Optional[str] = None

    @field_validator("title", "excerpt", "category", "read_time", mode="before")
    @classmethod
    def _sanitise_plain(cls, value: str) -> str:
        return sanitize_plain_text(value)

    @field_validator("content", mode="before")
    @classmethod
    def _sanitise_content(cls, value: str) -> str:
        return sanitize_rich_text(value)

    @field_validator("tags", mode="before")
    @classmethod
    def _sanitise_tags(cls, value: Optional[List[str]]) -> List[str]:
        if not value:
            return []
        return [sanitize_plain_text(str(tag)) for tag in value]

    @field_validator("image", mode="before")
    @classmethod
    def _sanitise_image(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        return sanitize_media_path(value)

    @field_validator("published_at", mode="before")
    @classmethod
    def _parse_date(cls, value: date | str) -> date:
        if isinstance(value, date):
            return value
        return date.fromisoformat(str(value))


class BlogPost(BlogPostBase):
    """Public representation of a blog post."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, record: BlogPostRecord) -> "BlogPost":
        """Convert ORM record into response schema."""

        return cls.model_validate(record)


class BlogPostCreate(BlogPostBase):
    """Payload for creating blog posts."""

    pass


class BlogPostUpdate(BaseModel):
    """Payload for updating blog posts."""

    title: Optional[str] = Field(default=None, max_length=255)
    excerpt: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = Field(default=None, max_length=64)
    tags: Optional[List[str]] = None
    published_at: Optional[date | str] = None
    read_time: Optional[str] = Field(default=None, max_length=32)
    image: Optional[str] = None

    @field_validator("title", "excerpt", "category", "read_time", mode="before")
    @classmethod
    def _sanitise_optional_plain(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return sanitize_plain_text(value)

    @field_validator("content", mode="before")
    @classmethod
    def _sanitise_optional_content(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return sanitize_rich_text(value)

    @field_validator("tags", mode="before")
    @classmethod
    def _sanitise_optional_tags(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return None
        return [sanitize_plain_text(str(tag)) for tag in value]

    @field_validator("image", mode="before")
    @classmethod
    def _sanitise_optional_image(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        return sanitize_media_path(value)

    @field_validator("published_at", mode="before")
    @classmethod
    def _parse_optional_date(cls, value: Optional[date | str]) -> Optional[date]:
        if value is None:
            return None
        if isinstance(value, date):
            return value
        return date.fromisoformat(str(value))
