import pytest
from httpx import AsyncClient
from datetime import datetime, timezone

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "password"

@pytest.mark.asyncio
async def test_blogs_flow(client: AsyncClient):
    """Test the complete flow for blogs: create -> read -> update -> delete."""
    
    # 0. Clean start
    res = await client.get("/api/blogs")
    assert res.status_code == 200
    assert res.json() == []

    # 1. Login as Admin
    await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    # 2. Create Blog
    payload = {
        "title": "First Post",
        "excerpt": "This is the start.",
        "content": "# Hello World",
        "category": "Tech",
        "tags": ["Coding"],
        "read_time": "5 min",
        "published_at": datetime.now(timezone.utc).date().isoformat()
    }
    res = await client.post("/api/blogs", json=payload)
    if res.status_code != 201:
        print(res.json())

    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "First Post"
    blog_id = data["id"]

    # 3. Read Blog (Public)
    # List
    res = await client.get("/api/blogs")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["title"] == "First Post"

    # Detail
    res = await client.get(f"/api/blogs/{blog_id}")
    assert res.status_code == 200
    assert res.json()["title"] == "First Post"

    # 4. RSS Feed
    res = await client.get("/api/blogs/rss.xml")
    assert res.status_code == 200
    assert "application/rss+xml" in res.headers["content-type"]
    assert "<title>First Post</title>" in res.text

    # 5. Data Script
    res = await client.get("/api/blogs/data.js")
    assert res.status_code == 200
    assert "window.__PORTFOLIO_DATA__.blogs=" in res.text
    assert "First Post" in res.text

    # 6. Update Blog
    update_payload = {"title": "Updated Post"}
    res = await client.put(f"/api/blogs/{blog_id}", json=update_payload)
    assert res.status_code == 200
    assert res.json()["title"] == "Updated Post"

    # 7. Delete Blog
    res = await client.delete(f"/api/blogs/{blog_id}")
    assert res.status_code == 204

    # 8. Verify Delete
    res = await client.get(f"/api/blogs/{blog_id}")
    assert res.status_code == 404

    # 9. Edge Cases
    from uuid import uuid4
    fake_id = uuid4()

    # Get invalid
    res = await client.get(f"/api/blogs/{fake_id}")
    assert res.status_code == 404

    # Update invalid
    res = await client.put(f"/api/blogs/{fake_id}", json={"title": "Ghost"})
    assert res.status_code == 404

    # Delete invalid
    res = await client.delete(f"/api/blogs/{fake_id}")
    assert res.status_code == 404
