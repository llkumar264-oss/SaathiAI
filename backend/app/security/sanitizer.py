"""Security sanitizer for file uploads and textual inputs."""

import html
import re
from typing import Tuple

# Magic byte signatures
ALLOWED_MAGIC_BYTES = {
    "jpeg": [b"\xFF\xD8\xFF"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "webp": [b"RIFF"],  # With WEBP at byte offset 8
    "pdf": [b"%PDF-"],
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_file_upload(filename: str, content: bytes) -> Tuple[bool, str, str]:
    """Validate uploaded file by size, extension, and magic bytes.

    Returns:
        (is_valid, detected_type, error_message)
    """
    if len(content) > MAX_FILE_SIZE_BYTES:
        return False, "", "File exceeds maximum permitted size of 10 MB."

    if not content:
        return False, "", "Uploaded file is empty."

    # Check magic bytes
    detected = None
    if content.startswith(b"\xFF\xD8\xFF"):
        detected = "image/jpeg"
    elif content.startswith(b"\x89PNG\r\n\x1a\n"):
        detected = "image/png"
    elif content.startswith(b"RIFF") and len(content) > 12 and content[8:12] == b"WEBP":
        detected = "image/webp"
    elif content.startswith(b"%PDF-"):
        detected = "application/pdf"

    if not detected:
        return False, "", "Invalid file format. Allowed formats: JPEG, PNG, WebP, PDF."

    return True, detected, ""


def sanitize_text(text: str) -> str:
    """Sanitize user text input against XSS and injection attacks.

    Escapes dangerous HTML tags while keeping natural language formatting.
    """
    if not text:
        return ""
    # Strip dangerous script/iframe tags
    cleaned = re.sub(r"<(script|iframe|object|embed)[^>]*>.*?</\1>", "", text, flags=re.IGNORECASE | re.DOTALL)
    # Escape remaining raw HTML
    return html.escape(cleaned, quote=False)


def redact_pii(text: str) -> str:
    """Redact sensitive PII from server logs (phone numbers, OTPs, Aadhaar, PAN)."""
    if not text:
        return ""
    # Redact 10-digit phone numbers
    redacted = re.sub(r"\b[6-9]\d{9}\b", "[PHONE_REDACTED]", text)
    # Redact 12-digit Aadhaar numbers
    redacted = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", "[AADHAAR_REDACTED]", redacted)
    # Redact 10-char PAN
    redacted = re.sub(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", "[PAN_REDACTED]", redacted)
    # Redact 4 or 6-digit OTPs
    redacted = re.sub(r"\b\d{4,6}\b", "[CODE_REDACTED]", redacted)
    return redacted
