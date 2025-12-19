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

ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB


class UploadResponse(BaseModel):
    """Response payload for uploaded media."""

    url: str
    kind: Literal["image"] = "image"


router = APIRouter(prefix="/uploads", tags=["uploads"])


def _ensure_within_directory(base: Path, target: Path) -> None:
    """Ensure target is inside the base directory."""

    if base not in target.resolve().parents and target.resolve() != base.resolve():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid upload path.",
        )


async def _store_image(file: UploadFile, *, subdir: str | None, prefix: str) -> str:
    """Persist an uploaded image under the configured uploads directory."""

    settings = get_settings()
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image type. Use JPEG, PNG, WEBP, or GIF.",
        )

    extension = ALLOWED_CONTENT_TYPES[content_type]
    filename = f"{prefix}_{uuid4().hex}{extension}"

    base_dir = settings.uploads_dir
    target_dir = base_dir
    relative_dir = "uploads"
    if subdir:
        safe_subdir = Path(subdir.strip("/"))
        target_dir = base_dir / safe_subdir
        relative_dir = f"uploads/{safe_subdir.as_posix()}"

    target_dir.mkdir(parents=True, exist_ok=True)

    destination = target_dir / filename
    _ensure_within_directory(base_dir, destination)

    size = 0
    with destination.open("wb") as buffer:
        while True:
            chunk = await file.read(1 << 20)  # 1 MB
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_UPLOAD_SIZE:
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Image exceeds 5 MB limit.",
                )
            buffer.write(chunk)

    relative_url = sanitize_media_path(f"/{relative_dir}/{filename}")
    return relative_url


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

    url = await _store_image(file, subdir=None, prefix="profile")
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

    url = await _store_image(file, subdir="blogs", prefix="blog")
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
