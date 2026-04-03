import pytest
from httpx import AsyncClient

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "password"

@pytest.mark.asyncio
async def test_about_flow(client: AsyncClient):
    """Test the complete flow for about profile: create -> read -> update -> delete."""
    
    # 0. Clean start: Verify no profile exists
    res = await client.get("/api/about")
    assert res.status_code == 404
    assert res.json()["detail"] == "About profile not configured."

    # 1. Login as Admin
    await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    # 2. Create Profile
    payload = {
        "name": "Jane Doe",
        "title": "Full Stack Dev",
        "bio": "A passionate developer.",
        "email": "jane@example.com",
        "location": "New York, USA",
        "skills": ["Python", "React"],
        "social": {"github": "https://github.com/jane"},
    }
    res = await client.post("/api/about", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Jane Doe"
    profile_id = data["id"]

    # 3. Read Profile (Public)
    res = await client.get("/api/about")
    assert res.status_code == 200
    assert res.json()["name"] == "Jane Doe"

    # 3.5 Attempt Duplicate Creation
    res = await client.post("/api/about", json=payload)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]

    # 4. Update Profile
    update_payload = {
        "title": "Senior Engineer",
        "social": {"github": "https://github.com/jane-updated"},
        "dog": {"name": "Rex", "role": "Mascot", "bio": "Good boy."}
    }
    res = await client.put(f"/api/about/{profile_id}", json=update_payload)
    assert res.status_code == 200
    assert res.json()["title"] == "Senior Engineer"
    assert res.json()["name"] == "Jane Doe"  # Unchanged
    assert res.json()["social"]["github"] == "https://github.com/jane-updated"
    assert res.json()["dog"]["name"] == "Rex"

    # 5. Unauthorized Delete
    await client.post("/api/auth/logout") # Logout first
    res = await client.delete(f"/api/about/{profile_id}")
    assert res.status_code == 401

    # 6. Delete Profile as Admin
    await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    res = await client.delete(f"/api/about/{profile_id}")
    assert res.status_code == 204

    # 7. Verify Delete
    res = await client.get("/api/about")
    assert res.status_code == 404

    # 8. Edge Cases: Update/Delete Non-Existent
    from uuid import uuid4
    fake_id = uuid4()
    
    res = await client.put(f"/api/about/{fake_id}", json={"name": "Ghost"})
    assert res.status_code == 404
    
    res = await client.delete(f"/api/about/{fake_id}")
    assert res.status_code == 404
