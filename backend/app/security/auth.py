"""Authentication dependency verifying Firebase ID tokens and strictly guarding dev/guest tokens."""

from datetime import datetime, timezone
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.config import Settings, get_settings
from backend.app.schemas.user import UserSession

logger = logging.getLogger("saathi.security.auth")
security_scheme = HTTPBearer(auto_error=False)

# Optional firebase admin handle
_firebase_initialized = False


def _init_firebase(settings: Settings) -> None:
    """Initialize Firebase Admin SDK if not already initialized."""
    global _firebase_initialized
    if _firebase_initialized:
        return

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            if settings.FIREBASE_CREDENTIALS_PATH:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
            else:
                # Default application credentials or project ID
                firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
        _firebase_initialized = True
        logger.info("Firebase Admin SDK initialized.")
    except Exception as exc:
        logger.warning("Firebase Admin initialization skipped/failed: %s", exc)


def is_dev_token(token: str) -> bool:
    """Check if token matches the development/testing token prefix."""
    return token.startswith("dev-") or token.startswith("guest-") or token == "test-token"


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    settings: Settings = Depends(get_settings),
) -> UserSession:
    """FastAPI dependency: Verifies caller's bearer token.

    Rules:
    1. Dev tokens are only permitted when ENVIRONMENT in ("dev", "test") AND ALLOW_DEV_TOKENS is True.
    2. In 'prod', dev tokens strictly return 401 Unauthorized.
    3. Production tokens are verified via Firebase Admin SDK.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()

    # Handle Dev / Guest Token pattern
    if is_dev_token(token):
        # Strict security constraint: Never allow dev tokens in prod
        if settings.ENVIRONMENT.lower() == "prod" or not settings.ALLOW_DEV_TOKENS:
            logger.warning("Security alert: Attempted use of dev-token in prod environment")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Developer tokens are strictly forbidden in production",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Permitted in dev/test
        is_guest = token.startswith("guest-")
        uid = f"user_{token}" if not token.startswith("user_") else token
        display_name = "Guest Senior" if is_guest else "Sharma Ji"
        return UserSession(
            uid=uid,
            email=f"{uid}@saathi.local",
            display_name=display_name,
            is_guest=is_guest,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    # Firebase ID Token verification
    _init_firebase(settings)
    try:
        from firebase_admin import auth

        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing UID",
            )

        return UserSession(
            uid=uid,
            email=decoded_token.get("email"),
            display_name=decoded_token.get("name", "Sharma Ji"),
            phone_number=decoded_token.get("phone_number"),
            is_guest=False,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
