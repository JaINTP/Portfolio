"""Models used by the API."""

from ..db import BaseModel
from .about_profile import (
    AboutProfile,
    AboutProfileCreate,
    AboutProfileRecord,
    AboutProfileUpdate,
    DogProfile,
    SocialLinks,
)
from .blog_post import (
    BlogPost,
    BlogPostCreate,
    BlogPostRecord,
    BlogPostUpdate,
)
from .project import (
    Project,
    ProjectCreate,
    ProjectRecord,
    ProjectUpdate,
)
from .status_check import StatusCheck, StatusCheckCreate, StatusCheckRecord

metadata = BaseModel.metadata

__all__ = [
    "metadata",
    # Blog posts
    "BlogPost",
    "BlogPostCreate",
    "BlogPostUpdate",
    "BlogPostRecord",
    # Projects
    "Project",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectRecord",
    # About profile
    "AboutProfile",
    "AboutProfileCreate",
    "AboutProfileUpdate",
    "AboutProfileRecord",
    "DogProfile",
    "SocialLinks",
    # Status checks
    "StatusCheck",
    "StatusCheckCreate",
    "StatusCheckRecord",
]
