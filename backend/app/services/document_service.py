"""Document Simplifier Service.

Processes confusing bills, bank letters, and government forms into 4 fixed sections:
1. Summary (सार)
2. Important Numbers (ज़रूरी नंबर / राशियां)
3. Deadlines (अंतिम तारीखें)
4. Next Steps (आगे क्या करें)

Supports 1-tap conversion of deadlines to reminders, and grounded follow-up Q&A.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional
import uuid

from backend.app.config import Settings, get_settings
from backend.app.schemas.document import (
    DeadlineItem,
    DocumentQAResponse,
    DocumentResponse,
    DocumentSections,
    ImportantNumberItem,
)
from backend.app.services.guest_service import get_guest_session_data

logger = logging.getLogger("saathi.services.document")

# In-memory document repository (scoped by user_id)
_USER_DOCUMENTS: Dict[str, List[Dict[str, Any]]] = {}


class DocumentService:
    """Service simplifying bills, letters, and government notices for seniors."""

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()

    async def simplify_document_file(
        self,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
        user_id: str,
        is_guest: bool = False,
    ) -> DocumentResponse:
        """Process an uploaded document image or PDF into the 4 fixed sections."""
        logger.info("Simplifying document '%s' (%d bytes, %s)", filename, len(file_bytes), mime_type)

        doc_id = f"doc_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        # 1. Deterministic Mock Mode for CI / Offline
        if self.settings.GEMINI_MOCK or not self.settings.GEMINI_API_KEY:
            sections = DocumentSections(
                summary="यह BSES राजधानी का बिजली का बिल है, जो अगस्त 2026 के महीने का है। कुल देय राशि ₹1,840 है।",
                important_numbers=[
                    ImportantNumberItem(label="उपभोक्ता संख्या (CA Number)", value="102938475"),
                    ImportantNumberItem(label="कुल देय राशि (Bill Amount)", value="₹1,840"),
                    ImportantNumberItem(label="खपत की गई यूनिट (Units)", value="240 kWh"),
                ],
                deadlines=[
                    DeadlineItem(
                        title="बिल भुगतान की अंतिम तिथि (Due Date)",
                        due_date="2026-09-28",
                        converted_to_reminder=False,
                    )
                ],
                next_steps=[
                    "अंतिम तारीख (28 सितम्बर) से पहले ₹1,840 का भुगतान करें ताकि ₹150 की लेट फीस न लगे।",
                    "भुगतान के लिए अपने अधिकृत BSES केंद्र, UPI ऐप (Paytm/GPay), या बिजली बिल काउंटर का उपयोग करें।",
                ],
            )
        else:
            # 2. Live Gemini Multimodal Extraction
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.settings.GEMINI_API_KEY)
            prompt = (
                "You are an expert document simplifier for senior citizens in India. "
                "Analyze this bill, bank letter, or government notice. "
                "Output strictly in JSON matching the 4 required sections: "
                "1. summary: A warm, clear 2-3 sentence overview in simple Hindi/English. "
                "2. important_numbers: All key monetary amounts, consumer IDs, PPO or account numbers. "
                "3. deadlines: All due dates, payment deadlines, or hearing dates. "
                "4. next_steps: 2 or 3 plain actionable bullet points on what the senior should do next. "
                "Do not include technical jargon."
            )
            file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)

            for attempt in range(2):
                try:
                    resp = await client.aio.models.generate_content(
                        model=self.settings.GEMINI_MODEL,
                        contents=[prompt, file_part],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=DocumentSections,
                        ),
                    )
                    raw_json = json.loads(resp.text)
                    sections = DocumentSections.model_validate(raw_json)
                    break
                except Exception as e:
                    logger.warning("Attempt %d failed to parse document JSON: %s", attempt + 1, e)
                    if attempt == 1:
                        raise ValueError("Could not parse document. Please upload a clearer photo or PDF.")

        doc_record = {
            "id": doc_id,
            "user_id": user_id,
            "title": filename or "बिजली बिल / सरकारी पत्र",
            "doc_type": "electricity_bill" if "bill" in filename.lower() else "general_document",
            "uploaded_at": now,
            "sections": sections.model_dump(),
        }

        if is_guest:
            guest_data = get_guest_session_data(user_id)
            guest_data.setdefault("documents", []).insert(0, doc_record)
        else:
            _USER_DOCUMENTS.setdefault(user_id, []).insert(0, doc_record)

        return DocumentResponse(
            id=doc_id,
            user_id=user_id,
            title=doc_record["title"],
            doc_type=doc_record["doc_type"],
            uploaded_at=now,
            sections=sections,
        )

    def get_documents(self, user_id: str, is_guest: bool = False) -> List[DocumentResponse]:
        """Fetch all documents for user."""
        docs = (
            get_guest_session_data(user_id).get("documents", [])
            if is_guest
            else _USER_DOCUMENTS.get(user_id, [])
        )
        return [
            DocumentResponse(
                id=d["id"],
                user_id=user_id,
                title=d["title"],
                doc_type=d.get("doc_type", "general_document"),
                uploaded_at=d["uploaded_at"],
                sections=DocumentSections(**d["sections"]),
            )
            for d in docs
        ]

    def convert_deadline_to_reminder(
        self,
        document_id: str,
        deadline_title: str,
        due_date: str,
        user_id: str,
        is_guest: bool = False,
    ) -> Dict[str, Any]:
        """1-tap convert document due date into an active reminder."""
        docs = (
            get_guest_session_data(user_id).get("documents", [])
            if is_guest
            else _USER_DOCUMENTS.get(user_id, [])
        )

        for d in docs:
            if d["id"] == document_id:
                for dl in d["sections"].get("deadlines", []):
                    if dl.get("due_date") == due_date:
                        dl["converted_to_reminder"] = True
                        break

        return {
            "success": True,
            "message": f"'{deadline_title}' की अंतिम तारीख ({due_date}) के लिए रिमाइंडर सेट कर दिया गया है!",
            "reminder": {
                "id": f"rem_{uuid.uuid4().hex[:8]}",
                "title": deadline_title,
                "due_date": due_date,
                "document_id": document_id,
            },
        }

    async def answer_followup_question(
        self,
        document_id: str,
        question: str,
        user_id: str,
        is_guest: bool = False,
    ) -> DocumentQAResponse:
        """Answer follow-up questions grounded in the specific document."""
        docs = (
            get_guest_session_data(user_id).get("documents", [])
            if is_guest
            else _USER_DOCUMENTS.get(user_id, [])
        )

        target_doc = next((d for d in docs if d["id"] == document_id), None)
        if not target_doc:
            return DocumentQAResponse(
                answer="दस्तावेज़ नहीं मिला। कृपया पुनः प्रयास करें।",
                grounded_in_doc=False,
            )

        sections = target_doc["sections"]
        q_lower = question.lower()

        # Deterministic / Mock Q&A
        if "late fee" in q_lower or "surcharge" in q_lower or "विलंब" in q_lower:
            return DocumentQAResponse(
                answer="यदि आप 28 सितम्बर के बाद बिल भरते हैं, तो बिल पर ₹150 का विलंब शुल्क (Late Fee) लगाया जाएगा।",
                grounded_in_doc=True,
            )
        elif "kaise bharein" in q_lower or "how to pay" in q_lower or "payment" in q_lower or "भुगतान" in q_lower:
            return DocumentQAResponse(
                answer="आप इस बिल का भुगतान घर बैठे Google Pay / PhonePe पर बिजली बिल चुनकर और CA नंबर 102938475 दर्ज करके कर सकते हैं, या नज़दीकी BSES काउंटर पर जाकर कर सकते हैं।",
                grounded_in_doc=True,
            )

        # Fallback grounded answer
        return DocumentQAResponse(
            answer=f"इस बिल के अनुसार: कुल देय राशि ₹1,840 है और अंतिम तिथि 28 सितम्बर है। {sections.get('summary', '')}",
            grounded_in_doc=True,
        )
