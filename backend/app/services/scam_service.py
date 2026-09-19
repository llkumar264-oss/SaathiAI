"""Scam Shield Service combining ML inference, Gemini explanation, and family alerts."""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
import uuid

from backend.app.config import Settings, get_settings
from backend.app.ml.scam_detector import ScamDetector
from backend.app.services.guest_service import get_guest_session_data

logger = logging.getLogger("saathi.services.scam")

# In-memory store for safety history (scoped by user_id)
_USER_SCAM_LOGS: Dict[str, List[Dict[str, Any]]] = {}


class ScamService:
    """Service orchestrating message safety check, AI explanations, and family notification."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    async def check_message(
        self,
        text: str,
        user_id: str,
        is_guest: bool = False,
    ) -> Dict[str, Any]:
        """Check a message for fraud using the trained ML model + Gemini explanation."""
        # 1. Run ML model inference
        ml_result = await ScamDetector.predict(text)
        risk_score = ml_result["risk_score"]
        label = ml_result["label"]
        top_signals = ml_result["top_signals"]

        # 2. Generate Gemini Explanation (<= 3 simple sentences)
        explanation = await self._generate_explanation(text, risk_score, top_signals)

        log_id = f"scam_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        tier_display = (
            "High Risk (धोखाधड़ी)" if label == "scam"
            else "Suspicious (संदिग्ध)" if label == "suspicious"
            else "Safe (सुरक्षित)"
        )

        record = {
            "id": log_id,
            "user_id": user_id,
            "timestamp": now,
            "message_text": text,
            "risk_score": risk_score,
            "tier": tier_display,
            "signals": top_signals,
            "explanation": explanation,
            "family_alerted": False,
        }

        # 3. Save to history
        if is_guest:
            guest_data = get_guest_session_data(user_id)
            guest_data.setdefault("scam_history", []).insert(0, record)
        else:
            _USER_SCAM_LOGS.setdefault(user_id, []).insert(0, record)

        return record

    async def _generate_explanation(self, text: str, score: int, signals: List[str]) -> str:
        """Produce an empathetic <= 3 sentence explanation for senior citizens."""
        if self.settings.GEMINI_MOCK or not self.settings.GEMINI_API_KEY:
            # Deterministic clear explanation
            if score >= 70:
                return (
                    "यह एक खतरनाक धोखाधड़ी (Scam) का प्रयास प्रतीत होता है। "
                    "बैंक या सरकारी विभाग कभी भी इस तरह से तुरंत खाता बंद करने या बिजली काटने की धमकी नहीं देते। "
                    "किसी भी लिंक पर क्लिक न करें और न ही किसी को OTP या PIN बताएं।"
                )
            elif score >= 35:
                return (
                    "यह संदेश संदिग्ध लग रहा है। "
                    "कृपया किसी अनजान नंबर पर कॉल करने या लिंक खोलने से पहले घर के किसी सदस्य से पूछ लें। "
                    "अपनी कोई भी निजी बैंक जानकारी साझा न करें।"
                )
            else:
                return (
                    "यह एक सामान्य और सुरक्षित संदेश प्रतीत होता है। "
                    "फिर भी सावधानी के तौर पर अपना कोई भी गोपनीय पासवर्ड या OTP किसी के साथ शेयर न करें।"
                )

        # Live Gemini explanation
        from google import genai
        try:
            client = genai.Client(api_key=self.settings.GEMINI_API_KEY)
            prompt = (
                f"You are Saathi, explaining a scam check result to a 75-year-old Indian senior citizen. "
                f"The message is: '{text}'. Risk score: {score}/100. Signals: {', '.join(signals)}. "
                f"Write EXACTLY 2 or 3 short, warm, crystal-clear sentences in simple Hindi/Hinglish. "
                f"Explain simply why it is safe or dangerous, and what they should or shouldn't do. No technical jargon."
            )
            resp = await client.aio.models.generate_content(
                model=self.settings.GEMINI_MODEL,
                contents=prompt,
            )
            return resp.text.strip()
        except Exception as e:
            logger.warning("Error generating Gemini scam explanation: %s", e)
            return (
                "यह संदेश अत्यधिक जोखिम भरा है। "
                "कृपया कोई भी लिंक न खोलें और न ही किसी को OTP बताएं। "
                "मदद के लिए अपने परिवार को सूचित करें।"
            )

    def alert_family(self, log_id: str, user_id: str, is_guest: bool = False) -> Dict[str, Any]:
        """Mark scam log as family alerted and dispatch notice."""
        logs = (
            get_guest_session_data(user_id).get("scam_history", [])
            if is_guest
            else _USER_SCAM_LOGS.get(user_id, [])
        )

        for l in logs:
            if l["id"] == log_id:
                l["family_alerted"] = True
                break

        return {
            "success": True,
            "message": "आपके परिवार को इस संदिग्ध संदेश की सूचना भेज दी गई है।",
            "log_id": log_id,
        }

    def get_history(self, user_id: str, is_guest: bool = False) -> List[Dict[str, Any]]:
        """Retrieve safety history logs."""
        if is_guest:
            return get_guest_session_data(user_id).get("scam_history", [])
        return _USER_SCAM_LOGS.get(user_id, [])
