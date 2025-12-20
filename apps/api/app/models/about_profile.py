"""About profile models and schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import ARRAY, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..db import BaseModel as ORMBase
from ..utils import (
    resolve_storage_url,
    sanitize_media_path,
    sanitize_plain_text,
    sanitize_rich_text,
    sanitize_url,
)


class DogProfile(BaseModel):
    """Public representation of the dog profile."""

    name: str
    role: str
    bio: str
    image: Optional[str] = None
    skills: List[str] = Field(default_factory=list)

    @field_validator("name", "role", mode="before")
    @classmethod
    def _sanitise_plain(cls, value: str) -> str:
        return sanitize_plain_text(value)

    @field_validator("bio", mode="before")
    @classmethod
    def _sanitise_bio(cls, value: str) -> str:
        return sanitize_rich_text(value)

    @field_validator("skills", mode="before")
    @classmethod
    def _sanitise_skills(cls, value: Optional[List[str]]) -> List[str]:
        if not value:
            return []
        return [sanitize_plain_text(str(skill)) for skill in value]

    @field_validator("image", mode="after")
    @classmethod
    def _resolve_image_url(cls, value: Optional[str]) -> Optional[str]:
        return resolve_storage_url(value)


class SocialLinks(BaseModel):
    """Public representation of social links."""

    github: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    hackerone: Optional[str] = None

    @field_validator("github", "linkedin", "twitter", "hackerone", mode="before")
    @classmethod
    def _sanitise_urls(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        return sanitize_url(value)


class AboutProfileRecord(ORMBase):
    """SQLAlchemy record for the about profile."""

    __tablename__ = "about_profiles"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    skills: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    social: Mapped[Dict[str, Optional[str]]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    dog: Mapped[Optional[Dict[str, object]]] = mapped_column(JSONB, nullable=True)
    profile_image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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


class AboutProfileBase(BaseModel):
    """Shared about profile fields."""

    name: str = Field(max_length=255)
    title: str = Field(max_length=255)
    bio: str
    email: str = Field(max_length=255)
    location: str = Field(max_length=255)
    skills: List[str] = Field(default_factory=list)
    social: SocialLinks = Field(default_factory=SocialLinks)
    dog: Optional[DogProfile] = None
    profile_image: Optional[str] = None

    @field_validator("name", "title", "email", "location", mode="before")
    @classmethod
    def _sanitise_plain(cls, value: str) -> str:
        return sanitize_plain_text(value)

    @field_validator("bio", mode="before")
    @classmethod
    def _sanitise_bio(cls, value: str) -> str:
        return sanitize_rich_text(value)

    @field_validator("skills", mode="before")
    @classmethod
    def _sanitise_skills(cls, value: Optional[List[str]]) -> List[str]:
        if not value:
            return []
        return [sanitize_plain_text(str(skill)) for skill in value]

    @field_validator("profile_image", mode="after")
    @classmethod
    def _resolve_profile_image_url(cls, value: Optional[str]) -> Optional[str]:
        return resolve_storage_url(value)


class AboutProfile(AboutProfileBase):
    """Public representation of the about profile."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_record(cls, record: AboutProfileRecord) -> "AboutProfile":
        """Convert ORM record into response schema."""

        return cls.model_validate(record)


class AboutProfileCreate(AboutProfileBase):
    """Payload for creating the about profile."""

    pass


class AboutProfileUpdate(BaseModel):
    """Payload for updating about profile."""

    name: Optional[str] = Field(default=None, max_length=255)
    title: Optional[str] = Field(default=None, max_length=255)
    bio: Optional[str] = None
    email: Optional[str] = Field(default=None, max_length=255)
    location: Optional[str] = Field(default=None, max_length=255)
    skills: Optional[List[str]] = None
    social: Optional[SocialLinks] = None
    dog: Optional[DogProfile] = None
    profile_image: Optional[str] = None

    @field_validator("name", "title", "email", "location", mode="before")
    @classmethod
    def _sanitise_optional_plain(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return sanitize_plain_text(value)

    @field_validator("bio", mode="before")
    @classmethod
    def _sanitise_optional_bio(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return sanitize_rich_text(value)

    @field_validator("skills", mode="before")
    @classmethod
    def _sanitise_optional_skills(
        cls, value: Optional[List[str]]
    ) -> Optional[List[str]]:
        if value is None:
            return None
        return [sanitize_plain_text(str(skill)) for skill in value]

    @field_validator("profile_image", mode="before")
    @classmethod
    def _sanitise_optional_profile_image(cls, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return None
        return sanitize_media_path(value)
