"""Routes for interacting with blog content."""

from __future__ import annotations

import json
from datetime import datetime, time, timezone
from email.utils import format_datetime
from html import escape
from urllib.parse import urlparse
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import get_session
from ..models import BlogPost, BlogPostCreate, BlogPostRecord, BlogPostUpdate
from ..security import require_admin


def _normalise_datetime(value: datetime | None) -> datetime:
    """Ensure a timezone-aware datetime."""

    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _post_pubdate(post: BlogPost) -> datetime:
    """Return the best-guess publication datetime for a post."""

    if post.published_at:
        return datetime.combine(post.published_at, time.min, tzinfo=timezone.utc)
    return _normalise_datetime(post.created_at)


router = APIRouter(prefix="/blogs", tags=["blogs"])


@router.get("", response_model=list[BlogPost], summary="List all blog posts.")
async def list_blogs(session: AsyncSession = Depends(get_session)) -> list[BlogPost]:
    """Return all stored blog posts ordered by publish date."""

    result = await session.execute(
        select(BlogPostRecord).order_by(BlogPostRecord.published_at.desc())
    )
    records = result.scalars().all()
    return [BlogPost.from_record(record) for record in records]



@router.get(
    "/data.js",
    response_class=PlainTextResponse,
    summary="Return blog data as executable JavaScript for CSP-restricted environments.",
)
async def blogs_script(
    session: AsyncSession = Depends(get_session),
) -> PlainTextResponse:
    """Return all blog posts embedded in a script snippet."""

    posts = await list_blogs(session=session)
    payload = json.dumps(
        [post.model_dump(mode="json") for post in posts],
        separators=(",", ":"),
    )
    script = (
        "window.__PORTFOLIO_DATA__=window.__PORTFOLIO_DATA__||{};"
        f"window.__PORTFOLIO_DATA__.blogs={payload};"
    )
    return PlainTextResponse(script, media_type="application/javascript")


@router.get(
    "/rss.xml",
    response_class=Response,
    summary="Expose all blog posts via an RSS feed.",
)
async def blogs_rss(
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Return the blog feed as RSS 2.0 XML."""

    settings = get_settings()
    posts = await list_blogs(session=session)
    site_url = str(settings.frontend_origin).rstrip("/")
    parsed = urlparse(site_url)
    hostname = (parsed.hostname or "portfolio").removeprefix("www.")
    channel_title = f"{hostname} blog".title()

    last_build_date = format_datetime(datetime.now(timezone.utc))

    item_fragments: list[str] = []
    for post in posts:
        link = f"{site_url}/blog/{post.id}"
        pub_date = format_datetime(_post_pubdate(post))
        description = escape(post.excerpt or "")
        title = escape(post.title)
        item_fragments.append(
            "    <item>"
            f"<title>{title}</title>"
            f"<link>{link}</link>"
            f"<guid isPermaLink=\"true\">{link}</guid>"
            f"<pubDate>{pub_date}</pubDate>"
            f"<description>{description}</description>"
            "</item>"
        )

    items_block = "\n".join(item_fragments) if item_fragments else ""

    feed = "\n".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<rss version="2.0">',
            "  <channel>",
            f"    <title>{escape(channel_title)}</title>",
            f"    <link>{site_url}/blog</link>",
            f"    <description>{escape(f'Latest writing from {hostname}.')}</description>",
            "    <language>en-US</language>",
            f"    <lastBuildDate>{last_build_date}</lastBuildDate>",
            items_block,
            "  </channel>",
            "</rss>",
        ]
    ).replace("\n\n", "\n")

    return Response(content=feed, media_type="application/rss+xml; charset=utf-8")


@router.get(
    "/{blog_id}",
    response_model=BlogPost,
    summary="Retrieve a single blog post by its identifier.",
)
async def get_blog(
    blog_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> BlogPost:
    """Return a single blog post."""

    record = await session.get(BlogPostRecord, blog_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    return BlogPost.from_record(record)


@router.post(
    "",
    response_model=BlogPost,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new blog post.",
    dependencies=[Depends(require_admin)],
)
async def create_blog(
    payload: BlogPostCreate,
    session: AsyncSession = Depends(get_session),
) -> BlogPost:
    """Persist and return a newly created blog post."""

    record = BlogPostRecord(
        title=payload.title,
        excerpt=payload.excerpt,
        content=payload.content,
        category=payload.category,
        tags=payload.tags,
        published_at=payload.published_at,
        read_time=payload.read_time,
        image=payload.image,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return BlogPost.from_record(record)


@router.put(
    "/{blog_id}",
    response_model=BlogPost,
    summary="Update an existing blog post.",
    dependencies=[Depends(require_admin)],
)
async def update_blog(
    blog_id: UUID,
    payload: BlogPostUpdate,
    session: AsyncSession = Depends(get_session),
) -> BlogPost:
    """Apply updates to an existing blog post."""

    record = await session.get(BlogPostRecord, blog_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    data = payload.model_dump(exclude_unset=True)
    for field_name, value in data.items():
        setattr(record, field_name if field_name != "published_at" else "published_at", value)

    await session.commit()
    await session.refresh(record)
    return BlogPost.from_record(record)


@router.delete(
    "/{blog_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a blog post.",
    dependencies=[Depends(require_admin)],
)
async def delete_blog(
    blog_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete the specified blog post."""

    record = await session.get(BlogPostRecord, blog_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    await session.delete(record)
    await session.commit()



