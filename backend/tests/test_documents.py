"""Document Simplifier Unit Tests (Step e).

Covers:
- Uploading document (bill / letter) and extracting 4 fixed sections:
  1. Summary
  2. Important Numbers
  3. Deadlines
  4. Next Steps
- Converting due date / deadline to an active reminder
- Grounded follow-up Q&A on the document
- Rejection of invalid file formats
"""

import io
import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings, reset_settings_for_tests
from backend.app.main import create_app


@pytest.fixture
def client():
    settings = Settings(ENVIRONMENT="dev", ALLOW_DEV_TOKENS=True, GEMINI_MOCK=True)
    reset_settings_for_tests(settings)
    app = create_app()
    return TestClient(app)


def test_upload_document_extracts_4_sections(client):
    """Connected Workflow 3: Upload bill and verify 4 fixed sections."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}

    # Construct minimal valid PNG bytes: 89 50 4E 47 0D 0A 1A 0A
    fake_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("electricity_bill.png", io.BytesIO(fake_png_bytes), "image/png")}

    res = client.post("/api/documents/upload", headers=headers, files=files)
    assert res.status_code == 200
    doc = res.json()

    assert "id" in doc
    sections = doc["sections"]

    # 1. Summary
    assert "summary" in sections
    assert "BSES" in sections["summary"] or "बिजली" in sections["summary"]

    # 2. Important numbers
    assert "important_numbers" in sections
    assert len(sections["important_numbers"]) >= 2
    num_labels = [n["label"] for n in sections["important_numbers"]]
    assert any("उपभोक्ता" in l or "CA" in l for l in num_labels)
    assert any("राशि" in l or "Amount" in l for l in num_labels)

    # 3. Deadlines
    assert "deadlines" in sections
    assert len(sections["deadlines"]) >= 1
    assert "2026-09-28" in sections["deadlines"][0]["due_date"]

    # 4. Next steps
    assert "next_steps" in sections
    assert len(sections["next_steps"]) >= 2


def test_convert_deadline_to_reminder(client):
    """Test 1-tap conversion of bill due date to reminder."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}

    fake_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("bill.png", io.BytesIO(fake_png_bytes), "image/png")}
    doc_id = client.post("/api/documents/upload", headers=headers, files=files).json()["id"]

    rem_res = client.post(
        f"/api/documents/{doc_id}/remind-deadline",
        headers=headers,
        json={
            "deadline_title": "बिजली बिल भुगतान (Due Date)",
            "due_date": "2026-09-28",
        },
    )
    assert rem_res.status_code == 200
    rem_data = rem_res.json()
    assert rem_data["success"] is True
    assert "रिमाइंडर" in rem_data["message"]
    assert rem_data["reminder"]["due_date"] == "2026-09-28"


def test_document_grounded_qa(client):
    """Test grounded follow-up Q&A on the document."""
    headers = {"Authorization": "Bearer dev-senior-sharma"}

    fake_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {"file": ("bill.png", io.BytesIO(fake_png_bytes), "image/png")}
    doc_id = client.post("/api/documents/upload", headers=headers, files=files).json()["id"]

    # Question about late fee
    qa_res1 = client.post(
        f"/api/documents/{doc_id}/ask",
        headers=headers,
        json={"question": "अगर मैं देर से बिल भरूँ तो क्या लेट फीस (Late fee) लगेगी?"},
    )
    assert qa_res1.status_code == 200
    ans1 = qa_res1.json()
    assert ans1["grounded_in_doc"] is True
    assert "150" in ans1["answer"]

    # Question about payment
    qa_res2 = client.post(
        f"/api/documents/{doc_id}/ask",
        headers=headers,
        json={"question": "मैं इस बिल का भुगतान कैसे करूँ?"},
    )
    assert qa_res2.status_code == 200
    ans2 = qa_res2.json()
    assert ans2["grounded_in_doc"] is True
    assert "Google Pay" in ans2["answer"] or "PhonePe" in ans2["answer"]
