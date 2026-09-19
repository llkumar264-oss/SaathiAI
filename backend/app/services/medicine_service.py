"""Medicine and Prescription Extraction Service."""

from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional
import uuid

from backend.app.config import Settings, get_settings
from backend.app.schemas.medicine import (
    AdherenceStats,
    DoseLogRequest,
    DoseLogResponse,
    MedicineBase,
    MedicineCreate,
    MedicineResponse,
    PrescriptionExtractionResponse,
)
from backend.app.services.guest_service import get_guest_session_data

logger = logging.getLogger("saathi.services.medicine")

# In-memory repository for regular users (scoped by user_id)
_USER_MEDICINES: Dict[str, List[Dict[str, Any]]] = {}
_USER_DOSE_LOGS: Dict[str, List[Dict[str, Any]]] = {}


class MedicineService:
    """Service handling medicine routine schedules, dose tracking, and prescription vision."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    async def extract_prescription_from_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
    ) -> PrescriptionExtractionResponse:
        """Use Gemini multimodal vision to extract structured medicine details from a photo."""
        logger.info("Extracting prescription with Gemini Vision (bytes: %d, mime: %s)", len(image_bytes), mime_type)

        # 1. Deterministic Mock Mode for CI / Offline
        if self.settings.GEMINI_MOCK or not self.settings.GEMINI_API_KEY:
            return PrescriptionExtractionResponse(
                medicines=[
                    MedicineBase(
                        name="Amlodipine (एम्लोडिपिन)",
                        dosage="5mg",
                        frequency="Once daily - Morning after breakfast",
                        timing="08:30",
                        purpose="रक्तचाप (Blood Pressure) नियंत्रण",
                        instructions="नाश्ते के बाद पानी के साथ लें।",
                    ),
                    MedicineBase(
                        name="Metformin (मेटफॉर्मिन)",
                        dosage="500mg",
                        frequency="Twice daily - Morning & Evening",
                        timing="09:00, 20:30",
                        purpose="ब्लड शुगर (Diabetes) नियंत्रण",
                        instructions="भोजन के साथ लें।",
                    ),
                    MedicineBase(
                        name="Pantoprazole (पैंटोप्रैजोल)",
                        dosage="40mg",
                        frequency="Once daily - Morning empty stomach",
                        timing="07:30",
                        purpose="गैस और एसिडिटी से राहत",
                        instructions="सुबह खाली पेट आधा गिलास पानी से लें।",
                    ),
                ],
                doctor_notes="नमक कम खाएं, सुबह 20 मिनट टहलें।",
                extracted_date=datetime.now(timezone.utc).strftime("%d-%m-%Y"),
            )

        # 2. Live Multimodal Extraction with google-genai
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.settings.GEMINI_API_KEY)
        prompt = (
            "You are a medical prescription digitizer for senior citizens in India. "
            "Extract all prescribed medicines with their strength, dosage, frequency, recommended timings, "
            "and explain in simple everyday Hindi/English what each medicine is for. "
            "Respond strictly in JSON matching the requested schema."
        )

        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        for attempt in range(2):
            try:
                response = await client.aio.models.generate_content(
                    model=self.settings.GEMINI_MODEL,
                    contents=[prompt, image_part],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=PrescriptionExtractionResponse,
                    ),
                )
                raw_json = json.loads(response.text)
                return PrescriptionExtractionResponse.model_validate(raw_json)
            except Exception as e:
                logger.warning("Attempt %d failed parsing prescription JSON: %s", attempt + 1, e)
                if attempt == 1:
                    raise ValueError("Could not extract structured medicines from prescription photo. Please try a clearer image.")

        raise ValueError("Prescription extraction failed.")

    def get_medicines(self, user_id: str, is_guest: bool = False) -> List[MedicineResponse]:
        """Fetch active medicines for user."""
        if is_guest:
            guest_data = get_guest_session_data(user_id)
            meds = guest_data.get("medicines", [])
            return [
                MedicineResponse(
                    id=m["id"],
                    user_id=user_id,
                    name=m["name"],
                    dosage=m["dosage"],
                    frequency=m["frequency"],
                    timing=m["timing"],
                    purpose=m.get("purpose", ""),
                    instructions=m.get("instructions", ""),
                    is_active=m.get("is_active", True),
                    created_at=m.get("created_at", datetime.now(timezone.utc).isoformat()),
                )
                for m in meds
            ]

        raw_list = _USER_MEDICINES.get(user_id, [])
        return [MedicineResponse(**m) for m in raw_list if m.get("is_active", True)]

    def add_medicine(self, user_id: str, med_in: MedicineCreate, is_guest: bool = False) -> MedicineResponse:
        """Add a confirmed medicine to schedule."""
        med_id = f"med_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        med_dict = {
            "id": med_id,
            "user_id": user_id,
            "name": med_in.name,
            "dosage": med_in.dosage,
            "frequency": med_in.frequency,
            "timing": med_in.timing,
            "purpose": med_in.purpose,
            "instructions": med_in.instructions or "",
            "is_active": True,
            "created_at": now,
        }

        if is_guest:
            guest_data = get_guest_session_data(user_id)
            guest_data.setdefault("medicines", []).append(med_dict)
        else:
            _USER_MEDICINES.setdefault(user_id, []).append(med_dict)

        return MedicineResponse(**med_dict)

    def log_dose(
        self,
        user_id: str,
        medicine_id: str,
        log_req: DoseLogRequest,
        is_guest: bool = False,
    ) -> DoseLogResponse:
        """Mark a scheduled dose as taken or skipped."""
        now = datetime.now(timezone.utc)
        log_id = f"log_{uuid.uuid4().hex[:8]}"
        today_date = now.date().isoformat()
        scheduled_time = log_req.scheduled_time or now.strftime("%H:%M")

        # Find medicine name
        med_name = "Medicine"
        meds = self.get_medicines(user_id, is_guest)
        for m in meds:
            if m.id == medicine_id:
                med_name = m.name
                break

        log_dict = {
            "id": log_id,
            "medicine_id": medicine_id,
            "medicine_name": med_name,
            "date": today_date,
            "scheduled_time": scheduled_time,
            "status": log_req.status,
            "taken_at": now.isoformat() if log_req.status == "taken" else None,
            "reason_skipped": log_req.reason_skipped,
        }

        if is_guest:
            guest_data = get_guest_session_data(user_id)
            guest_data.setdefault("dose_history", []).append(log_dict)
        else:
            _USER_DOSE_LOGS.setdefault(user_id, []).append(log_dict)

        return DoseLogResponse(**log_dict)

    def get_adherence_stats(self, user_id: str, days: int = 7, is_guest: bool = False) -> AdherenceStats:
        """Calculate adherence % over the given number of days."""
        if is_guest:
            guest_data = get_guest_session_data(user_id)
            dose_logs = guest_data.get("dose_history", [])
        else:
            dose_logs = _USER_DOSE_LOGS.get(user_id, [])

        if not dose_logs:
            return AdherenceStats(
                overall_adherence_percent=100.0,
                total_scheduled=0,
                total_taken=0,
                total_skipped=0,
                missed_medicines=[],
            )

        taken_count = sum(1 for d in dose_logs if d.get("status") == "taken")
        skipped_count = sum(1 for d in dose_logs if d.get("status") == "skipped")
        total_scheduled = len(dose_logs)

        percent = round((taken_count / total_scheduled) * 100.0, 1) if total_scheduled > 0 else 100.0
        missed = list({d["medicine_name"] for d in dose_logs if d.get("status") == "skipped"})

        return AdherenceStats(
            overall_adherence_percent=percent,
            total_scheduled=total_scheduled,
            total_taken=taken_count,
            total_skipped=skipped_count,
            missed_medicines=missed,
        )
