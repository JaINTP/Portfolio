import pytest
from httpx import AsyncClient
import os

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "password"

@pytest.mark.asyncio
async def test_uploads_flow(client: AsyncClient):
    """Test the file upload flow."""

    # 1. Login as Admin
    await client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    # 2. Upload Profile Image
    files = {"file": ("test.png", b"fake-png-content", "image/png")}
    res = await client.post("/api/uploads/profile-image", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert "/uploads/profile_" in data["url"]
    assert data["url"].endswith(".png")

    # 3. Upload Blog Image
    files = {"file": ("blog.jpg", b"fake-jpg-content", "image/jpeg")}
    res = await client.post("/api/uploads/blogs/cover-image", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "/uploads/blogs/blog_" in data["url"]

    # 4. Upload Project Image
    files = {"file": ("project.gif", b"fake-gif-content", "image/gif")}
    res = await client.post("/api/uploads/projects/cover-image", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "/uploads/projects/project_" in data["url"]

    # 5. Invalid File Type
    files = {"file": ("test.txt", b"text-content", "text/plain")}
    res = await client.post("/api/uploads/profile-image", files=files)
    assert res.status_code == 400
    assert "Unsupported image type" in res.json()["detail"]
