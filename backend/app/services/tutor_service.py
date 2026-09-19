"""Tech Tutor Service (Step h).

Provides patient, empowering, senior-centric step-by-step guides for digital tasks.
Includes:
- Curated high-frequency Indian senior workflows (UPI, WhatsApp video, Bills, DigiLocker, Maps)
- Context-aware 'I am stuck on this step' helper
- Dynamic Gemini-powered tutorial generator for any digital topic
"""

import json
import logging
from typing import Any, Dict, List, Optional

from backend.app.ai.gemini_client import GeminiClient
from backend.app.schemas.tutor import (
    Tutorial,
    TutorialStep,
    TutorAskHelpResponse,
)

logger = logging.getLogger("saathi.services.tutor")

CURATED_TUTORIALS: List[Dict[str, Any]] = [
    {
        "id": "upi_payment",
        "title": "UPI या QR कोड से सुरक्षित भुगतान करना (Safe UPI Payment)",
        "category": "finance",
        "target_app": "GPay / PhonePe / Paytm",
        "difficulty": "आसान (Easy)",
        "language": "hi",
        "total_steps": 5,
        "steps": [
            {
                "step_number": 1,
                "title": "पेमेंट ऐप खोलें (Open App)",
                "description": "अपने फोन पर Google Pay, PhonePe या Paytm ऐप पर टैप करें और अपना फिंगरप्रिंट या स्क्रीन लॉक पिन दर्ज करें।",
                "tip": "ऐप खोलने के लिए इंटरनेट (WiFi या Mobile Data) चालू होना चाहिए।",
                "icon": "📱",
            },
            {
                "step_number": 2,
                "title": "QR कोड स्कैनर खोलें (Open Scanner)",
                "description": "स्क्रीन के ऊपरी हिस्से में बने 'Scan any QR code' (चौकोर स्कैनर निशान) पर टैप करें।",
                "tip": "अगर पहली बार खोल रहे हैं, तो कैमरा की अनुमति 'Allow' करें।",
                "icon": "📷",
            },
            {
                "step_number": 3,
                "title": "दुकानदार का QR कोड स्कैन करें (Scan QR)",
                "description": "फोन के कैमरे को दुकानदार के QR कोड के सामने रखें। फोन अपने आप नाम पहचान लेगा।",
                "tip": "स्क्रीन पर दुकानदार का नाम ध्यान से पढ़ें और सुनिश्चित करें कि यह सही व्यक्ति है।",
                "icon": "🔍",
            },
            {
                "step_number": 4,
                "title": "राशि (रुपये) दर्ज करें (Enter Amount)",
                "description": "जितने रुपये देने हैं, कीपैड से वह संख्या लिखें (जैसे ₹150) और 'Proceed to Pay' पर दबाएं।",
                "tip": "दुकानदार से पूछ लें कि राशि सही दर्ज हुई है या नहीं।",
                "icon": "💵",
            },
            {
                "step_number": 5,
                "title": "अपना गुप्त UPI PIN डालें (Enter UPI PIN)",
                "description": "केवल अब अपना 4 या 6 अंकों का गुप्त UPI पिन दर्ज करें और नीले टिक (✓) पर दबाएं।",
                "warning": "⚠️ कभी न भूलें: पैसे प्राप्त करने (Receive) के लिए कभी UPI PIN नहीं डालना पड़ता! पिन केवल पैसे कटवाने के लिए होता है।",
                "tip": "पिन डालते समय किसी अनजान व्यक्ति को फोन की स्क्रीन न देखने दें।",
                "icon": "🔒",
            },
        ],
    },
    {
        "id": "whatsapp_video",
        "title": "वॉट्सऐप पर वीडियो कॉल करना (WhatsApp Video Call)",
        "category": "communication",
        "target_app": "WhatsApp",
        "difficulty": "बहुत आसान (Very Easy)",
        "language": "hi",
        "total_steps": 4,
        "steps": [
            {
                "step_number": 1,
                "title": "WhatsApp खोलें (Open WhatsApp)",
                "description": "हरे रंग के WhatsApp आइकन पर टैप करें। आपके सामने हाल ही की चैट सूची खुल जाएगी।",
                "tip": "अगर चैट न दिखे, तो नीचे हरे रंग के संदेश वाले बटन पर दबाएं।",
                "icon": "💬",
            },
            {
                "step_number": 2,
                "title": "परिजन का नाम चुनें (Select Contact)",
                "description": "जिस परिजन या मित्र से बात करनी है (जैसे बेटा, बेटी, या पोता), उनके नाम पर टैप करें।",
                "tip": "ऊपर बने सर्च ग्लास (🔍) में उनका नाम लिखकर भी खोज सकते हैं।",
                "icon": "👤",
            },
            {
                "step_number": 3,
                "title": "वीडियो कैमरे के निशान पर दबाएं (Tap Video Icon)",
                "description": "स्क्रीन के सबसे ऊपर दाईं ओर बने छोटे वीडियो कैमरे (📹) के निशान पर टैप करें।",
                "tip": "फ़ोन पूछेगा 'Start video call?', तो 'Call' पर दबाएं।",
                "icon": "📹",
            },
            {
                "step_number": 4,
                "title": "चेहरे के सामने रखें और बात करें (Enjoy Conversation)",
                "description": "फोन को आंखों के सामने थोड़ी दूरी पर रखें। बात खत्म होने पर लाल रंग का गोल बटन दबाकर कॉल काटें।",
                "tip": "कमरे में अच्छी रोशनी हो ताकि आपका चेहरा साफ दिखे।",
                "icon": "😊",
            },
        ],
    },
    {
        "id": "utility_bill",
        "title": "घर बैठे बिजली या पानी का बिल भरना (Pay Utility Bills)",
        "category": "bills",
        "target_app": "GPay / PhonePe",
        "difficulty": "आसान (Easy)",
        "language": "hi",
        "total_steps": 4,
        "steps": [
            {
                "step_number": 1,
                "title": "Bills & Recharges सेक्शन में जाएं",
                "description": "Google Pay या PhonePe खोलें और 'Bills' के अंदर 'Electricity' (बिजली) पर टैप करें।",
                "icon": "💡",
            },
            {
                "step_number": 2,
                "title": "अपनी बिजली प्रदाता कंपनी चुनें (Select Provider)",
                "description": "सूची में से अपनी कंपनी चुनें (जैसे BSES Rajdhani, Tata Power Delhi, या UPPCL)।",
                "tip": "अपने पुराने कागज़ी बिल के ऊपरी हिस्से पर कंपनी का नाम लिखा होता है।",
                "icon": "🏢",
            },
            {
                "step_number": 3,
                "title": "उपभोक्ता संख्या (CA Number) डालें",
                "description": "अपने बिल से देखकर 'CA Number' या 'Consumer ID' दर्ज करें और 'Continue' दबाएं।",
                "tip": "ऐप अपने आप इस महीने का बकाया बिल और अंतिम तिथि दिखा देगा।",
                "icon": "🔢",
            },
            {
                "step_number": 4,
                "title": "राशि की पुष्टि करें और भुगतान करें (Pay)",
                "description": "नाम और राशि जांचें, फिर 'Pay' दबाकर अपना UPI PIN दर्ज करें। तुरंत रसीद मिल जाएगी।",
                "warning": "⚠️ किसी अनजान SMS में आए लिंक से बिल न भरें, केवल आधिकारिक पेमेंट ऐप से ही भरें।",
                "icon": "🧾",
            },
        ],
    },
    {
        "id": "digilocker_aadhaar",
        "title": "DigiLocker से आधार या ड्राइविंग लाइसेंस पाना (DigiLocker)",
        "category": "government",
        "target_app": "DigiLocker",
        "difficulty": "मध्यम (Medium)",
        "language": "hi",
        "total_steps": 4,
        "steps": [
            {
                "step_number": 1,
                "title": "DigiLocker ऐप में साइन इन करें",
                "description": "DigiLocker ऐप खोलें और अपने आधार से जुड़े मोबाइल नंबर और 6 अंकों के सुरक्षा पिन से लॉग इन करें।",
                "icon": "📂",
            },
            {
                "step_number": 2,
                "title": "खोज (Search) विकल्प चुनें",
                "description": "स्क्रीन के नीचे बने 'Search' बटन पर दबाएं और ऊपर सर्च बार में 'Aadhaar' लिखें।",
                "icon": "🔍",
            },
            {
                "step_number": 3,
                "title": "Unique Identification Authority (UIDAI) चुनें",
                "description": "Aadhaar Card पर टैप करें और अपने आधार से जुड़े नंबर पर आया 6-अंकों का OTP दर्ज करें।",
                "icon": "🆔",
            },
            {
                "step_number": 4,
                "title": "दस्तावेज़ सुरक्षित रखें (Access Anywhere)",
                "description": "अब आपका सरकारी वैध आधार 'Issued Documents' में जुड़ गया है। यह ट्रेन, एयरपोर्ट और बैंक में पूरी तरह मान्य है।",
                "icon": "✅",
            },
        ],
    },
    {
        "id": "google_maps",
        "title": "गूगल मैप्स पर अस्पताल या मंदिर का रास्ता देखना (Google Maps)",
        "category": "travel",
        "target_app": "Google Maps",
        "difficulty": "आसान (Easy)",
        "language": "hi",
        "total_steps": 4,
        "steps": [
            {
                "step_number": 1,
                "title": "Google Maps ऐप खोलें",
                "description": "रंग-बिरंगे पिन वाले Maps आइकन पर टैप करें। यह आपकी वर्तमान स्थिति नीले बिंदु से दिखाएगा।",
                "icon": "🗺️",
            },
            {
                "step_number": 2,
                "title": "गंतव्य बोलें या लिखें (Search Destination)",
                "description": "ऊपर बने सर्च बार में माइक के निशान (🎙️) पर दबाकर बोलें, जैसे 'AIIMS Hospital' या 'अक्षरधाम मंदिर'।",
                "icon": "🎙️",
            },
            {
                "step_number": 3,
                "title": "Directions (रास्ता) पर दबाएं",
                "description": "नीचे नीले रंग के 'Directions' बटन पर टैप करें। यह कार, बस और पैदल जाने का समय बताएगा।",
                "icon": "🧭",
            },
            {
                "step_number": 4,
                "title": "Start पर दबाएं और आवाज सुनें",
                "description": "'Start' दबाएं। फोन आपको हिंदी में बोलकर बताएगा कि कब दाएं मुड़ना है और कब बाएं।",
                "tip": "फोन की आवाज (Volume) तेज रखें ताकि कार या रास्ते में स्पष्ट सुनाई दे।",
                "icon": "🔊",
            },
        ],
    },
]


