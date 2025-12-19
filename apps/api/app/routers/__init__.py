"""API route registrations."""

from fastapi import APIRouter

from .about import router as about_router
from .auth import router as auth_router
from .blogs import router as blogs_router
from .health import router as health_router
from .projects import router as projects_router
from .status_checks import router as status_checks_router
from .uploads import router as uploads_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(status_checks_router)
api_router.include_router(auth_router)
api_router.include_router(blogs_router)
api_router.include_router(projects_router)
api_router.include_router(about_router)
api_router.include_router(uploads_router)

__all__ = ["api_router"]
