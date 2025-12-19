import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_status_checks_flow(client: AsyncClient):
    """Test the status checks flow."""

    # 1. List Status Checks (should be empty initially)
    res = await client.get("/api/status")
    assert res.status_code == 200
    assert res.json() == []

    # 2. Create Status Check
    payload = {"client_name": "Test Client"}
    res = await client.post("/api/status", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["client_name"] == "Test Client"
    assert "timestamp" in data

    # 3. List Status Checks again
    res = await client.get("/api/status")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["client_name"] == "Test Client"
