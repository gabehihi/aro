"""Document-specific fact-checking guard.

Verifies LLM-generated document text against source data to detect:
- Numeric inconsistencies (fabricated values)
- Ungrounded diagnoses (not in patient record)
- Ungrounded tests (mentioning tests not performed)
- Missing doctor judgment placeholders
"""

import re

from core.llm.guards import GuardResult, GuardWarning
from core.models.enums import DocType

# Test keywords that require grounding in source data
_TEST_KEYWORDS: list[str] = [
    "CT",
    "MRI",
    "PET",
    "초음파",
    "X-ray",
    "내시경",
    "조직검사",
    "골밀도",
    "심전도",
    "심초음파",
    "폐기능",
]

# 4-digit years and calendar numbers to skip during numeric check
_YEAR_PATTERN = re.compile(r"\b(19|20)\d{2}\b")
# KCD code pattern: capital letter + 2 digits + optional decimal
_KCD_PATTERN = re.compile(r"\b[A-Z]\d{2}(?:\.\d+)?\b")
# All integers and floats in text
_NUMBER_PATTERN = re.compile(r"\b\d+(?:\.\d+)?\b")

# DocTypes that require [의사 소견:] placeholder
_PLACEHOLDER_REQUIRED: set[DocType] = {DocType.진단서, DocType.소견서}
# DocType that accepts [의뢰 사유:] as an alternative
_REFERRAL_PLACEHOLDER = "[의뢰 사유:"
_DOCTOR_PLACEHOLDER = "[의사 소견:"


def _extract_all_numbers(data: dict | list | str | int | float) -> set[float]:
    """Recursively extract all numeric values from nested structures.

    Args:
        data: Nested dict, list, or scalar value to extract numbers from.

    Returns:
        Set of all numeric values found, converted to float.
    """
    numbers: set[float] = set()
    if isinstance(data, dict):
        for v in data.values():
            numbers |= _extract_all_numbers(v)
    elif isinstance(data, list):
        for item in data:
            numbers |= _extract_all_numbers(item)
    elif isinstance(data, (int, float)) and not isinstance(data, bool):
        numbers.add(float(data))
    elif isinstance(data, str):
        for m in _NUMBER_PATTERN.finditer(data):
            numbers.add(float(m.group()))
    return numbers


