"""Application Configuration using Pydantic Settings.

Reads configuration strictly from environment variables.
Enforces security constraints including forbidding dev tokens in production.
"""

from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for SaathiAI."""

    # Environment
    ENVIRONMENT: str = Field(default="dev", description="Environment: dev, test, prod")
    ALLOW_DEV_TOKENS: bool = Field(
        default=False,
        description="Allow developer bypass tokens for local testing only"
    )
    PORT: int = Field(default=8080, description="Server port")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    # Gemini AI
    GEMINI_API_KEY: str = Field(
        default="",
        description="Gemini API Key (retrieved from Secret Manager in Cloud Run)"
    )
    GEMINI_MODEL: str = Field(
        default="gemini-2.5-flash",
        description="Gemini model name"
    )
    GEMINI_MOCK: bool = Field(
        default=False,
        description="Deterministic mock mode for offline testing and CI"
    )
    YOUTUBE_API_KEY: str = Field(
        default="",
        description="Optional YouTube Data API v3 key for real-time video search"
    )

    # Firebase
    FIREBASE_PROJECT_ID: str = Field(
        default="saathi-ai-demo",
        description="Firebase Project ID"
    )
    FIREBASE_CREDENTIALS_PATH: str = Field(
        default="",
        description="Path to service account credentials JSON if using direct file"
    )

    # Storage
    STORAGE_BUCKET_NAME: str = Field(
        default="saathi-ai-uploads",
        description="Google Cloud Storage bucket name for uploads"
    )

    # Security & CORS
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:8080,http://127.0.0.1:5173,http://127.0.0.1:8080",
        description="Comma-separated allowed origins for CORS"
    )
    RATE_LIMIT_PER_MINUTE: int = Field(
        default=120,
        description="Maximum requests per minute per IP / UID"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("ALLOW_DEV_TOKENS")
    @classmethod
    def validate_dev_tokens_for_prod(cls, v: bool, info) -> bool:
        env = info.data.get("ENVIRONMENT", "").lower()
        if env == "prod" and v:
            raise ValueError(
                "CRITICAL SECURITY VIOLATION: ALLOW_DEV_TOKENS cannot be enabled in 'prod' environment!"
            )
        return v

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


# Lazy singleton instance
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create singleton application settings."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reset_settings_for_tests(new_settings: Settings | None = None) -> None:
    """Reset the settings singleton (used in test fixtures)."""
    global _settings
    _settings = new_settings
