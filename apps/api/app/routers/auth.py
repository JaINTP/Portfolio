"""Authentication routes for administrative actions."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator

from ..config import get_settings
from ..rate_limiter import get_limiter
from ..security import create_access_token, decode_token, verify_password
from ..utils import sanitize_plain_text

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = get_limiter()
LOGIN_RATE_LIMIT = get_settings().login_rate_limit


class AuthRequest(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=255)

    @field_validator("email", mode="before")
    @classmethod
    def _sanitize_email(cls, value: str) -> str:
        return sanitize_plain_text(value).lower()

    @field_validator("password", mode="before")
    @classmethod
    def _sanitize_password(cls, value: str) -> str:
        return sanitize_plain_text(value)
_MISSING_PAYLOAD_ERROR = [
    {
        "type": "missing",
        "loc": ["body", "email"],
        "msg": "Field required",
        "input": None,
    }
]


class SessionStatus(BaseModel):
    """Response model indicating whether the admin session is active."""

    authenticated: bool
    username: str | None = None
    is_admin: bool | None = None


async def parse_auth_payload(request: Request) -> AuthRequest:
    """Accept JSON, form, or multipart data for the login endpoint."""

    content_type = request.headers.get("content-type", "").lower()
    data: dict[str, Any] | None = None

    try:
        if "application/json" in content_type:
            parsed = await request.json()
            if isinstance(parsed, dict):
                data = parsed
        elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            data = {key: form.get(key) for key in ("email", "password", "username") if form.get(key) is not None}
        else:
            parsed = await request.json()
            if isinstance(parsed, dict):
                data = parsed
    except Exception:
        data = None

    if data and "email" not in data and "username" in data:
        data["email"] = data.pop("username")

    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=_MISSING_PAYLOAD_ERROR,
        )

    try:
        return AuthRequest.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc


@router.post(
    "/login",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Authenticate as admin.",
)
@limiter.limit(LOGIN_RATE_LIMIT)
async def login(
    response: Response,
    request: Request,
    payload: AuthRequest = Depends(parse_auth_payload),
) -> Response:
    """Authenticate the administrative user and issue a JWT."""

    settings = get_settings()
    expected_email = settings.admin_email.lower()
    if payload.email.lower() != expected_email or not verify_password(
        payload.password, settings.admin_password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials."
        )

    token = create_access_token(settings.admin_email)
    request.session.clear()
    request.session["admin_email"] = settings.admin_email
    request.session["jwt"] = token
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get(
    "/session",
    response_model=SessionStatus,
    summary="Check whether the admin session is active.",
)
async def session_status(request: Request) -> SessionStatus:
    """Return a boolean indicating whether the admin is authenticated."""

    settings = get_settings()
    session_jwt = request.session.get("jwt")
    session_email = request.session.get("admin_email")

    if not session_jwt or not session_email:
        return SessionStatus(authenticated=False)

    try:
        payload = decode_token(session_jwt)
    except HTTPException:
        return SessionStatus(authenticated=False)

    subject = str(payload.get("sub", "")).lower()
    expected = settings.admin_email.lower()
    if subject != expected or session_email.lower() != expected:
        return SessionStatus(authenticated=False)

    username = payload.get("sub")
    is_admin = payload.get("is_admin")
    return SessionStatus(authenticated=True, username=username, is_admin=is_admin)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear the admin session.",
)
@limiter.limit("30/minute")
async def logout(response: Response, request: Request) -> Response:
    """Invalidate the signed session cookie."""

    settings = get_settings()
    request.session.clear()
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        domain=settings.session_cookie_domain,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
