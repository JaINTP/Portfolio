import pytest
from uuid import uuid4
from fastapi import status
from sqlalchemy import select
from apps.api.app.models.blog_post import BlogPostRecord
from apps.api.app.models.user import UserProfileRecord
from apps.api.app.models.comment import CommentRecord

@pytest.mark.asyncio
async def test_create_comment_authenticated(client, async_session):
    # Setup: Create a blog post and a user
    blog_id = uuid4()
    blog = BlogPostRecord(
        id=blog_id,
        title="Test Blog",
        excerpt="Test Excerpt",
        content="Test Content",
        category="testing",
        published_at="2023-01-01",
        read_time="5 min"
    )
    user_id = uuid4()
    user = UserProfileRecord(
        id=user_id,
        email="test@example.com",
        name="Test User",
        provider="google",
        provider_id="123"
    )
    async_session.add_all([blog, user])
    await async_session.commit()

    # Mock session
    with client.session_transaction() as sess:
        sess["user_id"] = str(user_id)

    response = client.post(
        f"/api/blogs/{blog_id}/comments",
        json={"content": "This is a test comment"}
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["content"] == "This is a test comment"
    assert data["user_name"] == "Test User"

@pytest.mark.asyncio
async def test_create_comment_unauthenticated(client, async_session):
    blog_id = uuid4()
    response = client.post(
        f"/api/blogs/{blog_id}/comments",
        json={"content": "Should fail"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_list_comments(client, async_session):
    # Setup similar to above...
    pass