def list_tutorials() -> List[Dict[str, Any]]:
    """Return catalog of available tutorials."""
    return [
        {
            "id": t["id"],
            "title": t["title"],
            "category": t["category"],
            "target_app": t["target_app"],
            "difficulty": t["difficulty"],
            "total_steps": t["total_steps"],
            "language": t["language"],
        }
        for t in CURATED_TUTORIALS
    ]


def get_tutorial(tutorial_id: str) -> Optional[Tutorial]:
    """Retrieve full tutorial steps by ID."""
    for t in CURATED_TUTORIALS:
        if t["id"] == tutorial_id:
            steps = [TutorialStep(**s) for s in t["steps"]]
            return Tutorial(
                id=t["id"],
                title=t["title"],
                category=t["category"],
                target_app=t["target_app"],
                difficulty=t["difficulty"],
                total_steps=t["total_steps"],
                steps=steps,
                language=t.get("language", "hi"),
            )
    return None


async def get_stuck_help(
    tutorial_id: str,
    step_number: int,
    question: str,
    gemini_client: Optional[GeminiClient] = None,
) -> TutorAskHelpResponse:
    """Provide compassionate, reassuring assistance when a senior gets stuck on a step."""
    tut = get_tutorial(tutorial_id)
    step_info = ""
    if tut and 1 <= step_number <= len(tut.steps):
        target_step = tut.steps[step_number - 1]
        step_info = f"Current Step {target_step.step_number}: {target_step.title} - {target_step.description}"

    client = gemini_client or GeminiClient()

    if client.mock_mode:
        return TutorAskHelpResponse(
            answer=(
                f"चिंता मत कीजिए शर्मा जी! चरण {step_number} में स्क्रीन के नीचे ध्यान से देखें। "
                f"वहां एक नीला या हरा बटन दिखेगा। उस पर हल्के से अपनी उंगली छुएं। "
                f"अगर कोई पॉप-अप पूछे, तो 'Allow' या 'Theek Hai' पर दबाएं।"
            ),
            reassuring_note="आप बहुत अच्छा कर रहे हैं। तकनीक सीखना एक यात्रा है, हम आपके साथ हैं!",
        )

    prompt = f"""
You are Saathi, a gentle, patient tech companion for an Indian senior citizen (60-80 years old).
The senior is following a tutorial on: {tut.title if tut else tutorial_id}.
Current Step: {step_info}
The senior is stuck and asked: "{question}"

Instructions:
1. Speak in warm, respectful, reassuring Hindi/Hinglish (address them warmly, e.g. "शर्मा जी / आदरणीय").
2. Keep the answer extremely concrete, in 2 to 3 simple sentences. Tell them exactly where on their physical screen to look or touch.
3. No jargon (no 'UI/UX', 'navigation bar', 'cache'). Use simple terms like 'नीचे का बटन', 'हरा निशान'.
4. Conclude with a warm reassuring note.

Format output as JSON:
{{
  "answer": "...",
  "reassuring_note": "..."
}}
"""
    try:
        raw_res = await client.generate_text(prompt)
        # Parse JSON
        clean = raw_res.strip()
        if "```" in clean:
            clean = clean.split("```")[1].replace("json", "").strip()
        parsed = json.loads(clean)
        return TutorAskHelpResponse(
            answer=parsed.get("answer", "कृपया स्क्रीन के बीच में बने बटन पर टैप करें।"),
            reassuring_note=parsed.get("reassuring_note", "घबराएं नहीं, आप बहुत अच्छा सीख रहे हैं!"),
        )
    except Exception as exc:
        logger.warning("Gemini stuck assist failed: %s", exc)
        return TutorAskHelpResponse(
            answer=f"चरण {step_number} पर स्क्रीन के बीच में बने बटन पर ध्यान दें और एक बार धीरे से टैप करें।",
            reassuring_note="घबराएं नहीं! एक-एक कदम से सब आसान हो जाता है।",
        )


