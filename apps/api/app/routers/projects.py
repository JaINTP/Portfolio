"""Routes for interacting with project content."""

from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Project, ProjectCreate, ProjectRecord, ProjectUpdate
from ..security import require_admin
from ..services.cache import CacheService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[Project], summary="List all projects.")
async def list_projects() -> list[Project]:
    """Return all stored projects."""

    return CacheService.get_instance().projects



@router.get(
    "/data.js",
    response_class=PlainTextResponse,
    summary="Return project data as executable JavaScript for CSP-restricted environments.",
)
async def projects_script(
    session: AsyncSession = Depends(get_session),
) -> PlainTextResponse:
    """Return all stored projects embedded in a script snippet."""

    projects = await list_projects()
    payload = json.dumps(
        [project.model_dump(mode="json") for project in projects],
        separators=(",", ":"),
    )
    script = (
        "window.__PORTFOLIO_DATA__=window.__PORTFOLIO_DATA__||{};"
        f"window.__PORTFOLIO_DATA__.projects={payload};"
    )
    return PlainTextResponse(script, media_type="application/javascript")


@router.get(
    "/{project_id}",
    response_model=Project,
    summary="Retrieve a single project.",
)
async def get_project(
    project_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> Project:
    """Return a single project entry."""

    record = await session.get(ProjectRecord, project_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found."
        )
    return Project.from_record(record)


@router.post(
    "",
    response_model=Project,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project entry.",
    dependencies=[Depends(require_admin)],
)
async def create_project(
    payload: ProjectCreate,
    session: AsyncSession = Depends(get_session),
) -> Project:
    """Persist and return a new project."""

    record = ProjectRecord(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        tags=payload.tags,
        image=payload.image,
        date_label=payload.date_label,
        github=payload.github,
        demo=payload.demo,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    await CacheService.get_instance().refresh()
    return Project.from_record(record)


@router.put(
    "/{project_id}",
    response_model=Project,
    summary="Update an existing project.",
    dependencies=[Depends(require_admin)],
)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
) -> Project:
    """Apply updates to an existing project."""

    record = await session.get(ProjectRecord, project_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found."
        )

    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field_name, value)

    await session.commit()
    await session.refresh(record)
    await CacheService.get_instance().refresh()
    return Project.from_record(record)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project entry.",
    dependencies=[Depends(require_admin)],
)
async def delete_project(
    project_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete the specified project."""

    record = await session.get(ProjectRecord, project_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found."
        )

    await session.delete(record)
    await session.commit()
    await CacheService.get_instance().refresh()



