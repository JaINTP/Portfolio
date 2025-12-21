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

@router.get("/{provider}/login")
async def login(provider: str, request: Request):
    """Initiate SSO login flow."""
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not configured")
    
    redirect_uri = request.url_for("auth_callback", provider=provider)
    return await client.authorize_redirect(request, str(redirect_uri))


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

    token = await client.authorize_access_token(request)
    user_info = token.get("userinfo")
    
    if not user_info:
        if provider == "github":
            resp = await client.get("user", token=token)
            user_info = resp.json()
            # GitHub might not return email in /user if it's private
            if not user_info.get("email"):
                emails_resp = await client.get("user/emails", token=token)
                emails = emails_resp.json()
                for email in emails:
                    if email.get("primary") and email.get("verified"):
                        user_info["email"] = email["email"]
                        break
        elif provider == "meta":
            resp = await client.get("me?fields=id,name,email,picture", token=token)
            user_info = resp.json()
        elif provider == "twitter":
            resp = await client.get("account/verify_credentials.json?include_email=true", token=token)
            user_info = resp.json()

    if not user_info or not user_info.get("email"):
        raise HTTPException(status_code=400, detail="Could not retrieve user info from provider")

    email = user_info["email"].lower()
    name = user_info.get("name") or user_info.get("login") or email.split("@")[0]
    avatar_url = user_info.get("picture") or user_info.get("avatar_url")
    provider_id = str(user_info.get("sub") or user_info.get("id"))

    # Check if user exists
    stmt = select(UserProfileRecord).where(UserProfileRecord.email == email)
    result = await session.execute(stmt)
    user_record = result.scalar_one_or_none()

    if not user_record:
        # Create new user
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
        # Update existing user info
        user_record.name = name
        user_record.avatar_url = avatar_url
        await session.commit()

    # Store user in session
    request.session["user_id"] = str(user_record.id)
    request.session["user_email"] = user_record.email
    request.session["user_name"] = user_record.name

    # Redirect back to frontend
    frontend_url = str(settings.frontend_origin).rstrip("/")
    return RedirectResponse(url=f"{frontend_url}/blog")
