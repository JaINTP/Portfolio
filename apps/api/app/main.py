"""Application factory for the Portfolio API."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse, JSONResponse, FileResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from .config import get_settings
from .db import close_database, init_database
from .routers import api_router
from .rate_limiter import get_limiter

logger = logging.getLogger(__name__)

SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'none'; "
        "frame-ancestors 'none'; "
        "base-uri 'none'; "
        "form-action 'self'; "
        "connect-src 'self'; "
        "img-src 'self' data: https:; "
        "script-src 'none'; "
        "style-src 'none';"
    ),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": (
        "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), "
        "camera=(), clipboard-read=(), clipboard-write=*, display-capture=(), "
        "fullscreen=*, geolocation=(), gyroscope=(), hid=(), microphone=(), "
        "midi=(), payment=(), usb=()"
    ),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "X-Permitted-Cross-Domain-Policies": "none",
}


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a consistent 429 response when limits are exceeded."""

    retry_after = exc.detail.get("retry_after") if isinstance(exc.detail, dict) else None
    headers = {"Retry-After": str(retry_after)} if retry_after else {}
    return JSONResponse(
        status_code=429,
        headers=headers,
        content={"detail": "Too many requests, please slow down."},
    )

def _redact_dsn(dsn: str) -> str:
    """Redact credentials from a SQLAlchemy DSN before logging."""

    if "@" not in dsn:
        return dsn
    scheme, rest = dsn.split("://", 1)
    if "@" not in rest:
        return f"{scheme}://***"
    credentials, host = rest.split("@", 1)
    if ":" in credentials:
        user = credentials.split(":", 1)[0]
        masked = f"{user}:***"
    else:
        masked = "***"
    return f"{scheme}://{masked}@{host}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown events."""
    settings = get_settings()
    
    # Startup
    await init_database()
    logger.info(
        "Portfolio API ready - connected to %s", _redact_dsn(settings.database_url)
    )
    
    yield
    
    # Shutdown
    await close_database()
    logger.info("Portfolio API shutdown complete")



def create_app() -> FastAPI:
    """Instantiate and configure the FastAPI application."""

    settings = get_settings()

    docs_url = "/docs" if settings.environment == "development" else None
    redoc_url = "/redoc" if settings.environment == "development" else None
    openapi_url = "/openapi.json" if settings.environment == "development" else None

    app = FastAPI(
        title="Portfolio API",
        version="1.0.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )
    app.include_router(api_router)

    limiter = get_limiter()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=512)

    if settings.trusted_proxies:
        app.add_middleware(
            ProxyHeadersMiddleware,
            trusted_hosts=list(settings.trusted_proxies),
        )

    if settings.trusted_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=list(settings.trusted_hosts),
        )

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret_key,
        session_cookie=settings.session_cookie_name,
        max_age=settings.session_cookie_max_age_seconds,
        same_site=settings.session_cookie_samesite,
        https_only=settings.session_cookie_secure,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Content-Type"],
        expose_headers=["Retry-After"],
        max_age=600,
    )

    security_headers = dict(SECURITY_HEADERS)
    if settings.enable_hsts:
        security_headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )

    @app.middleware("http")
    async def set_security_headers(request: Request, call_next):
        response: Response = await call_next(request)
        for header, value in security_headers.items():
            response.headers.setdefault(header, value)
        response.headers.setdefault("Cache-Control", "no-store")
        response.headers.setdefault("Pragma", "no-cache")
        request_id = request.headers.get("X-Request-Id")
        if request_id:
            response.headers.setdefault("X-Request-Id", request_id)
        return response



    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        favicon_path = os.path.join(os.path.dirname(__file__), "static", "favicon.ico")
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path)
        return Response(status_code=404)

    return app
