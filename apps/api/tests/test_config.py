import os
from unittest import mock
import pytest
from app.config import Settings, get_settings

def test_settings_development():
    """Test settings in development mode."""
    with mock.patch.dict(os.environ, {
        "ENVIRONMENT": "development",
        "POSTGRES_USER": "user",
        "POSTGRES_PASSWORD": "password",
        "POSTGRES_SERVER": "localhost",
        "POSTGRES_PORT": "5432",
        "POSTGRES_DB": "db",
        "SESSION_SECRET_KEY": "secret",
        "ADMIN_EMAIL": "admin@example.com",
        "ADMIN_PASSWORD_HASH": "hash",
        "UPLOADS_DIR": "/tmp/test_uploads_dev",
        "DEVELOPMENT_ORIGINS": "http://localhost:8080, http://localhost:8081"
    }, clear=True):
        settings = Settings()
        assert settings.environment == "development"
        # assert settings.testing is False  # Removed non-existent field check
        
        # Verify DSN default
        assert "postgresql+asyncpg://" in str(settings.database_url)
        assert len(settings.development_origins) == 2
        assert str(settings.development_origins[0]) == "http://localhost:8080/"

def test_settings_production():
    """Test settings in production mode."""
    with mock.patch.dict(os.environ, {
        "ENVIRONMENT": "production",
        "FRONTEND_ORIGIN": "https://myapp.com",
        "POSTGRES_USER": "prod_user",
        "POSTGRES_PASSWORD": "prod_password",
        "POSTGRES_SERVER": "prod_db",
        "POSTGRES_DB": "prod_db",
        "SESSION_SECRET_KEY": "prod_secret",
        "ADMIN_EMAIL": "admin@prod.com",
        "ADMIN_PASSWORD_HASH": "prod_hash",
        "ALLOWED_CORS_ORIGINS": '["https://example.com"]',
        "UPLOADS_DIR": "/tmp/test_uploads_prod",
        "JWT_SECRET_KEY": "prod-jwt-secret"
    }, clear=True):
        settings = Settings()
        assert settings.environment == "production"
        assert "postgresql+asyncpg://" in str(settings.database_url)
        # Check production constraints
        assert str(settings.frontend_origin) == "https://myapp.com/"

def test_config_validation_errors():
    """Test configuration validation errors."""
    # Test JSON exception fallback using TRUSTED_HOSTS (list[str])
    # "[invalid-json]" -> json.loads fails -> regex/split fallback -> valid string list
    with mock.patch.dict(os.environ, {
        "TRUSTED_HOSTS": "[invalid-json]",
        "UPLOADS_DIR": "/tmp/test_uploads_fail",
        "DEVELOPMENT_ORIGINS": ""
    }):
        s = Settings()
        assert s.trusted_hosts == ["[invalid-json]"]

    # Test empty trusted hosts (use JSON to bypass env_ignore_empty)
    with mock.patch.dict(os.environ, {
        "TRUSTED_HOSTS": "[]",
        "UPLOADS_DIR": "/tmp/test_uploads_fail2"
    }):
        with pytest.raises(Exception):
             Settings()

def test_samesite_validation():
    """Test validation of SameSite cookie setting."""
    with mock.patch.dict(os.environ, {
        "SESSION_COOKIE_SAMESITE": "null", # Invalid
        "UPLOADS_DIR": "/tmp/test_uploads_ss1"
    }):
        with pytest.raises(Exception):
            Settings()
            
    with mock.patch.dict(os.environ, {
        "SESSION_COOKIE_SAMESITE": "lax",
        "UPLOADS_DIR": "/tmp/test_uploads_ss2"
    }):
        s = Settings()
        assert s.session_cookie_samesite == "lax"
