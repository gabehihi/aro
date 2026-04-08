"""Hallucination Guard and Subjective Expression Filter.

4-layer validation:
1. Input structuring (vitals regex pre-extraction)
2. Prompt constraints (system prompt rules)
3. Code-level verification (this module)
4. Doctor confirmation (human-in-the-loop)
"""

import re
from dataclasses import dataclass, field


@dataclass
class GuardWarning:
    type: str  # "hallucination", "subjective_expression", "vital_mismatch", etc.
    message: str
    location: str  # section or field name
    severity: str  # "error", "warning"


@dataclass
class GuardResult:
    warnings: list[GuardWarning] = field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        return any(w.severity == "error" for w in self.warnings)


# Physiologically impossible vital ranges
_VITAL_BOUNDS: dict[str, tuple[float, float]] = {
    "sbp": (40, 300),
    "dbp": (20, 200),
    "hr": (20, 300),
    "bt": (30.0, 45.0),
    "rr": (4, 60),
    "spo2": (30, 100),
    "bmi": (8.0, 80.0),
}


class HallucinationGuard:
    """Verify LLM output against input data to detect fabricated content."""

    def check(
        self,
        raw_input: str,
        soap_result: dict,
        pre_extracted_vitals: dict[str, float | None] | None = None,
        patient_chronic_diseases: list[str] | None = None,
    ) -> GuardResult:
        result = GuardResult()

        # 1. Vital sign cross-check: pre-extracted vs LLM output
        if pre_extracted_vitals and soap_result.get("vitals"):
            self._check_vitals_match(pre_extracted_vitals, soap_result["vitals"], result)

        # 2. Vital range check: physiologically impossible values
        if soap_result.get("vitals"):
            self._check_vital_ranges(soap_result["vitals"], result)

        # 3. Unmentioned diagnosis check
        if soap_result.get("kcd_codes"):
            self._check_diagnoses(
                raw_input,
                soap_result["kcd_codes"],
                patient_chronic_diseases or [],
                result,
            )

        # 4. Unmentioned lab results
        if soap_result.get("labs"):
            self._check_labs(raw_input, soap_result["labs"], result)

        return result

    def _check_vitals_match(
        self,
        pre_extracted: dict[str, float | None],
        llm_vitals: dict[str, float | None],
        result: GuardResult,
    ) -> None:
        for key, pre_val in pre_extracted.items():
            if pre_val is None:
                continue
            llm_val = llm_vitals.get(key)
            if llm_val is None:
                continue
            if abs(pre_val - llm_val) > 0.5:
                result.warnings.append(
                    GuardWarning(
                        type="vital_mismatch",
                        message=(f"바이탈 '{key}' 불일치: 입력값={pre_val}, LLM출력={llm_val}"),
                        location=f"vitals.{key}",
                        severity="error",
                    )
                )

    def _check_vital_ranges(
        self,
        vitals: dict[str, float | None],
        result: GuardResult,
    ) -> None:
        for key, value in vitals.items():
            if value is None:
                continue
            bounds = _VITAL_BOUNDS.get(key)
            if bounds and not (bounds[0] <= value <= bounds[1]):
                result.warnings.append(
                    GuardWarning(
                        type="vital_out_of_range",
                        message=(
                            f"바이탈 '{key}'={value}: 생리학적 범위 {bounds[0]}~{bounds[1]} 벗어남"
                        ),
                        location=f"vitals.{key}",
                        severity="error",
                    )
                )

    def _check_diagnoses(
        self,
        raw_input: str,
        kcd_codes: list[dict],
        chronic_diseases: list[str],
        result: GuardResult,
    ) -> None:
        chronic_set = {d.upper() for d in chronic_diseases}
        for kcd in kcd_codes:
            code = kcd.get("code", "").upper()
            desc = kcd.get("description", "")
            # Check if the code or description appears in raw input or chronic diseases
            code_prefix = code.split(".")[0] if code else ""
            in_chronic = code_prefix in chronic_set or code in chronic_set
            in_input = (
                code.lower() in raw_input.lower()
                or desc in raw_input
                or code_prefix.lower() in raw_input.lower()
            )
            if not in_chronic and not in_input:
                result.warnings.append(
                    GuardWarning(
                        type="unmentioned_diagnosis",
                        message=(
                            f"진단 '{code} {desc}': 입력 또는 만성질환 목록에서 확인되지 않음"
                        ),
                        location="assessment",
                        severity="warning",
                    )
                )

    def _check_labs(
        self,
        raw_input: str,
        labs: list[dict],
        result: GuardResult,
    ) -> None:
        for lab in labs:
            name = lab.get("name", "")
            if name and name.lower() not in raw_input.lower():
                result.warnings.append(
                    GuardWarning(
                        type="unmentioned_lab",
                        message=f"검사 '{name}': 입력에서 언급되지 않은 검사 결과",
                        location="labs",
                        severity="error",
                    )
                )


# Subjective/judgmental expressions forbidden in medical AI output
_SUBJECTIVE_PATTERNS: list[tuple[str, str]] = [
    (r"양호", "양호"),
    (r"심각한", "심각한"),
    (r"다행히", "다행히"),
    (r"우려되는", "우려되는"),
    (r"뚜렷한", "뚜렷한"),
    (r"현저한", "현저한"),
    (r"좋은\s*(상태|결과|경과)", "좋은"),
    (r"나쁜\s*(상태|결과|경과)", "나쁜"),
    (r"호전", "호전"),
    (r"악화", "악화"),
    (r"안정적", "안정적"),
    (r"불안정", "불안정"),
    (r"위험한", "위험한"),
    (r"심한", "심한"),
    (r"경미한", "경미한"),
    (r"저하", "저하"),
    (r"적절한", "적절한"),
    (r"부적절한", "부적절한"),
    (r"충분한", "충분한"),
    (r"불충분한", "불충분한"),
    (r"만족스러운", "만족스러운"),
    (r"효과적", "효과적"),
    (r"비효과적", "비효과적"),
    (r"잘\s*조절", "잘 조절"),
    (r"조절\s*불량", "조절 불량"),
    (r"상당한", "상당한"),
    (r"현저히", "현저히"),
    (r"매우", "매우"),
    (r"상태가?\s*좋", "상태가 좋"),
    (r"상태가?\s*나쁘", "상태가 나쁘"),
]


class SubjectiveExpressionFilter:
    """Detect subjective/judgmental expressions that should not appear in AI output."""

    def scan(self, text: str) -> list[GuardWarning]:
        warnings: list[GuardWarning] = []
        for pattern, label in _SUBJECTIVE_PATTERNS:
            matches = list(re.finditer(pattern, text))
            for match in matches:
                warnings.append(
                    GuardWarning(
                        type="subjective_expression",
                        message=f"주관적 표현 감지: '{label}' (위치: {match.start()})",
                        location=f"char:{match.start()}-{match.end()}",
                        severity="warning",
                    )
                )
        return warnings


hallucination_guard = HallucinationGuard()
subjective_filter = SubjectiveExpressionFilter()
