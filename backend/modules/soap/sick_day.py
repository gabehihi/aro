"""Sick Day detection engine.

Scans SOAP text for sick-day trigger keywords, then cross-references
active prescriptions against a drug-action table to generate alerts.
"""

import re
from dataclasses import dataclass

# Trigger keywords indicating sick day conditions
SICK_DAY_KEYWORDS: list[tuple[str, str]] = [
    ("폐렴", "pneumonia"),
    ("탈수", "dehydration"),
    ("AKI", "acute kidney injury"),
    ("급성신손상", "acute kidney injury"),
    ("감염", "infection"),
    ("설사", "diarrhea"),
    ("구토", "vomiting"),
    ("발열", "fever"),
    ("수술", "surgery"),
    ("패혈증", "sepsis"),
    ("위장염", "gastroenteritis"),
    ("장폐색", "bowel obstruction"),
    ("고열", "high fever"),
    ("PNA", "pneumonia"),
    ("UTI", "urinary tract infection"),
]

# Drug class → action mapping
# Each entry: (ingredient patterns, action, reason)
DRUG_ACTION_TABLE: list[tuple[list[str], str, str]] = [
    (
        ["metformin", "메트포르민"],
        "HOLD",
        "유산산증 위험 (lactic acidosis risk)",
    ),
    (
        [
            "empagliflozin",
            "dapagliflozin",
            "canagliflozin",
            "sglt2",
            "엠파글리플로진",
            "다파글리플로진",
        ],
        "HOLD",
        "DKA/탈수 위험 (DKA/dehydration risk)",
    ),
    (
        [
            "ramipril",
            "enalapril",
            "perindopril",
            "lisinopril",
            "acei",
            "losartan",
            "valsartan",
            "telmisartan",
            "irbesartan",
            "olmesartan",
            "arb",
            "라미프릴",
            "에날라프릴",
            "페린도프릴",
            "로사르탄",
            "발사르탄",
            "텔미사르탄",
            "이르베사르탄",
        ],
        "HOLD",
        "급성신손상 악화 위험 (AKI worsening risk)",
    ),
    (
        [
            "furosemide",
            "hydrochlorothiazide",
            "hctz",
            "spironolactone",
            "indapamide",
            "푸로세미드",
            "하이드로클로로티아지드",
            "스피로노락톤",
            "이뇨제",
        ],
        "HOLD",
        "탈수 악화 위험 (dehydration worsening risk)",
    ),
    (
        [
            "ibuprofen",
            "naproxen",
            "diclofenac",
            "nsaid",
            "celecoxib",
            "meloxicam",
            "비스테로이드소염제",
            "이부프로펜",
            "나프록센",
        ],
        "HOLD",
        "신관류 감소 위험 (renal perfusion reduction risk)",
    ),
    (
        [
            "rivaroxaban",
            "apixaban",
            "dabigatran",
            "edoxaban",
            "doac",
            "리바록사반",
            "아픽사반",
            "다비가트란",
            "에독사반",
        ],
        "REDUCE",
        "출혈 위험 증가 (increased bleeding risk)",
    ),
    (
        ["digoxin", "디곡신"],
        "REDUCE",
        "독성 위험 증가 (toxicity risk)",
    ),
    (
        ["glimepiride", "gliclazide", "glipizide", "sulfonylurea", "글리메피리드", "글리클라지드"],
        "MONITOR",
        "저혈당 위험 (hypoglycemia risk)",
    ),
]


@dataclass
class SickDayAlert:
    drug_name: str
    ingredient: str
    action: str  # "HOLD", "REDUCE", "MONITOR"
    reason: str
    triggering_keyword: str


class SickDayDetector:
    """Detect sick day conditions and generate drug safety alerts."""

    def scan(
        self,
        soap_text: str,
        active_prescriptions: list[dict],
    ) -> list[SickDayAlert]:
        """Scan SOAP text for sick-day triggers and cross-check prescriptions.

        Args:
            soap_text: Combined S+O+A+P text
            active_prescriptions: List of dicts with keys:
                drug_name, ingredient_inn, atc_code (any may be None)

        Returns:
            List of SickDayAlert for each drug that needs attention
        """
        # Step 1: Find triggering keywords in text
        triggered_keywords = self._find_triggers(soap_text)
        if not triggered_keywords:
            return []

        # Step 2: Cross-reference prescriptions against drug action table
        alerts: list[SickDayAlert] = []
        first_trigger = triggered_keywords[0]

        for rx in active_prescriptions:
            drug_name = rx.get("drug_name") or ""
            ingredient = rx.get("ingredient_inn") or ""
            match_text = f"{drug_name} {ingredient}".lower()

            for patterns, action, reason in DRUG_ACTION_TABLE:
                if any(p.lower() in match_text for p in patterns):
                    alerts.append(
                        SickDayAlert(
                            drug_name=drug_name or ingredient,
                            ingredient=ingredient,
                            action=action,
                            reason=reason,
                            triggering_keyword=first_trigger,
                        )
                    )
                    break  # one alert per drug

        return alerts

    def _find_triggers(self, text: str) -> list[str]:
        found: list[str] = []
        text_lower = text.lower()
        for keyword, _eng in SICK_DAY_KEYWORDS:
            if re.search(re.escape(keyword.lower()), text_lower):
                found.append(keyword)
        return found


sick_day_detector = SickDayDetector()