async def generate_custom_tutorial(
    topic: str,
    language: str = "hi",
    gemini_client: Optional[GeminiClient] = None,
) -> Tutorial:
    """Generate a custom, structured senior-friendly guide for any app or digital task."""
    client = gemini_client or GeminiClient()

    if client.mock_mode:
        steps = [
            TutorialStep(
                step_number=1,
                title=f"{topic} ऐप खोलें",
                description="अपने फोन की होम स्क्रीन से ऐप के आइकन पर हल्के से टैप करें।",
                tip="सुनिश्चित करें कि इंटरनेट चालू है।",
                icon="📱",
            ),
            TutorialStep(
                step_number=2,
                title="सर्च या मुख्य विकल्प चुनें",
                description="स्क्रीन के ऊपरी हिस्से में बने सर्च बार या माइक के निशान पर दबाएं।",
                tip="बोलकर भी अपनी पसंद बता सकते हैं।",
                icon="🔍",
            ),
            TutorialStep(
                step_number=3,
                title="पुष्टि करें और सुरक्षित रहें",
                description="जो विकल्प आपको चाहिए, उस पर टैप करें। किसी भी अनजान लिंक पर क्लिक न करें।",
                warning="⚠️ कभी भी किसी को अपना पासवर्ड या OTP न बताएं।",
                icon="🔒",
            ),
        ]
        return Tutorial(
            id=f"custom_{abs(hash(topic)) % 10000}",
            title=f"{topic} का सरल मार्गदर्शक",
            category="custom",
            target_app=topic,
            difficulty="आसान (Easy)",
            total_steps=len(steps),
            steps=steps,
            language=language,
        )

    prompt = f"""
Create a senior-friendly, step-by-step digital guide for Indian seniors (age 60-80) on: "{topic}".
Language: {language} (natural Hindi with common English words like 'App', 'Screen', 'Button').

Format strictly as JSON with this schema:
{{
  "id": "custom_guide",
  "title": "{topic} सीखने का सरल तरीका",
  "category": "custom",
  "target_app": "{topic}",
  "difficulty": "आसान (Easy)",
  "total_steps": 3,
  "steps": [
    {{
      "step_number": 1,
      "title": "...",
      "description": "...",
      "tip": "...",
      "icon": "📱",
      "warning": null
    }}
  ]
}}
"""
    try:
        raw_res = await client.generate_text(prompt)
        clean = raw_res.strip()
        if "```" in clean:
            clean = clean.split("```")[1].replace("json", "").strip()
        data = json.loads(clean)
        steps = [TutorialStep(**s) for s in data.get("steps", [])]
        return Tutorial(
            id=f"custom_{abs(hash(topic)) % 10000}",
            title=data.get("title", f"{topic} मार्गदर्शक"),
            category="custom",
            target_app=data.get("target_app", topic),
            difficulty="आसान (Easy)",
            total_steps=len(steps),
            steps=steps,
            language=language,
        )
    except Exception as exc:
        logger.error("Failed to generate custom tutorial: %s", exc)
        # Fallback to 3 safe steps
        fallback_steps = [
            TutorialStep(step_number=1, title="ऐप खोलें", description="अपने फोन में ऐप खोजकर खोलें।", icon="📱"),
            TutorialStep(step_number=2, title="विकल्प चुनें", description="स्क्रीन पर दिए गए मुख्य विकल्प पर टैप करें।", icon="👆"),
            TutorialStep(step_number=3, title="सुरक्षा का ध्यान रखें", description="कभी किसी को अपना गोपनीय पिन या ओटीपी न दें।", warning="⚠️ पिन हमेशा गोपनीय रखें।", icon="🔒"),
        ]
        return Tutorial(
            id=f"custom_{abs(hash(topic)) % 10000}",
            title=f"{topic} का सरल तरीका",
            category="custom",
            target_app=topic,
            total_steps=3,
            steps=fallback_steps,
            language=language,
        )
