"""Function calling tool definitions and Pydantic schemas for Saathi."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# Pydantic Schemas for Tool Arguments

class AddMedicineArgs(BaseModel):
    name: str = Field(..., description="Name of medicine, e.g. Amlodipine")
    dosage: str = Field(..., description="Dosage amount, e.g. 5mg, 500mg, 1 tablet")
    frequency: str = Field(..., description="Frequency, e.g. 'Once daily after breakfast'")
    timing: str = Field(..., description="Recommended scheduled time, e.g. '08:30'")
    purpose: Optional[str] = Field(default="", description="What the medicine is for in simple terms")


class MarkDoseTakenArgs(BaseModel):
    medicine_name: str = Field(..., description="Name of the medicine")
    status: str = Field(default="taken", description="'taken' or 'skipped'")
    reason: Optional[str] = Field(default=None, description="Optional reason if skipped")


class CreateReminderArgs(BaseModel):
    title: str = Field(..., description="Reminder description, e.g. 'Doctor appointment' or 'Pay electricity bill'")
    datetime_str: str = Field(..., description="Scheduled date and time, e.g. '2026-09-20 09:00'")
    category: str = Field(default="general", description="'medicine', 'appointment', 'bill', 'general'")


class LogVitalArgs(BaseModel):
    metric: str = Field(..., description="'bp', 'sugar', 'pulse', 'weight'")
    value1: float = Field(..., description="Primary metric: Systolic BP or Sugar level or Pulse")
    value2: Optional[float] = Field(default=None, description="Secondary metric: Diastolic BP")
    context: Optional[str] = Field(default="random", description="'fasting', 'post_meal', 'random', 'resting'")
    notes: Optional[str] = Field(default="", description="Any notes, e.g. 'Felt dizzy'")


class CheckMessageForScamArgs(BaseModel):
    message_text: str = Field(..., description="SMS, WhatsApp, or suspicious message to analyze")


class SimplifyDocumentArgs(BaseModel):
    document_id: Optional[str] = Field(default=None, description="ID of previously uploaded document")
    query: Optional[str] = Field(default=None, description="Specific question about the document")


class GetVitalsTrendArgs(BaseModel):
    metric: str = Field(..., description="'bp', 'sugar', 'pulse'")
    days: int = Field(default=7, description="Number of past days (e.g. 7 or 30)")


class NotifyFamilyArgs(BaseModel):
    message: str = Field(..., description="Information or alert to share with trusted family contacts")
    urgency: str = Field(default="normal", description="'normal', 'high', 'urgent'")


class StartTutorialArgs(BaseModel):
    topic: str = Field(..., description="Topic, e.g. 'upi_payment', 'whatsapp_video_call', 'digilocker', 'irctc'")


class PlayYouTubeVideoArgs(BaseModel):
    query: str = Field(..., description="Name of bhajan, aarti, mantra, or video to play on YouTube, e.g. 'हनुमान चालीसा', 'गायत्री मंत्र'")
    category: Optional[str] = Field(default="bhajan", description="'bhajan', 'aarti', 'mantra', 'geet', 'general'")


# Gemini Tool Declarations List
TOOL_DECLARATIONS = [
    {
        "name": "add_medicine",
        "description": "Add a new prescription or over-the-counter medicine to the user's daily routine.",
        "parameters": AddMedicineArgs.model_json_schema(),
    },
    {
        "name": "mark_dose_taken",
        "description": "Mark a medicine dose as taken or skipped for today.",
        "parameters": MarkDoseTakenArgs.model_json_schema(),
    },
    {
        "name": "create_reminder",
        "description": "Create a proactive notification reminder for a doctor visit, medicine, or bill due date.",
        "parameters": CreateReminderArgs.model_json_schema(),
    },
    {
        "name": "log_vital",
        "description": "Log a health vital measurement (Blood Pressure systolic/diastolic, Blood Sugar, or Pulse rate).",
        "parameters": LogVitalArgs.model_json_schema(),
    },
    {
        "name": "get_today_summary",
        "description": "Retrieve the summary of today's pending medicines, appointments, and wellness alerts.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "check_message_for_scam",
        "description": "Run the fraud & scam detection model on a suspicious SMS or WhatsApp message.",
        "parameters": CheckMessageForScamArgs.model_json_schema(),
    },
    {
        "name": "simplify_document",
        "description": "Simplify a confusing electricity bill, bank notice, or pension document.",
        "parameters": SimplifyDocumentArgs.model_json_schema(),
    },
    {
        "name": "get_vitals_trend",
        "description": "Get past trends and average readings for blood pressure or sugar.",
        "parameters": GetVitalsTrendArgs.model_json_schema(),
    },
    {
        "name": "notify_family",
        "description": "Send an update or anomaly alert to the user's trusted family circle.",
        "parameters": NotifyFamilyArgs.model_json_schema(),
    },
    {
        "name": "start_tutorial",
        "description": "Start an interactive step-by-step tutorial for technology (UPI, WhatsApp video call, tickets).",
        "parameters": StartTutorialArgs.model_json_schema(),
    },
    {
        "name": "play_youtube_video",
        "description": "Search and play devotional bhajans, aarti, mantras, or music videos on YouTube for senior citizens.",
        "parameters": PlayYouTubeVideoArgs.model_json_schema(),
    },
]


# Confirmation Card Helper
def create_confirmation_card(action_type: str, action_payload: Dict[str, Any], message: str) -> Dict[str, Any]:
    """Structure a user-facing confirmation card so state changes require explicit user approval."""
    return {
        "requires_confirmation": True,
        "action_type": action_type,
        "action_payload": action_payload,
        "message": message,
    }
