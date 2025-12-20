"""Project models and schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import ARRAY, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db import BaseModel as ORMBase
from ..utils import (
    resolve_storage_url,
    sanitize_media_path,
    sanitize_plain_text,
    sanitize_rich_text,
    sanitize_url,
)


class ProjectRecord(ORMBase):
    """SQLAlchemy representation of a project entry."""

    __tablename__ = "projects"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_label: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    github: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    demo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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


class ProjectBase(BaseModel):
    """Shared project fields with sanitisation rules."""

    title: str = Field(max_length=255)
    description: str
    category: str = Field(max_length=64)
    tags: List[str] = Field(default_factory=list)
    image: Optional[str] = None
    date_label: Optional[str] = Field(default=None, max_length=32)
    github: Optional[str] = None
    demo: Optional[str] = None

    @field_validator("title", "category", "date_label", mode="before")
    @classmethod
    def _sanitise_plain(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return sanitize_plain_text(value)

    @field_validator("tags", mode="before")
    @classmethod
    def _sanitise_tags(cls, value: Optional[List[str]]) -> List[str]:
        if not value:
            return []
        return [sanitize_plain_text(str(tag)) for tag in value]

    @field_validator("image", mode="after")
    @classmethod
    def _resolve_image_url(cls, value: Optional[str]) -> Optional[str]:
        return resolve_storage_url(value)

    @field_validator("github", "demo", mode="before")
    @classmethod
    def _sanitise_urls(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        return sanitize_url(value)

    @field_validator("description", mode="before")
    @classmethod
    def _sanitise_description(cls, value: str) -> str:
        return sanitize_rich_text(value)


class Project(ProjectBase):
    """Public representation of a project."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, record: ProjectRecord) -> "Project":
        """Convert ORM record into response schema."""

        return cls.model_validate(record)


class ProjectCreate(ProjectBase):
    """Payload for creating projects."""

    pass


class ProjectUpdate(BaseModel):
    """Payload for updating projects."""

    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, max_length=64)
    tags: Optional[List[str]] = None
    image: Optional[str] = None
    date_label: Optional[str] = Field(default=None, max_length=32)
    github: Optional[str] = None
    demo: Optional[str] = None

    @field_validator("title", "category", "date_label", mode="before")
    @classmethod
    def _sanitise_optional_plain(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return sanitize_plain_text(value)

    @field_validator("description", mode="before")
    @classmethod
    def _sanitise_optional_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return sanitize_rich_text(value)

    @field_validator("tags", mode="before")
    @classmethod
    def _sanitise_optional_tags(
        cls, value: Optional[List[str]]
    ) -> Optional[List[str]]:
        if value is None:
            return None
        return [sanitize_plain_text(str(tag)) for tag in value]

    @field_validator("image", mode="before")
    @classmethod
    def _sanitise_optional_image(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        return sanitize_media_path(value)

    @field_validator("github", "demo", mode="before")
    @classmethod
    def _sanitise_optional_urls(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        return sanitize_url(value)
