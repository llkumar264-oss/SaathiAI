"""Security and Authentication Tests.

Tests the critical requirement:
- Dev-token auth fallback must be enabled ONLY when ENVIRONMENT is "dev" or "test".
- In "prod", the app must reject dev tokens and fail to start if ALLOW_DEV_TOKENS is set.
- Proves prod rejects dev tokens with 401.
"""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.config import Settings, reset_settings_for_tests
from backend.app.main import create_app


def test_prod_refuses_allow_dev_tokens_in_settings():
    """Settings validation must fail if ALLOW_DEV_TOKENS is enabled in prod."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(ENVIRONMENT="prod", ALLOW_DEV_TOKENS=True)
    assert "CRITICAL SECURITY VIOLATION" in str(exc_info.value)


def test_app_factory_fails_if_dev_tokens_in_prod(monkeypatch):
    """The FastAPI app factory must refuse to initialize if ALLOW_DEV_TOKENS is set in prod."""
    # Bypass settings validator via bypass object to test create_app() guard
    class MockSettings:
        ENVIRONMENT = "prod"
        ALLOW_DEV_TOKENS = True
        allowed_origins_list = []
        GEMINI_MOCK = True

    monkeypatch.setattr("backend.app.main.get_settings", lambda: MockSettings())
    with pytest.raises(RuntimeError) as exc_info:
        create_app()
    assert "ALLOW_DEV_TOKENS cannot be enabled when ENVIRONMENT=prod" in str(exc_info.value)


def test_prod_strictly_rejects_dev_tokens_with_401():
    """In prod mode, dev-tokens must be strictly rejected with 401 Unauthorized."""
    # Configure prod settings (with ALLOW_DEV_TOKENS=False)
    prod_settings = Settings(ENVIRONMENT="prod", ALLOW_DEV_TOKENS=False)
    reset_settings_for_tests(prod_settings)
    app = create_app()
    client = TestClient(app)

    # Attempt request with dev token
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer dev-senior-1"}
    )
    assert response.status_code == 401
    assert "forbidden in production" in response.json()["detail"].lower()


def test_missing_auth_header_returns_401():
    """Requests without Authorization header must return 401."""
    dev_settings = Settings(ENVIRONMENT="dev", ALLOW_DEV_TOKENS=True)
    reset_settings_for_tests(dev_settings)
    app = create_app()
    client = TestClient(app)

    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "missing authorization" in response.json()["detail"].lower()


def test_dev_token_allowed_in_dev_environment():
    """In dev mode with ALLOW_DEV_TOKENS=True, dev tokens must succeed."""
    dev_settings = Settings(ENVIRONMENT="dev", ALLOW_DEV_TOKENS=True)
    reset_settings_for_tests(dev_settings)
    app = create_app()
    client = TestClient(app)

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer dev-senior-sharma"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "sharma" in data["uid"]
    assert data["display_name"] == "Sharma Ji"
