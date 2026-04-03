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
    """Generate the callback URI using the API's own domain.
    
    This ensures cookies set during the OAuth flow remain on the same domain
    throughout the entire process, avoiding cross-domain cookie issues with
    proxied setups like Vercel rewrites.
    """
    # Use the actual request URL (the API domain), not X-Forwarded-Host
    # This ensures the cookie domain matches the callback domain
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
async def login(provider: str, request: Request, return_to: str = "/blog"):
    """Initiate SSO login flow."""
    client = oauth.create_client(provider)
    if not client:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not configured")
    
    redirect_uri = get_redirect_uri(request, provider)
    logger.info(f"SSO Login for {provider}")
    logger.info(f"Redirect URI for OAuth: {redirect_uri}")
    logger.info(f"Return to after auth: {return_to}")
    
    resp = await client.authorize_redirect(request, redirect_uri)
    
    # Extract state from the redirect URL
    from urllib.parse import urlparse, parse_qs
    location = resp.headers.get("location", "")
    parsed = urlparse(location)
    state_params = parse_qs(parsed.query)
    state = state_params.get("state", [None])[0]
    
    logger.info(f"OAuth state to store: {state}")
    
    # Store state in our own cookie (SessionMiddleware isn't working in serverless)
    if state:
        resp.set_cookie(
            key=f"oauth_state_{provider}",
            value=state,
            max_age=600,  # 10 minutes
            path="/",
            secure=True,
            httponly=True,
            samesite="lax",
        )
    
    # Store the return URL so we can redirect back after auth
    resp.set_cookie(
        key="oauth_return_to",
        value=return_to,
        max_age=600,
        path="/",
        secure=True,
        httponly=True,
        samesite="lax",
    )
    
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
        
        # Get state from URL and our custom cookie
        url_state = request.query_params.get('state')
        cookie_state = request.cookies.get(f'oauth_state_{provider}')
        
        logger.info(f"State in URL: {url_state}")
        logger.info(f"State in cookie: {cookie_state}")
        
        # Verify states match
        if not cookie_state or cookie_state != url_state:
            logger.error(f"State mismatch! Cookie: {cookie_state}, URL: {url_state}")
            raise HTTPException(
                status_code=400,
                detail="OAuth state mismatch. Please try logging in again."
            )
        
        logger.info("State validated successfully, exchanging code for token")
        
        # Get the authorization code
        code = request.query_params.get('code')
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")
        
        # Manually exchange code for token (bypassing Authlib's broken state check)
        import httpx
        
        token_url = client.access_token_url
        token_data = {
            "client_id": client.client_id,
            "client_secret": client.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        
        if provider == "github":
            token_url = "https://github.com/login/oauth/access_token"
            headers = {"Accept": "application/json"}
        elif provider == "google":
            token_url = "https://oauth2.googleapis.com/token"
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            token_data["grant_type"] = "authorization_code"
        else:
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            token_data["grant_type"] = "authorization_code"
        
        async with httpx.AsyncClient() as http_client:
            token_resp = await http_client.post(token_url, data=token_data, headers=headers)
            token = token_resp.json()
        
        logger.info(f"Token response received: {list(token.keys())}")
        
        if "error" in token:
            logger.error(f"Token error: {token}")
            raise HTTPException(status_code=400, detail=token.get("error_description", "OAuth token exchange failed"))
        
        # Get user info
        user_info = None
        access_token = token.get("access_token")
        
        async with httpx.AsyncClient() as http_client:
            if provider == "github":
                headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
                resp = await http_client.get("https://api.github.com/user", headers=headers)
                user_info = resp.json()
                if not user_info.get("email"):
                    emails_resp = await http_client.get("https://api.github.com/user/emails", headers=headers)
                    emails = emails_resp.json()
                    for email_data in emails:
                        if email_data.get("primary") and email_data.get("verified"):
                            user_info["email"] = email_data["email"]
                            break
            elif provider == "google":
                headers = {"Authorization": f"Bearer {access_token}"}
                resp = await http_client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers)
                user_info = resp.json()
            elif provider == "meta":
                resp = await http_client.get(f"https://graph.facebook.com/me?fields=id,name,email,picture&access_token={access_token}")
                user_info = resp.json()
            elif provider == "twitter":
                # Twitter OAuth 1.0a is more complex, keep using authlib for now
                pass

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
        frontend_url = str(settings.frontend_origin).rstrip("/")
        
        # Get the original page from cookie (set during login) or default to /blog
        return_to = request.cookies.get("oauth_return_to", "/blog")
        response = RedirectResponse(url=f"{frontend_url}{return_to}")
        
        # Set visible cookie for frontend state detection
        # Use the frontend domain so the cookie is accessible there
        from urllib.parse import urlparse
        frontend_host = urlparse(frontend_url).netloc
        # Extract root domain for cookie (e.g., "jaintp.com" from "www.jaintp.com")
        domain_parts = frontend_host.split(".")
        if len(domain_parts) >= 2:
            cookie_domain = f".{'.'.join(domain_parts[-2:])}"  # e.g., ".jaintp.com"
        else:
            cookie_domain = None
        
        response.set_cookie(
            key="auth_state",
            value="true",
            max_age=settings.session_cookie_max_age_seconds,
            path="/",
            domain=cookie_domain,  # Set for the entire domain
            secure=True,
            httponly=False,  # Explicitly accessible to JS
            samesite="lax",
        )
        
        # Clear the oauth cookies
        response.delete_cookie("oauth_state_github", path="/")
        response.delete_cookie("oauth_return_to", path="/")
        
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
