"""Parse LLM JSON response for document generation.

Handles common issues: code fences, partial JSON, missing fields.
Same recovery pattern as modules/soap/parser.py.
"""

import json
import re
from typing import Any


def parse_document_response(raw: str, doc_type: str) -> dict[str, Any]:
    """Parse LLM response into structured document dict.

    Args:
        raw: Raw LLM output string.
        doc_type: Document type for context in error messages.

    Returns:
        Parsed dict with document fields.
    """
    text = raw.strip()

    # Remove code fences
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                return _error_result(doc_type, f"JSON 파싱 실패: {text[:200]}")
        else:
            return _error_result(doc_type, f"JSON 객체를 찾을 수 없음: {text[:200]}")

    if not isinstance(parsed, dict):
        return _error_result(doc_type, "응답이 JSON 객체가 아님")

    return parsed


def _error_result(doc_type: str, error: str) -> dict[str, Any]:
    """Return a minimal dict with error information.

    Args:
        doc_type: Document type.
        error: Error description.

    Returns:
        Dict with title, generated_text placeholder, and error warnings.
    """
    return {
        "title": doc_type,
        "generated_text": "",
        "warnings": [error],
    }
