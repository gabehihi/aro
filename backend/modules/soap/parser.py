"""Parse LLM JSON response with error recovery.

Handles common issues: code fences, partial JSON, missing fields.
"""

import json
import re
from typing import Any


def parse_soap_response(raw: str) -> dict[str, Any]:
    """Parse LLM response into structured SOAP dict.

    Handles:
    - ```json ... ``` code fences
    - Leading/trailing whitespace
    - Partial JSON recovery
    """
    text = raw.strip()

    # Remove code fences
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                return _empty_result(error=f"JSON 파싱 실패: {text[:200]}")
        else:
            return _empty_result(error=f"JSON 객체를 찾을 수 없음: {text[:200]}")

    if not isinstance(parsed, dict):
        return _empty_result(error="응답이 JSON 객체가 아님")

    return _normalize(parsed)


def _normalize(data: dict[str, Any]) -> dict[str, Any]:
    """Ensure all expected fields exist with correct types."""
    return {
        "subjective": data.get("subjective") or "",
        "objective": data.get("objective") or "",
        "assessment": data.get("assessment") or "",
        "plan": data.get("plan") or "",
        "vitals": data.get("vitals") or {},
        "kcd_codes": data.get("kcd_codes") or [],
        "labs": data.get("labs") or [],
        "health_promotion": data.get("health_promotion") or {},
        "unresolved_abbreviations": data.get("unresolved_abbreviations") or [],
        "warnings": data.get("warnings") or [],
    }


def _empty_result(error: str) -> dict[str, Any]:
    result = _normalize({})
    result["warnings"] = [error]
    return result
