import pytest
from httpx import AsyncClient

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "password"

@pytest.mark.asyncio
async def test_cache_refresh_authorized(client: AsyncClient):
    """Test that admin can refresh the cache."""
    
    # 1. Login as Admin
    await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    
    # 2. Call Refresh
    res = await client.post("/api/cache/refresh")
    assert res.status_code == 200
    assert res.json() == {"status": "refreshed", "message": "Cache updated successfully."}

@pytest.mark.asyncio
async def test_cache_refresh_unauthorized(client: AsyncClient):
    """Test that non-admin cannot refresh the cache."""
    
    # No login
    res = await client.post("/api/cache/refresh")
    assert res.status_code == 401
