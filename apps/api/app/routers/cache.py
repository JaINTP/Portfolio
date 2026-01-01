"""Routes for managing the application cache."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from ..security import require_admin
from ..services.cache import CacheService

router = APIRouter(prefix="/cache", tags=["cache"])


@router.post(
    "/refresh",
    summary="Manually trigger a cache refresh.",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_admin)],
)
async def refresh_cache() -> JSONResponse:
    """Force a reload of all cached data from the database."""
    await CacheService.get_instance().refresh()
    return JSONResponse({"status": "refreshed", "message": "Cache updated successfully."})
