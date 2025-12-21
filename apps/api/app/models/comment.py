"""Comment models and schemas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import BaseModel as ORMBase
from ..utils import sanitize_plain_text


class CommentRecord(ORMBase):
    """SQLAlchemy representation of a blog post comment."""

    __tablename__ = "comments"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    blog_post_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("blog_posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
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

    # Relationships
    user: Mapped["UserProfileRecord"] = relationship(lazy="joined")


class CommentBase(BaseModel):
    """Shared fields for comment operations."""

    content: str

    @field_validator("content", mode="before")
    @classmethod
    def _sanitize_content(cls, value: str) -> str:
        return sanitize_plain_text(value)


class CommentCreate(CommentBase):
    """Payload for creating a comment."""
    pass


class Comment(CommentBase):
    """Public representation of a comment."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    blog_post_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Nested user info for display
    user_name: str
    user_avatar: Optional[str] = None

    @classmethod
    def from_record(cls, record: CommentRecord) -> "Comment":
        """Convert ORM record into response schema."""
        data = {
            "id": record.id,
            "blog_post_id": record.blog_post_id,
            "user_id": record.user_id,
            "content": record.content,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "user_name": record.user.name,
            "user_avatar": record.user.avatar_url,
        }
        return cls.model_validate(data)
