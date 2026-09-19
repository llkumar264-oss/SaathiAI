"""Morning Brief Service.

Generates and caches the personalized daily morning card for seniors:
- Warm greeting
- Weather from Open-Meteo
- Today's medicines and timings
- Missed dose follow-up alerts
- Appointments / reminders
- Wellness tip
- Safety tip
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from backend.app.services.guest_service import get_guest_session_data
from backend.app.services.medicine_service import MedicineService
from backend.app.services.weather_service import fetch_weather_forecast

logger = logging.getLogger("saathi.services.morning_brief")

# Daily brief cache: maps (user_id, date_str) -> brief dict
_BRIEF_CACHE: Dict[str, Dict[str, Any]] = {}

WELLNESS_TIPS = [
    "सुबह गुनगुने पानी में थोड़ा नींबू और शहद मिलाकर पीना पाचन और जोड़ों के लिए हितकारी होता है।",
    "नाश्ता करने के बाद 15-20 मिनट की धीमी और शांत चहलकदमी से रक्त शर्करा (Blood Sugar) नियंत्रित रहती है।",
    "दिन में हर 2 घंटे में एक गिलास पानी अवश्य पिएं, चाहे प्यास न भी लगे।",
    "दोपहर के भोजन में हरी पत्तेदार सब्ज़ियां और दही शामिल करने से शरीर में कैल्शियम बना रहता है।",
    "सोने से 1 घंटा पहले टीवी या मोबाइल स्क्रीन बंद करने से गहरी और शांतिपूर्ण नींद आती है।",
]

SAFETY_TIPS = [
    "क्या आप जानते हैं? कोई भी बैंक या सरकारी विभाग कभी भी फ़ोन पर या WhatsApp पर आपका 6-अंकों का UPI पिन या OTP नहीं मांगता।",
    "यदि बिजली बिल कटने का कोई धमकी भरा SMS आए, तो कभी दिए गए मोबाइल नंबर पर कॉल न करें। सीधे अपने बिजली बिल पर लिखे अधिकृत नंबर पर ही संपर्क करें।",
    "अपरिचित व्यक्ति के कहने पर अपने फ़ोन में AnyDesk, TeamViewer या कोई अनजान APK ऐप कभी डाउनलोड न करें।",
    "डिजिटल अरेस्ट जैसी कोई कानूनी प्रक्रिया नहीं होती। पुलिस या कस्टम कभी वीडियो कॉल पर पैसे की मांग नहीं करते।",
]


class MorningBriefService:
    """Service generating and caching the proactive daily Morning Brief."""

    def __init__(self, med_service: Optional[MedicineService] = None):
        self.med_service = med_service or MedicineService()

    async def get_or_generate_brief(
        self,
        user_id: str,
        display_name: str = "Sharma Ji",
        is_guest: bool = False,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """Fetch or create daily brief for today."""
        now = datetime.now(timezone.utc)
        today_str = now.date().isoformat()
        cache_key = f"{user_id}_{today_str}"

        if not force_refresh and cache_key in _BRIEF_CACHE:
            logger.info("Serving Morning Brief from cache for %s", user_id)
            return _BRIEF_CACHE[cache_key]

        # 1. Fetch real Open-Meteo Weather
        weather = await fetch_weather_forecast()

        # 2. Fetch today's medicines
        meds = self.med_service.get_medicines(user_id, is_guest)
        today_meds = [
            {
                "id": m.id,
                "name": m.name,
                "dosage": m.dosage,
                "timing": m.timing,
                "purpose": m.purpose,
            }
            for m in meds
        ]

        # 3. Check for missed doses from history (Connected Workflow 1)
        missed_doses: List[str] = []
        if is_guest:
            guest_data = get_guest_session_data(user_id)
            history = guest_data.get("dose_history", [])
            for h in history[-6:]:
                if h.get("status") == "skipped":
                    missed_doses.append(f"{h['medicine_name']} ({h.get('reason_skipped') or 'छूट गई'})")
        else:
            adh = self.med_service.get_adherence_stats(user_id, days=3, is_guest=False)
            missed_doses = adh.missed_medicines

        # 4. Appointments / Reminders
        appointments = [
            {
                "title": "डॉ. गुप्ता से क्लिनिक भेंट (Dr. Gupta Checkup)",
                "time": "कल सुबह 10:30 AM",
                "location": "अपोलो क्लिनिक, नई दिल्ली",
            }
        ]

        # 5. Tips rotation
        day_index = now.day
        wellness_tip = WELLNESS_TIPS[day_index % len(WELLNESS_TIPS)]
        safety_tip = SAFETY_TIPS[day_index % len(SAFETY_TIPS)]

        greeting = f"सुप्रभात, {display_name}!"

        brief = {
            "greeting": greeting,
            "date_display": now.strftime("%A, %d %B %Y"),
            "weather": weather,
            "today_meds": today_meds,
            "missed_doses": missed_doses,
            "appointments": appointments,
            "wellness_tip": wellness_tip,
            "safety_tip": safety_tip,
            "generated_at": now.isoformat(),
        }

        # Cache result
        _BRIEF_CACHE[cache_key] = brief
        return brief
