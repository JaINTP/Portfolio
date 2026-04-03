import pytest
from app.models.about_profile import DogProfile, SocialLinks, AboutProfileCreate
from app.models.project import ProjectCreate
from app.models.blog_post import BlogPostCreate

def test_about_validators():
    """Test validators for AboutProfile models."""
    
    # Test DogProfile skills empty
    dog = DogProfile(name="Rex", role="Mascot", bio="Bio", skills=[])
    assert dog.skills == []
    
    dog = DogProfile(name="Rex", role="Mascot", bio="Bio", skills=None)
    assert dog.skills == []

    # Test DogProfile image sanitization
    dog = DogProfile(name="Rex", role="Mascot", bio="Bio", image="")
    assert dog.image is None

    # Test invalid media paths
    with pytest.raises(ValueError, match="Protocol-relative paths"):
        DogProfile(name="Rex", role="Mascot", bio="Bio", image="//example.com/image.png")
        
    with pytest.raises(ValueError, match="Relative paths cannot contain"):
        DogProfile(name="Rex", role="Mascot", bio="Bio", image="/uploads/../secret")

    # Test SocialLinks sanitization
    social = SocialLinks(github="")
    assert social.github is None

    # Test invalid URL protocols
    with pytest.raises(ValueError, match="Unsupported URL scheme"):
        SocialLinks(github="ftp://example.com")

def test_sanitization_utils():
    """Test sanitization utilities directly."""
    from app.utils.sanitization import sanitize_media_path
    
    assert sanitize_media_path("") == ""
    assert sanitize_media_path("   ") == ""

    # Test AboutProfile sanitization
    profile = AboutProfileCreate(
        name="Name", title="Title", bio="Bio", email="email@e.com", location="Loc",
        profile_image=""
    )
    assert profile.profile_image is None
    assert profile.skills == []

def test_project_validators():
    """Test validators for Project models."""
    
    proj = ProjectCreate(
        title="Title", description="Desc", category="Cat",
        image="", date_label="2023", tags=None
    )
    assert proj.image is None
    assert proj.tags == []
    
    proj = ProjectCreate(
        title="Title", description="Desc", category="Cat",
        image="", date_label="2023", tags=[], github="", demo=""
    )
    assert proj.tags == []
    assert proj.github is None
    assert proj.demo is None

def test_blog_validators():
    """Test validators for Blog models."""
    
    blog = BlogPostCreate(
        title="Title", excerpt="Ex", content="Content",
        category="Cat", read_time="5 min", published_at="2023-01-01",
        image="", tags=None
    )
    assert blog.image is None
    assert blog.tags == []
