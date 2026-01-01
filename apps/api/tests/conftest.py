import os
import pytest
import asyncio
import sqlalchemy.types
import sqlalchemy.dialects.postgresql
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.types import JSON, String, DateTime
from sqlalchemy.ext.compiler import compiles
import sqlalchemy.ext.asyncio

# 0. Monkey-patch SQLAlchemy types BEFORE any model imports
import sqlalchemy.sql.sqltypes
class MockArray(sqlalchemy.types.TypeDecorator):
    impl = sqlalchemy.types.JSON
    def __init__(self, item_type=None, *args, **kwargs):
        super().__init__(*args, **kwargs)

# Patch ALL aliases
sqlalchemy.types.ARRAY = MockArray
sqlalchemy.sql.sqltypes.ARRAY = MockArray
sqlalchemy.dialects.postgresql.ARRAY = MockArray
sqlalchemy.ARRAY = MockArray

sqlalchemy.dialects.postgresql.JSONB = sqlalchemy.types.JSON
sqlalchemy.dialects.postgresql.UUID = sqlalchemy.types.UUID

# 1. Override Env Vars BEFORE importing app modules
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
test_password_hash = pwd_context.hash("password")

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["ENVIRONMENT"] = "development"
os.environ["UPLOADS_DIR"] = os.path.join(os.getcwd(), "tests", "uploads")
os.environ["FRONTEND_ORIGIN"] = "https://test.example.com"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-00000000000000000000000000000000"
os.environ["SESSION_SECRET_KEY"] = "test-session-key-00000000000000000000000000000000"
os.environ["ADMIN_PASSWORD_HASH"] = test_password_hash
os.environ["ADMIN_USERNAME"] = "admin@example.com"
os.environ["TRUSTED_HOSTS"] = "*"
os.environ["SESSION_COOKIE_SECURE"] = "false"
os.environ["SESSION_COOKIE_SAMESITE"] = "lax"
os.environ["DEVELOPMENT_ORIGINS"] = ""

# 1b. Monkey-patch create_async_engine to ignore pool args for SQLite
_original_create_async_engine = sqlalchemy.ext.asyncio.create_async_engine

def _patched_create_async_engine(url, **kwargs):
    if str(url).startswith("sqlite"):
        kwargs.pop("pool_size", None)
        kwargs.pop("max_overflow", None)
        kwargs.pop("pool_timeout", None)
        kwargs.pop("pool_recycle", None)
        
        # Use StaticPool for in-memory SQLite to persist state
        from sqlalchemy.pool import StaticPool
        kwargs["poolclass"] = StaticPool
        
    return _original_create_async_engine(url, **kwargs)

sqlalchemy.ext.asyncio.create_async_engine = _patched_create_async_engine

# 2. Patch SQLAlchemy types for SQLite


# 3. Import App Modules (Now safe)
from app.main import create_app
from app.db import BaseModel, get_session

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def db_engine():
    """Create a sqlite engine for the session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)

    yield engine
    await engine.dispose()

@pytest.fixture
async def db_session(db_engine):
    """
    Creates a new database session with a rollback transaction.
    This ensures that each test is isolated.
    """
    connection = await db_engine.connect()
    transaction = await connection.begin()
    
    Session = async_sessionmaker(bind=connection, expire_on_commit=False)
    session = Session()

    yield session

    await session.close()
    await transaction.rollback()
    await connection.close()

@pytest.fixture
async def client(db_session):
    """
    Async client with overridden database dependency.
    """
    app = create_app()
    
    # Override the dependency to use our test session
    app.dependency_overrides[get_session] = lambda: db_session
    
    async with AsyncClient(
        transport=ASGITransport(app=app), 
        base_url="https://test"
    ) as ac:
        yield ac

@pytest.fixture(autouse=True)
async def reset_cache():
    """Reset the cache service before each test."""
    from app.services.cache import CacheService
    # Reset singleton instance
    CacheService._instance = None
    # If the app startup initialized it, we might want to ensure a fresh start
    # But since client fixture calls create_app(), which calls lifespan...
    # The lifespan logic runs for that app instance.
    # However, create_app() itself doesn't run lifespan. TestClient/AsyncClient used as context manager triggers lifespan.
    # So each test using 'client' will trigger lifespan startup -> cache refresh.
    # Resetting _instance here ensures we don't reuse state from previous tests.
    yield
    CacheService._instance = None

@pytest.fixture(autouse=True)
async def patch_session_factory(db_session):
    """Patch the SessionFactory in cache service to use the test db session."""
    from app.services import cache
    
    # Create a mock factory that acts as an async context manager yielding the db_session
    class MockSessionFactory:
        def __call__(self):
            return self
            
        async def __aenter__(self):
            return db_session
            
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
            
    original_factory = cache.SessionFactory
    cache.SessionFactory = MockSessionFactory()
    
    yield
    
    cache.SessionFactory = original_factory
