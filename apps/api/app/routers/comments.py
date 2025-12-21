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

router = APIRouter(prefix="/blogs", tags=["comments"])


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


@router.get("/{blog_id}/comments", response_model=List[Comment])
async def list_comments(
    blog_id: UUID, 
    session: AsyncSession = Depends(get_session)
) -> List[Comment]:
    """Return all comments for a specific blog post."""
    
    stmt = select(CommentRecord).where(CommentRecord.blog_post_id == blog_id).order_by(CommentRecord.created_at.desc())
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
    """Create a new comment on a blog post."""
    
    # Verify blog post exists
    stmt = select(BlogPostRecord).where(BlogPostRecord.id == blog_id)
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Blog post not found")

    new_comment = CommentRecord(
        blog_post_id=blog_id,
        user_id=current_user.id,
        content=payload.content
    )
    
    session.add(new_comment)
    await session.commit()
    await session.refresh(new_comment)
    
    # Reload with user details for response
    stmt = select(CommentRecord).where(CommentRecord.id == new_comment.id)
    result = await session.execute(stmt)
    record = result.scalar_one()
    
    return Comment.from_record(record)
