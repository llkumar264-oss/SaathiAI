"""Pydantic schemas for Senior Health & Vitals Tracking (Step g)."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VitalTier(str, Enum):
    NORMAL = "Normal"
    ELEVATED = "Elevated"
    HIGH = "High"
    URGENT = "Urgent"


class SugarContext(str, Enum):
    FASTING = "fasting"
    POST_MEAL = "post_meal"
    RANDOM = "random"


class VitalCreateRequest(BaseModel):
    systolic: Optional[int] = Field(None, ge=40, le=300, description="Systolic blood pressure in mmHg")
    diastolic: Optional[int] = Field(None, ge=30, le=200, description="Diastolic blood pressure in mmHg")
    pulse: Optional[int] = Field(None, ge=30, le=250, description="Heart pulse in bpm")
    blood_sugar: Optional[float] = Field(None, ge=20, le=600, description="Blood glucose level in mg/dL")
    sugar_context: SugarContext = SugarContext.RANDOM
    weight_kg: Optional[float] = Field(None, ge=20, le=250, description="Body weight in kg")
    notes: Optional[str] = None
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class VoiceVitalParseRequest(BaseModel):
    voice_text: str = Field(..., min_length=2, description="Transcribed spoken health log in Hindi/English")


class VitalEntry(BaseModel):
    id: str
    timestamp: str
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    pulse: Optional[int] = None
    blood_sugar: Optional[float] = None
    sugar_context: SugarContext = SugarContext.RANDOM
    weight_kg: Optional[float] = None
    tier: VitalTier
    bp_tier: Optional[VitalTier] = None
    sugar_tier: Optional[VitalTier] = None
    jnc8_target_met: bool = Field(True, description="Whether BP meets JNC-8 target (<150/90 mmHg) for age 60+")
    is_anomaly: bool = False
    anomaly_reason: Optional[str] = None
    advisory: str
    urgent: bool = False
    notes: Optional[str] = None


class VitalsSummary(BaseModel):
    total_readings: int
    latest_reading: Optional[VitalEntry] = None
    avg_systolic: Optional[float] = None
    avg_diastolic: Optional[float] = None
    avg_pulse: Optional[float] = None
    avg_sugar: Optional[float] = None
    urgent_count: int = 0
    anomalies_count: int = 0
    readings: List[VitalEntry] = []
