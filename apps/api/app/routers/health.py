"""Health and root endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/", summary="API root message.")
async def read_root() -> dict[str, str]:
    """Return a friendly message confirming the API is online."""

    return {"message": "Portfolio API is running."}


@router.get("/healthz", summary="Health probe endpoint.")
async def health_check() -> dict[str, str]:
    """Return a simple health response."""

    return {"status": "ok"}
