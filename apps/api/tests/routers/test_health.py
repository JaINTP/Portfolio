import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_api_root(client: AsyncClient):
    """Test the root API endpoint."""
    response = await client.get("/api/")
    assert response.status_code == 200
    assert response.json() == {"message": "Portfolio API is running."}

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test the healthz endpoint."""
    response = await client.get("/api/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
