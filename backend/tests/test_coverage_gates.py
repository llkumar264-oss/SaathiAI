"""Unit tests specifically covering edge cases and auxiliary services to satisfy the >= 85% coverage gate."""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from starlette.requests import Request

from backend.app.ai.gemini_client import GeminiClient
from backend.app.config import Settings
from backend.app.security.auth import get_current_user
from backend.app.security.rate_limiter import get_rate_limit_key
from backend.app.security.sanitizer import (
    MAX_FILE_SIZE_BYTES,
    redact_pii,
    sanitize_text,
    validate_file_upload,
)
from backend.app.services.weather_service import (
    _map_weather_code_and_advice,
    fetch_weather_forecast,
)


def test_sanitizer_file_upload():
    """Test file upload validation across mime types, empty files, and size limits."""
    # Valid JPEG
    ok, mime, err = validate_file_upload("test.jpg", b"\xFF\xD8\xFF\xE0sample")
    assert ok is True
    assert mime == "image/jpeg"
    assert err == ""

    # Valid PNG
    ok, mime, err = validate_file_upload("test.png", b"\x89PNG\r\n\x1a\n\x00data")
    assert ok is True
    assert mime == "image/png"

    # Valid WebP
    webp_data = b"RIFF\x00\x00\x00\x00WEBPtest"
    ok, mime, err = validate_file_upload("test.webp", webp_data)
    assert ok is True
    assert mime == "image/webp"

    # Valid PDF
    ok, mime, err = validate_file_upload("test.pdf", b"%PDF-1.4\n...")
    assert ok is True
    assert mime == "application/pdf"

    # Empty content
    ok, mime, err = validate_file_upload("empty.txt", b"")
    assert ok is False
    assert "empty" in err

    # Oversized content
    oversized = b"x" * (MAX_FILE_SIZE_BYTES + 10)
    ok, mime, err = validate_file_upload("large.jpg", oversized)
    assert ok is False
    assert "exceeds maximum" in err

    # Invalid format
    ok, mime, err = validate_file_upload("bad.exe", b"MZ\x90\x00\x03...")
    assert ok is False
    assert "Invalid file format" in err


def test_sanitizer_text_and_redaction():
    """Test HTML/XSS sanitization and PII redaction rules."""
    assert sanitize_text("") == ""
    dirty = "<script>alert('hack')</script>Hello <b>World</b><iframe src='bad.com'></iframe>"
    cleaned = sanitize_text(dirty)
    assert "script" not in cleaned
    assert "iframe" not in cleaned
    assert "Hello" in cleaned

    # PII Redaction
    assert redact_pii("") == ""
    sample = "Call 9876543210 or Aadhaar 1234 5678 9012 with PAN ABCDE1234F and OTP 458921"
    redacted = redact_pii(sample)
    assert "9876543210" not in redacted
    assert "[PHONE_REDACTED]" in redacted
    assert "[AADHAAR_REDACTED]" in redacted
    assert "[PAN_REDACTED]" in redacted
    assert "[CODE_REDACTED]" in redacted


def test_rate_limiter_key_generation():
    """Test rate limiter key extraction from Authorization header and client IP."""
    scope = {
        "type": "http",
        "headers": [(b"authorization", b"Bearer dev-user-1234567890abcdef")],
        "client": ("127.0.0.1", 8000),
    }
    req_auth = Request(scope)
    key_auth = get_rate_limit_key(req_auth)
    assert key_auth.startswith("uid:dev-user-")

    scope_no_auth = {
        "type": "http",
        "headers": [],
        "client": ("192.168.1.100", 54321),
    }
    req_no_auth = Request(scope_no_auth)
    key_no_auth = get_rate_limit_key(req_no_auth)
    assert "192.168.1.100" in key_no_auth


def test_weather_mapping_and_advisories():
    """Test weather codes and senior advisories across temperatures."""
    # High temp (> 38)
    cond, adv = _map_weather_code_and_advice(0, 41.0)
    assert "Clear Sky" in cond
    assert "धूप बहुत तेज़" in adv

    # Low temp (< 12)
    cond, adv = _map_weather_code_and_advice(45, 8.0)
    assert "Foggy" in cond
    assert "सुबह हल्की सैर करें" in adv

    # Moderate rain
    cond, adv = _map_weather_code_and_advice(61, 24.0)
    assert "Rain" in cond
    assert "फिसलन" in adv

    # Thunderstorm
    cond, adv = _map_weather_code_and_advice(95, 25.0)
    assert "Thunderstorm" in cond
    assert "घर के अंदर रहें" in adv

    # Partly cloudy
    cond, adv = _map_weather_code_and_advice(2, 22.0)
    assert "Partly Cloudy" in cond


@pytest.mark.asyncio
async def test_fetch_weather_forecast_live_and_fallback():
    """Test Open-Meteo fetch when API returns success and when exception occurs."""
    # Mock successful HTTP response
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {
        "current": {
            "temperature_2m": 31.5,
            "relative_humidity_2m": 48,
            "weather_code": 1,
            "is_day": 1,
        }
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_res
        data = await fetch_weather_forecast(28.6139, 77.2090)
        assert data["temperature_celsius"] == 31.5
        assert "Partly Cloudy" in data["condition"]

    # Test exception fallback
    with patch("httpx.AsyncClient.get", side_effect=Exception("Network error")):
        fallback = await fetch_weather_forecast()
        assert fallback["temperature_celsius"] == 29.5
        assert "सुहावना" in fallback["condition"]


@pytest.mark.asyncio
async def test_firebase_auth_verification_flow():
    """Test get_current_user token verification with Firebase Admin."""
    settings = Settings(
        ENVIRONMENT="prod",
        ALLOW_DEV_TOKENS=False,
        FIREBASE_PROJECT_ID="test-proj",
        FIREBASE_CREDENTIALS_PATH="",
    )

    # Missing creds
    with pytest.raises(HTTPException) as exc:
        await get_current_user(credentials=None, settings=settings)
    assert exc.value.status_code == 401

    # Valid Firebase token mock
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid-fb-token")
    with patch("firebase_admin.auth.verify_id_token") as mock_verify:
        mock_verify.return_value = {
            "uid": "fb-user-999",
            "email": "senior@example.com",
            "name": "Verma Ji",
            "phone_number": "+919876543210",
        }
        user = await get_current_user(credentials=creds, settings=settings)
        assert user.uid == "fb-user-999"
        assert user.display_name == "Verma Ji"
        assert user.is_guest is False

    # Firebase token with missing UID
    with patch("firebase_admin.auth.verify_id_token") as mock_verify:
        mock_verify.return_value = {"email": "no-uid@example.com"}
        with pytest.raises(HTTPException) as exc:
            await get_current_user(credentials=creds, settings=settings)
        assert exc.value.status_code == 401

    # Firebase token invalid/expired
    with patch("firebase_admin.auth.verify_id_token", side_effect=ValueError("Token expired")):
        with pytest.raises(HTTPException) as exc:
            await get_current_user(credentials=creds, settings=settings)
        assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_gemini_client_methods():
    """Test GeminiClient text generation and mock behavior."""
    settings = Settings(GEMINI_MOCK=True, GEMINI_API_KEY="mock-key")
    client = GeminiClient(settings=settings)
    assert client.mock_mode is True

    text = await client.generate_text("मुझे मदद चाहिए")
    assert "शर्मा जी" in text
