"""SSO routes for Google, GitHub, X, and Meta."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import get_session
from ..models.user import UserProfileRecord, UserProfile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/sso", tags=["sso"])

settings = get_settings()
oauth = OAuth()

# Google
if settings.google_client_id and settings.google_client_secret:
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

# GitHub
if settings.github_client_id and settings.github_client_secret:
    oauth.register(
        name="github",
        client_id=settings.github_client_id,
        client_secret=settings.github_client_secret,
        access_token_url="https://github.com/login/oauth/access_token",
        access_token_params=None,
        authorize_url="https://github.com/login/oauth/authorize",
        authorize_params=None,
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "user:email"},
    )

# X (Twitter)
if settings.twitter_client_id and settings.twitter_client_secret:
    oauth.register(
        name="twitter",
        client_id=settings.twitter_client_id,
        client_secret=settings.twitter_client_secret,
        request_token_url="https://api.twitter.com/oauth/request_token",
        access_token_url="https://api.twitter.com/oauth/access_token",
        authorize_url="https://api.twitter.com/oauth/authenticate",
        api_base_url="https://api.twitter.com/1.1/",
        client_kwargs=None,
    )

# Meta (Facebook)
if settings.meta_client_id and settings.meta_client_secret:
    oauth.register(
        name="meta",
        client_id=settings.meta_client_id,
        client_secret=settings.meta_client_secret,
        access_token_url="https://graph.facebook.com/v12.0/oauth/access_token",
        authorize_url="https://www.facebook.com/v12.0/dialog/oauth",
        api_base_url="https://graph.facebook.com/",
        client_kwargs={"scope": "email,public_profile"},
    )

def get_redirect_uri(request: Request, provider: str) -> str:
    """Generate the correctly-routed redirect URI for SSO callbacks."""
    # Respect X-Forwarded-Host if present (common in Vercel/proxy setups)
    forwarded_host = request.headers.get("x-forwarded-host")
    forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    
    if forwarded_host:
        # Construct URI using the forwarded host to stay on the frontend domain
        return f"{forwarded_proto}://{forwarded_host}/api/auth/sso/{provider}/callback"
    
    # Fallback to standard url_for for local development
    return str(request.url_for("auth_callback", provider=provider))

@router.get("/providers")
async def get_enabled_providers():
    """Return a list of configured SSO providers."""
    providers = []
    if settings.google_client_id and settings.google_client_secret:
        providers.append("google")
    if settings.github_client_id and settings.github_client_secret:
        providers.append("github")
    if settings.twitter_client_id and settings.twitter_client_secret:
        providers.append("twitter")
    if settings.meta_client_id and settings.meta_client_secret:
        providers.append("meta")
    return providers

@router.get("/config/debug", include_in_schema=False)
async def debug_sso_config():
    """Diagnostic endpoint to verify active SSO settings (masked)."""
    return {
        "google": {
            "client_id": f"{settings.google_client_id[:10]}..." if settings.google_client_id else None,
            "has_secret": bool(settings.google_client_secret),
        } if settings.google_client_id else "Not Configured",
        "frontend_origin": str(settings.frontend_origin)
    }

@router.get("/session/debug", include_in_schema=False)
async def debug_session(request: Request):
    """Diagnostic endpoint to verify session and cookies."""
    return {
        "session_keys": list(request.session.keys()),
        "has_user_id": "user_id" in request.session,
        "cookies": list(request.cookies.keys()),
        "headers": {k: v for k, v in request.headers.items() if k.lower() in ["cookie", "x-forwarded-host", "host"]}
    }

@router.get("/{provider}/login")
async def login(provider: str, request: Request):
    """Initiate SSO login flow."""
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not configured")
    
    redirect_uri = get_redirect_uri(request, provider)
    resp = await client.authorize_redirect(request, redirect_uri)
    
    # Prevent caching of the redirect to ensure a fresh state/session is generated every time
    resp.headers["Cache-Control"] = "no-store, max-age=0, private"
    resp.headers["Pragma"] = "no-cache"
    
    return resp


@router.get("/{provider}/callback", name="auth_callback")
async def auth_callback(
    provider: str, 
    request: Request, 
    session: AsyncSession = Depends(get_session)
):
    """Handle Callback from SSO provider."""
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not configured")

    try:
        redirect_uri = get_redirect_uri(request, provider)
        logger.info(f"SSO Callback for {provider}")
        logger.info(f"Redirect URI: {redirect_uri}")
        logger.info(f"Cookies received: {list(request.cookies.keys())}")
        logger.info(f"Host header: {request.headers.get('host')}")
        logger.info(f"Session keys: {list(request.session.keys())}")
        logger.info(f"State in session: {request.session.get(f'_state_{provider}')}")
        logger.info(f"State in URL: {request.query_params.get('state')}")
        
        token = await client.authorize_access_token(request, redirect_uri=redirect_uri)
        user_info = token.get("userinfo")
        
        if not user_info:
            if provider == "github":
                resp = await client.get("user", token=token)
                user_info = resp.json()
                if not user_info.get("email"):
                    emails_resp = await client.get("user/emails", token=token)
                    emails = emails_resp.json()
                    for email_data in emails:
                        if email_data.get("primary") and email_data.get("verified"):
                            user_info["email"] = email_data["email"]
                            break
            elif provider == "meta":
                resp = await client.get("me?fields=id,name,email,picture", token=token)
                user_info = resp.json()
            elif provider == "twitter":
                resp = await client.get("account/verify_credentials.json?include_email=true", token=token)
                user_info = resp.json()

        if not user_info or not user_info.get("email"):
            logger.error(f"Failed to retrieve user info for {provider}: {user_info}")
            raise HTTPException(status_code=400, detail="Could not retrieve user info (email) from provider")

        email = user_info["email"].lower()
        name = user_info.get("name") or user_info.get("login") or email.split("@")[0]
        avatar_url = user_info.get("picture") or user_info.get("avatar_url")
        provider_id = str(user_info.get("sub") or user_info.get("id"))

        # Check if user exists
        stmt = select(UserProfileRecord).where(UserProfileRecord.email == email)
        result = await session.execute(stmt)
        user_record = result.scalar_one_or_none()

        if not user_record:
            user_record = UserProfileRecord(
                email=email,
                name=name,
                avatar_url=avatar_url,
                provider=provider,
                provider_id=provider_id
            )
            session.add(user_record)
            await session.commit()
            await session.refresh(user_record)
        else:
            user_record.name = name
            user_record.avatar_url = avatar_url
            await session.commit()

        # Store user in session
        request.session["user_id"] = str(user_record.id)
        request.session["user_email"] = user_record.email
        request.session["user_name"] = user_record.name

        logger.info(f"Successfully logged in user {email} via {provider}")

        # Redirect back to frontend
        # Redirect back to frontend
        frontend_url = str(settings.frontend_origin).rstrip("/")
        response = RedirectResponse(url=f"{frontend_url}/blog")
        
        # Set visible cookie for frontend state detection
        response.set_cookie(
            key="auth_state",
            value="true",
            max_age=settings.session_cookie_max_age_seconds,
            path="/",
            secure=settings.session_cookie_secure,
            httponly=False,  # Explicitly accessible to JS
            samesite="lax",
        )
        
        # Prevent caching of the callback result
        response.headers["Cache-Control"] = "no-store, max-age=0, private"
        response.headers["Pragma"] = "no-cache"
        
        return response

    except Exception as e:
        logger.exception(f"Error in SSO callback for {provider}: {str(e)}")
        # In production, you might want to return 400 with a generic message
        raise HTTPException(
            status_code=500, 
            detail=f"Authentication failed: {type(e).__name__}. Check server logs for details."
        )
