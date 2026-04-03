import pytest
from httpx import AsyncClient

# Matches conftest.py env vars
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "password"

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test successful login."""
    response = await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert response.status_code == 204
    # Check if session cookie is set (implementation detail: depends on backend)
    # The response should have set-cookie header or similar if simple cookie auth

@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient):
    """Test login with wrong credentials."""
    response = await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials."

@pytest.mark.asyncio
async def test_session_status_unauthenticated(client: AsyncClient):
    """Test session status when not logged in."""
    response = await client.get("/api/auth/session")
    assert response.status_code == 200
    assert response.status_code == 200
    assert response.json() == {
        "authenticated": False,
        "username": None,
        "is_admin": None,
    }

@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient):
    """Test full flow: login -> check session -> logout -> check session."""
    
    # 1. Login
    login_res = await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    assert login_res.status_code == 204
    
    # 2. Check Session
    # client automatically handles cookies
    session_res = await client.get("/api/auth/session")
    assert session_res.status_code == 200
    assert session_res.json()["authenticated"] is True
    assert session_res.json()["username"] == ADMIN_EMAIL
    assert session_res.json()["is_admin"] is None  # Basic JWT doesn't have roles yet

    # 3. Logout
    await client.post("/api/auth/logout")

    # 4. Check Session (Unauthenticated)
    session_res = await client.get("/api/auth/session")
    assert session_res.status_code == 200
    assert session_res.json()["authenticated"] is False


@pytest.mark.asyncio
async def test_auth_edge_cases(client: AsyncClient):
    """Test auth edge cases: form data, invalid payloads."""

    # 1. Login with Form Data
    res = await client.post(
        "/api/auth/login",
        data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 204

    # 2. Login with Invalid Json
    res = await client.post(
        "/api/auth/login",
        content="not-json",
        headers={"content-type": "application/json"},
    )
    assert res.status_code == 422

    # 3. Login with Empty Payload
    res = await client.post(
        "/api/auth/login",
        json={},
    )
    assert res.status_code == 422
