"""User and Session schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class UserSession(BaseModel):
    """Authenticated user session representation."""
    uid: str = Field(..., description="Unique user ID from Firebase or dev/guest mode")
    email: Optional[str] = Field(default=None, description="User email if available")
    display_name: str = Field(default="Sharma Ji", description="Preferred address name")
    phone_number: Optional[str] = Field(default=None, description="Phone number if authenticated via OTP")
    is_guest: bool = Field(default=False, description="True if operating in guest demo mode")
    created_at: str = Field(default="", description="ISO timestamp")


class UserProfile(BaseModel):
    """User profile preferences and settings."""
    uid: str
    display_name: str = "Sharma Ji"
    preferred_language: str = "hi"  # "hi" or "en"
    font_scale: str = "large"       # "normal" (18px), "large" (22px), "extra-large" (28px)
    high_contrast: bool = False
    dark_mode: bool = False
    speech_rate: float = 0.9        # 0.7x to 1.3x
    voice_enabled: bool = True
    simplified_mode: bool = False
    emergency_contacts: list[dict] = Field(default_factory=list)