class DocumentFactChecker:
    """Fact-checker for LLM-generated medical documents.

    Cross-references generated document text against structured source data
    to detect fabricated numbers, ungrounded diagnoses, missing test references,
    and incomplete doctor judgment placeholders.
    """

    def check(
        self,
        generated_text: str,
        source_data: dict,
        doc_type: DocType,
    ) -> GuardResult:
        """Orchestrate all fact-checking passes on generated document text.

        Args:
            generated_text: The LLM-generated document content to verify.
            source_data: Structured source dict containing patient/encounter data.
            doc_type: Type of medical document being checked.

        Returns:
            GuardResult with all accumulated warnings.
        """
        result = GuardResult()
        self._check_numeric_consistency(generated_text, source_data, result)
        self._check_diagnosis_grounding(generated_text, source_data, result)
        self._check_test_grounding(generated_text, source_data, result)
        self._check_placeholder_completeness(generated_text, doc_type, result)
        return result

    def _check_numeric_consistency(
        self,
        text: str,
        source_data: dict,
        result: GuardResult,
    ) -> None:
        """Flag numbers in generated text that cannot be traced to source data.

        Args:
            text: Generated document text.
            source_data: Structured source data dict.
            result: GuardResult to append warnings into.
        """
        source_numbers = _extract_all_numbers(source_data)
        year_positions: set[tuple[int, int]] = {
            (m.start(), m.end()) for m in _YEAR_PATTERN.finditer(text)
        }

        for match in _NUMBER_PATTERN.finditer(text):
            # Skip numbers that fall inside a year match span
            pos = (match.start(), match.end())
            if pos in year_positions:
                continue

            value = float(match.group())

            # Skip obvious calendar/page numbers: 1-31 range integers
            if value == int(value) and 1 <= value <= 31:
                continue

            # Check if value is within tolerance of any source number
            grounded = any(abs(value - s) <= 0.1 for s in source_numbers)
            if not grounded:
                result.warnings.append(
                    GuardWarning(
                        type="numeric_fabrication",
                        message=(f"수치 '{match.group()}': 원본 데이터에서 확인되지 않는 숫자"),
                        location=f"char:{match.start()}-{match.end()}",
                        severity="error",
                    )
                )

    def _check_diagnosis_grounding(
        self,
        text: str,
        source_data: dict,
        result: GuardResult,
    ) -> None:
        """Flag KCD codes in generated text that are not in patient records.

        Args:
            text: Generated document text.
            source_data: Structured source data dict.
            result: GuardResult to append warnings into.
        """
        # Collect known codes from encounter kcd_codes and patient chronic_diseases
        known_codes: set[str] = set()

        encounter = source_data.get("encounter") or {}
        for kcd in encounter.get("kcd_codes", []):
            code = kcd.get("code", "").upper()
            if code:
                known_codes.add(code)
                known_codes.add(code.split(".")[0])  # prefix without decimal

        patient = source_data.get("patient", {})
        for disease in patient.get("chronic_diseases", []):
            d = disease.upper()
            known_codes.add(d)
            known_codes.add(d.split(".")[0])

        for match in _KCD_PATTERN.finditer(text):
            code = match.group().upper()
            prefix = code.split(".")[0]
            if code not in known_codes and prefix not in known_codes:
                result.warnings.append(
                    GuardWarning(
                        type="ungrounded_diagnosis",
                        message=(f"진단코드 '{code}': 환자 기록에서 확인되지 않는 상병코드"),
                        location=f"char:{match.start()}-{match.end()}",
                        severity="warning",
                    )
                )

    def _check_test_grounding(
        self,
        text: str,
        source_data: dict,
        result: GuardResult,
    ) -> None:
        """Flag imaging/special tests mentioned in text but absent from source data.

        Args:
            text: Generated document text.
            source_data: Structured source data dict.
            result: GuardResult to append warnings into.
        """
        # Build a single string from all source_data text fields for lookup
        encounter = source_data.get("encounter") or {}
        source_text_parts: list[str] = []

        for key in ("objective", "assessment", "plan", "subjective"):
            val = encounter.get(key, "")
            if isinstance(val, str):
                source_text_parts.append(val)

        for lab in encounter.get("labs", []):
            source_text_parts.append(lab.get("name", ""))

        source_blob = " ".join(source_text_parts)

        for keyword in _TEST_KEYWORDS:
            if keyword in text and keyword not in source_blob:
                result.warnings.append(
                    GuardWarning(
                        type="ungrounded_test",
                        message=(f"검사 키워드 '{keyword}': 원본 진료 기록에 없는 검사가 언급됨"),
                        location="test_reference",
                        severity="error",
                    )
                )

    def _check_placeholder_completeness(
        self,
        text: str,
        doc_type: DocType,
        result: GuardResult,
    ) -> None:
        """Verify required doctor judgment placeholders are present.

        Args:
            text: Generated document text.
            doc_type: Type of document being checked.
            result: GuardResult to append warnings into.
        """
        if doc_type in _PLACEHOLDER_REQUIRED:
            if _DOCTOR_PLACEHOLDER not in text:
                result.warnings.append(
                    GuardWarning(
                        type="missing_placeholder",
                        message=(
                            f"'{doc_type}' 문서에 '[의사 소견:' 플레이스홀더가 없음 — "
                            "의사 판단 영역을 명시해야 합니다"
                        ),
                        location="document",
                        severity="warning",
                    )
                )
        elif doc_type == DocType.의뢰서:
            has_doctor = _DOCTOR_PLACEHOLDER in text
            has_referral = _REFERRAL_PLACEHOLDER in text
            if not has_doctor and not has_referral:
                result.warnings.append(
                    GuardWarning(
                        type="missing_placeholder",
                        message=("'의뢰서'에 '[의사 소견:' 또는 '[의뢰 사유:' 플레이스홀더가 없음"),
                        location="document",
                        severity="warning",
                    )
                )


document_fact_checker = DocumentFactChecker()
