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
    parent_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=True,
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
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    # Relationships
    user: Mapped["UserProfileRecord"] = relationship(lazy="joined")
    replies: Mapped[list["CommentRecord"]] = relationship(
        back_populates="parent",
        lazy="selectin",
        order_by="CommentRecord.created_at",
    )
    parent: Mapped[Optional["CommentRecord"]] = relationship(
        back_populates="replies",
        remote_side=[id],
    )


class CommentBase(BaseModel):
    """Shared fields for comment operations."""

    content: str

    @field_validator("content", mode="before")
    @classmethod
    def _sanitize_content(cls, value: str) -> str:
        return sanitize_plain_text(value)


class CommentCreate(CommentBase):
    """Payload for creating a comment."""
    parent_id: Optional[UUID] = None


class Comment(CommentBase):
    """Public representation of a comment."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    blog_post_id: UUID
    user_id: UUID
    parent_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool = False
    
    # Nested user info for display
    user_name: str
    user_avatar: Optional[str] = None
    
    # Nested replies (populated for top-level comments)
    replies: list["Comment"] = []

    @classmethod
    def from_record(cls, record: CommentRecord, include_replies: bool = True) -> "Comment":
        """Convert ORM record into response schema."""
        is_deleted = record.deleted_at is not None
        
        # For deleted comments, show placeholder content but keep structure for replies
        data = {
            "id": record.id,
            "blog_post_id": record.blog_post_id,
            "user_id": record.user_id,
            "parent_id": record.parent_id,
            "content": "[This comment has been deleted]" if is_deleted else record.content,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "is_deleted": is_deleted,
            "user_name": "[deleted]" if is_deleted else record.user.name,
            "user_avatar": None if is_deleted else record.user.avatar_url,
            "replies": [cls.from_record(r, include_replies=True) for r in record.replies] if include_replies else [],
        }
        return cls.model_validate(data)

