"""Pydantic schemas for medicines, prescriptions, dose logs, and adherence."""

from typing import List, Optional
from pydantic import BaseModel, Field


class MedicineBase(BaseModel):
    name: str = Field(..., description="Medicine brand or generic name")
    dosage: str = Field(..., description="Strength or quantity (e.g. 5mg, 500mg, 1 tab)")
    frequency: str = Field(..., description="Frequency description (e.g. 'Once daily after breakfast')")
    timing: str = Field(default="08:30", description="Scheduled time(s) e.g. '08:30' or '08:30, 20:30'")
    purpose: str = Field(default="", description="Plain-language explanation of what this medicine is for")
    instructions: Optional[str] = Field(default="", description="Precautions or meal instructions")


class MedicineCreate(MedicineBase):
    pass


class MedicineResponse(MedicineBase):
    id: str
    user_id: str
    is_active: bool = True
    created_at: str


class PrescriptionExtractionResponse(BaseModel):
    medicines: List[MedicineBase] = Field(..., description="Structured list of extracted medicines")
    doctor_notes: Optional[str] = Field(default="", description="Any advice or special instructions extracted")
    extracted_date: Optional[str] = Field(default="", description="Date on prescription if found")


class DoseLogRequest(BaseModel):
    status: str = Field(..., description="'taken' or 'skipped'")
    scheduled_time: Optional[str] = Field(default=None, description="Time the dose was due")
    reason_skipped: Optional[str] = Field(default=None, description="Optional reason if dose was skipped")


class DoseLogResponse(BaseModel):
    id: str
    medicine_id: str
    medicine_name: str
    date: str
    scheduled_time: str
    status: str
    taken_at: Optional[str] = None
    reason_skipped: Optional[str] = None


class AdherenceStats(BaseModel):
    overall_adherence_percent: float = Field(..., description="Percentage of scheduled doses taken (0-100)")
    total_scheduled: int
    total_taken: int
    total_skipped: int
    missed_medicines: List[str] = Field(default_factory=list, description="Medicines that were missed/skipped")
