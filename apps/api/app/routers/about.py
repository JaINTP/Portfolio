"""Routes for interacting with the about profile."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import (
    AboutProfile,
    AboutProfileCreate,
    AboutProfileRecord,
    AboutProfileUpdate,
)
from ..security import require_admin

router = APIRouter(prefix="/about", tags=["about"])


async def _get_single_profile(session: AsyncSession) -> AboutProfileRecord | None:
    """Fetch the current about profile if one exists."""

    result = await session.execute(select(AboutProfileRecord).limit(1))
    return result.scalars().first()


@router.get("", response_model=AboutProfile, summary="Get the about profile.")
async def get_about_profile(
    session: AsyncSession = Depends(get_session),
) -> AboutProfile:
    """Return the stored about profile."""

    record = await _get_single_profile(session)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="About profile not configured."
        )
    return AboutProfile.from_record(record)


@router.post(
    "",
    response_model=AboutProfile,
    status_code=status.HTTP_201_CREATED,
    summary="Create the about profile.",
    dependencies=[Depends(require_admin)],
)
async def create_about_profile(
    payload: AboutProfileCreate,
    session: AsyncSession = Depends(get_session),
) -> AboutProfile:
    """Create the about profile (only allowed when one does not exist)."""

    existing = await _get_single_profile(session)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An about profile already exists.",
        )

    record = AboutProfileRecord(
        name=payload.name,
        title=payload.title,
        bio=payload.bio,
        email=payload.email,
        location=payload.location,
        skills=payload.skills,
        social=payload.social.model_dump(),
        dog=payload.dog.model_dump() if payload.dog else None,
        profile_image=payload.profile_image,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return AboutProfile.from_record(record)


@router.put(
    "/{profile_id}",
    response_model=AboutProfile,
    summary="Update the about profile.",
    dependencies=[Depends(require_admin)],
)
async def update_about_profile(
    profile_id: UUID,
    payload: AboutProfileUpdate,
    session: AsyncSession = Depends(get_session),
) -> AboutProfile:
    """Update the stored about profile."""

    record = await session.get(AboutProfileRecord, profile_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="About profile not found."
        )

    data = payload.model_dump(exclude_unset=True)
    if "social" in data and data["social"] is not None:
        social = data["social"]
        if hasattr(social, "model_dump"):
            data["social"] = social.model_dump()
        else:
            data["social"] = dict(social)
    if "dog" in data and data["dog"] is not None:
        dog = data["dog"]
        if hasattr(dog, "model_dump"):
            data["dog"] = dog.model_dump()
        else:
            data["dog"] = dict(dog)

    for field_name, value in data.items():
        setattr(record, field_name, value)

    await session.commit()
    await session.refresh(record)
    return AboutProfile.from_record(record)


@router.delete(
    "/{profile_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete the about profile.",
    dependencies=[Depends(require_admin)],
)
async def delete_about_profile(
    profile_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete the stored about profile."""

    record = await session.get(AboutProfileRecord, profile_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="About profile not found."
        )

    await session.delete(record)
    await session.commit()
