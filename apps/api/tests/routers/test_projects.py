import pytest
from httpx import AsyncClient

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "password"

@pytest.mark.asyncio
async def test_projects_flow(client: AsyncClient):
    """Test the complete flow for projects: create -> read -> update -> delete."""
    
    # 0. Clean start: Verify empty list
    res = await client.get("/api/projects")
    assert res.status_code == 200
    assert res.json() == []

    # 1. Login as Admin
    await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    # 2. Create Project
    payload = {
        "title": "My Portfolio",
        "description": "A cool portfolio website.",
        "category": "Web Dev",
        "tags": ["React", "FastAPI", "Docker"],
        "image": "https://example.com/image.png",
        "date_label": "2023",
        "github": "https://github.com/my/repo",
        "demo": "https://demo.example.com",
    }
    res = await client.post("/api/projects", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "My Portfolio"
    assert data["tags"] == ["React", "FastAPI", "Docker"]
    project_id = data["id"]

    # 3. Read Project (Public)
    # List
    res = await client.get("/api/projects")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "My Portfolio"

    # Detail
    res = await client.get(f"/api/projects/{project_id}")
    assert res.status_code == 200
    assert res.json()["tags"] == ["React", "FastAPI", "Docker"]

    # 4. Update Project
    update_payload = {"title": "Updated Portfolio", "tags": ["React", "FastAPI"]}
    res = await client.put(f"/api/projects/{project_id}", json=update_payload)
    assert res.status_code == 200
    assert res.json()["title"] == "Updated Portfolio"
    assert res.json()["tags"] == ["React", "FastAPI"]

    # 5. Data Script Endpoint
    res = await client.get("/api/projects/data.js")
    assert res.status_code == 200
    assert "window.__PORTFOLIO_DATA__.projects=" in res.text
    assert "Updated Portfolio" in res.text

    # 6. Delete Project
    res = await client.delete(f"/api/projects/{project_id}")
    assert res.status_code == 204

    # 7. Verify Delete
    res = await client.get("/api/projects")
    assert res.json() == []
    
    res = await client.get(f"/api/projects/{project_id}")
    assert res.status_code == 404

    # 8. Edge Cases
    from uuid import uuid4
    fake_id = uuid4()
    
    # Get invalid
    res = await client.get(f"/api/projects/{fake_id}")
    assert res.status_code == 404

    # Update invalid
    res = await client.put(f"/api/projects/{fake_id}", json={"title": "Ghost"})
    assert res.status_code == 404

    # Delete invalid
    res = await client.delete(f"/api/projects/{fake_id}")
    assert res.status_code == 404
