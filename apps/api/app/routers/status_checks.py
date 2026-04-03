"""Routes for interacting with status checks."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import StatusCheck, StatusCheckCreate, StatusCheckRecord

router = APIRouter(prefix="/status")


@router.post(
    "",
    response_model=StatusCheck,
    summary="Create a status check entry for a client.",
)
async def create_status_check(
    payload: StatusCheckCreate,
    session: AsyncSession = Depends(get_session),
) -> StatusCheck:
    """Persist and return a status check entry."""

    status_record = StatusCheckRecord(
        client_name=payload.client_name,
    )
    session.add(status_record)
    await session.commit()
    await session.refresh(status_record)
    return StatusCheck.from_record(status_record)


@router.get(
    "",
    response_model=list[StatusCheck],
    summary="Retrieve all stored status check entries.",
)
async def list_status_checks(
    session: AsyncSession = Depends(get_session),
) -> list[StatusCheck]:
    """Return all stored status check entries."""

    result = await session.execute(
        select(StatusCheckRecord).order_by(StatusCheckRecord.timestamp.desc())
    )
    records = result.scalars().all()
    return [StatusCheck.from_record(record) for record in records]
