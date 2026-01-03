"""Comment routes for blog posts."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.comment import Comment, CommentCreate, CommentRecord
from ..models.blog_post import BlogPostRecord
from ..models.user import UserProfileRecord
from ..config import get_settings

router = APIRouter(prefix="/blogs", tags=["comments"])
settings = get_settings()


async def get_current_user(request: Request, session: AsyncSession = Depends(get_session)) -> UserProfileRecord:
    """Retrieve the current authenticated user from the session."""
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to post a comment.",
        )
    
    stmt = select(UserProfileRecord).where(UserProfileRecord.id == UUID(user_id))
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    return user


def is_admin(request: Request) -> bool:
    """Check if the current user is an admin."""
    user_email = request.session.get("user_email")
    return user_email == str(settings.admin_email)


@router.get("/{blog_id}/comments", response_model=List[Comment])
async def list_comments(
    blog_id: UUID, 
    session: AsyncSession = Depends(get_session)
) -> List[Comment]:
    """Return all top-level comments for a specific blog post with nested replies."""
    
    # Only fetch top-level comments (no parent); replies are loaded via relationship
    stmt = (
        select(CommentRecord)
        .where(CommentRecord.blog_post_id == blog_id)
        .where(CommentRecord.parent_id.is_(None))
        .order_by(CommentRecord.created_at.desc())
    )
    result = await session.execute(stmt)
    records = result.scalars().all()
    
    return [Comment.from_record(r) for r in records]


@router.post("/{blog_id}/comments", response_model=Comment, status_code=status.HTTP_201_CREATED)
async def create_comment(
    blog_id: UUID,
    payload: CommentCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: UserProfileRecord = Depends(get_current_user)
) -> Comment:
    """Create a new comment or reply on a blog post."""
    
    # Verify blog post exists
    stmt = select(BlogPostRecord).where(BlogPostRecord.id == blog_id)
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Blog post not found")

    # If replying, verify parent comment exists and belongs to same blog post
    if payload.parent_id:
        stmt = select(CommentRecord).where(
            CommentRecord.id == payload.parent_id,
            CommentRecord.blog_post_id == blog_id
        )
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Parent comment not found")

    new_comment = CommentRecord(
        blog_post_id=blog_id,
        user_id=current_user.id,
        parent_id=payload.parent_id,
        content=payload.content
    )
    
    session.add(new_comment)
    await session.commit()
    await session.refresh(new_comment)
    
    # Reload with user details for response
    stmt = select(CommentRecord).where(CommentRecord.id == new_comment.id)
    result = await session.execute(stmt)
    record = result.scalar_one()
    
    return Comment.from_record(record, include_replies=False)


@router.delete("/{blog_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    blog_id: UUID,
    comment_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: UserProfileRecord = Depends(get_current_user)
):
    """Soft-delete a comment. Users can delete their own comments; admins can delete any."""
    from datetime import datetime, timezone
    
    # Fetch the comment
    stmt = select(CommentRecord).where(
        CommentRecord.id == comment_id,
        CommentRecord.blog_post_id == blog_id
    )
    result = await session.execute(stmt)
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Already deleted?
    if comment.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check permissions: owner or admin
    if comment.user_id != current_user.id and not is_admin(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments."
        )
    
    # Soft delete: set deleted_at timestamp
    comment.deleted_at = datetime.now(timezone.utc)
    await session.commit()
