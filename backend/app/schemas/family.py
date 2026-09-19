"""Pydantic schemas for Family Circle & Emergency SOS (Step i)."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TrustedContact(BaseModel):
    id: str
    name: str
    relationship: str  # e.g. "Son", "Daughter", "Doctor", "Neighbor"
    phone_number: str
    is_primary: bool = False
    notify_on_scam: bool = True
    notify_on_vitals: bool = True
    notify_on_sos: bool = True


class TrustedContactCreate(BaseModel):
    name: str = Field(..., min_length=2)
    relationship: str = Field(..., min_length=2)
    phone_number: str = Field(..., min_length=10)
    is_primary: bool = False
    notify_on_scam: bool = True
    notify_on_vitals: bool = True
    notify_on_sos: bool = True


class SOSEventCreate(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_meters: Optional[float] = None
    address_hint: Optional[str] = None


class SOSEvent(BaseModel):
    id: str
    user_id: str
    timestamp: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    maps_url: Optional[str] = None
    contacts_alerted: List[str]
    status: str = "active"


class CaregiverDashboardView(BaseModel):
    senior_name: str
    today_date: str
    adherence_rate_7d: float
    today_doses_summary: List[Dict[str, Any]]
    latest_vitals: Optional[Dict[str, Any]] = None
    recent_scam_alerts: List[Dict[str, Any]] = []
    last_sos: Optional[SOSEvent] = None
