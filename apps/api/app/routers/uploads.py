"""Routes for handling media uploads."""

from __future__ import annotations

from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from ..config import get_settings
from ..security import require_admin
from ..utils import sanitize_media_path
from ..utils.storage import get_storage_provider

ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MAX_UPLOAD_SIZE = 4 * 1024 * 1024  # 4 MB (Vercel has 4.5MB limit)


class UploadResponse(BaseModel):
    """Response payload for uploaded media."""

    url: str
    kind: Literal["image"] = "image"


router = APIRouter(prefix="/uploads", tags=["uploads"])


async def _store_image(file: UploadFile, *, subdir: str | None, prefix: str) -> str:
    """Persist an uploaded image using the configured storage provider."""

    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type. Use JPEG, PNG, WEBP, or GIF.",
        )

    # Check file size before uploading
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds 5 MB limit.",
        )
    
    # Reset file pointer if necessary (though we already read everything into 'content')
    import io
    file_obj = io.BytesIO(content)

    extension = ALLOWED_CONTENT_TYPES[content_type]
    filename = f"{prefix}_{uuid4().hex}{extension}"

    storage = get_storage_provider()
    url = await storage.upload(file_obj, filename, subdir=subdir, content_type=content_type)

    return url


@router.post(
    "/profile-image",
    response_model=UploadResponse,
    summary="Upload an image for use in the profile.",
    dependencies=[Depends(require_admin)],
)
async def upload_profile_image(
    file: UploadFile = File(...),
) -> UploadResponse:
    """Store profile image in the shared uploads directory and return its public URL."""

    url = await _store_image(file, subdir="profile", prefix="profile")
    return UploadResponse(url=url)


@router.post(
    "/about/image",
    response_model=UploadResponse,
    summary="Upload an image for the About page.",
    dependencies=[Depends(require_admin)],
)
async def upload_about_image(
    file: UploadFile = File(...),
) -> UploadResponse:
    """Store about imagery under a dedicated directory."""

    url = await _store_image(file, subdir="about", prefix="about")
    return UploadResponse(url=url)


@router.post(
    "/blogs/cover-image",
    response_model=UploadResponse,
    summary="Upload an image for a blog post.",
    dependencies=[Depends(require_admin)],
)
async def upload_blog_image(
    file: UploadFile = File(...),
) -> UploadResponse:
    """Store blog imagery under a dedicated directory."""

    url = await _store_image(file, subdir="blog", prefix="blog")
    return UploadResponse(url=url)


@router.post(
    "/projects/cover-image",
    response_model=UploadResponse,
    summary="Upload an image for a project showcase.",
    dependencies=[Depends(require_admin)],
)
async def upload_project_image(
    file: UploadFile = File(...),
) -> UploadResponse:
    """Store project imagery under a dedicated directory."""

    url = await _store_image(file, subdir="projects", prefix="project")
    return UploadResponse(url=url)
