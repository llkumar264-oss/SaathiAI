"""Scam Detection ML Inference Engine.

Loads the trained TF-IDF + Classifier pipeline.
Runs inference asynchronously in a thread pool.
Combines calibrated ML probability with domain signal weights.
Enforces the safety floor: OTP / UPI-PIN requests are ALWAYS high risk (score >= 90).
"""

import asyncio
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional
import joblib

logger = logging.getLogger("saathi.ml.scam")

MODELS_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODELS_DIR / "scam_model.joblib"

_MODEL_INSTANCE = None


def get_scam_model():
    """Lazy singleton loader for the trained scam classifier."""
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is None:
        if MODEL_PATH.exists():
            try:
                _MODEL_INSTANCE = joblib.load(MODEL_PATH)
                logger.info("Loaded trained scam model from %s", MODEL_PATH)
            except Exception as e:
                logger.error("Failed to load scam model from %s: %s", MODEL_PATH, e)
        else:
            logger.warning("Scam model not found at %s. Inference will use heuristic fallback.", MODEL_PATH)
    return _MODEL_INSTANCE


def extract_top_signals(text: str) -> List[str]:
    """Identify key fraud triggers and behavioral indicators in the message."""
    lower = text.lower()
    signals = []

    # 1. OTP & PIN Requests (English & Hindi)
    if re.search(r"\b(otp|one time password|verification code|pin|upi pin|atm pin)\b|ओटीपी|पिन|कोड", lower):
        if re.search(r"\b(share|send|enter|tell|give|received|batao|daalein|mang raha)\b|डालें|बताएं|भेजें|साझा", lower):
            signals.append("OTP या UPI PIN मांगने का प्रयास (Asks for secret OTP/PIN)")
        else:
            signals.append("OTP / सुरक्षा कोड का उल्लेख (Mentions OTP)")

    # 2. Urgency & Disconnection / Block Threats
    if re.search(r"\b(tonight|immediately|24 hours|urgent|turant|aaj raat|kat jayegi|blocked|suspended|cut off|power cut)\b|काट दिया|बंद कर|तुरंत|आज रात|निलंबित", lower):
        signals.append("अत्यधिक जल्दबाजी या धमकी भरा लहजा (Urgent disconnect/block threat)")

    # 3. Bank / KYC Phishing
    if (
        re.search(r"\b(kyc|pan card|aadhaar|yono|sbi|hdfc|icici|pnb|bank account|debit card)\b|खाता|बैंक|पैन कार्ड|केवाईसी", lower)
        and re.search(r"\b(update|block|freeze|suspend|deactivate|link|verify)\b|बंद|ब्लॉक|अपडेट|लिंक", lower)
    ):
        signals.append("फ़र्ज़ी बैंक KYC / खाता बंद होने का दावा (Fake Bank KYC alert)")

    # 4. Digital Arrest & Police Extortion
    if re.search(r"\b(customs|trai|cbi|police|narcotics|digital arrest|parcel|illegal|arrest warrant)\b|गिरफ्तारी|पुलिस|कस्टम|डिजिटल अरेस्ट|वारंट", lower):
        signals.append("डिजिटल अरेस्ट या पुलिस पार्सल की धमकी (Digital Arrest / Extortion)")

    # 5. Lottery & Prize Claims
    if re.search(r"\b(kbc|lottery|winner|crorepati|prize|won|lucky draw|cashback|bonus)\b|लॉटरी|इनाम|विजेता|कैशबैक|बधाई", lower):
        signals.append("अविश्वसनीय लॉटरी या इनाम का लालच (Fake Lottery / Prize claim)")

    # 6. Remote Access / APK links
    if re.search(r"\b(anydesk|teamviewer|quicksupport|\.apk|download app)\b|ऐप डाउनलोड|कोड बताएं", lower):
        signals.append("फ़ोन का रिमोट कंट्रोल या ख़तरनाक ऐप (Remote Desktop / APK install)")

    # 7. Unverified Links
    if re.search(r"https?://|www\.|bit\.ly|\.cc|\.xyz|\.in\b", lower):
        signals.append("अज्ञात या संदिग्ध वेब लिंक (Unverified web link)")

    return signals


def _run_model_inference_sync(text: str) -> Dict[str, Any]:
    """Synchronous inference combining ML prediction with domain rules."""
    model = get_scam_model()
    signals = extract_top_signals(text)
    lower = text.lower()

    # Raw model probability
    raw_prob = 0.5
    if model is not None:
        try:
            probs = model.predict_proba([text])[0]
            raw_prob = float(probs[1])
        except Exception as err:
            logger.error("Error during model predict_proba: %s", err)
            raw_prob = 0.7 if len(signals) > 0 else 0.1

    # Scaled ML base score (0 to 100)
    score = int(round(raw_prob * 100))

    # Signal & Pattern Enhancements
    has_otp_ask = any("Asks for secret OTP/PIN" in s for s in signals) or bool(
        re.search(r"(share|enter|give|send|बताएं|डालें|भेजें).*(otp|pin|पिन|ओटीपी)", lower)
        or re.search(r"(otp|pin|पिन|ओटीपी).*(share|enter|give|send|बताएं|डालें|भेजें)", lower)
    )

    has_urgency = any("threat" in s.lower() or "लहजा" in s for s in signals)
    has_kyc = any("KYC" in s for s in signals)
    has_arrest = any("Arrest" in s for s in signals)
    has_lottery = any("Lottery" in s for s in signals)

    # Apply Domain Weights
    if has_otp_ask:
        # Strict prompt rule: Asking for OTP or UPI-PIN is ALWAYS high risk
        score = max(score, 95)
        if "OTP या UPI PIN मांगने का प्रयास (Asks for secret OTP/PIN)" not in signals:
            signals.insert(0, "OTP या UPI PIN मांगने का प्रयास (Asks for secret OTP/PIN)")

    elif has_urgency and (has_kyc or has_arrest or "bijli" in lower or "electricity" in lower):
        score = max(score, 88)

    elif has_kyc or has_arrest or has_lottery:
        score = max(score, 82)

    elif len(signals) >= 2:
        score = max(score, 76)

    # Safe message dampener: If zero suspicious signals are found and raw probability is moderate
    if not signals:
        score = min(score, 15)
        signals.append("सामान्य संदेश पैटर्न (Standard conversational structure)")

    # Bound score in [0, 100]
    score = max(0, min(100, score))

    # Determine qualitative tier
    if score >= 70:
        label = "scam"
    elif score >= 35:
        label = "suspicious"
    else:
        label = "safe"

    return {
        "risk_score": score,
        "label": label,
        "top_signals": signals,
    }


class ScamDetector:
    """Asynchronous wrapper for scam detection inference."""

    @staticmethod
    async def predict(text: str) -> Dict[str, Any]:
        """Run scam inference in thread pool to prevent blocking FastAPI."""
        return await asyncio.to_thread(_run_model_inference_sync, text)
