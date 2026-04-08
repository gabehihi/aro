"""Vital sign extraction from raw shorthand input using regex.

Pre-extracts vitals as ground-truth anchors before LLM processing.
Used by HallucinationGuard to cross-check LLM output.
"""

import re
from dataclasses import dataclass


@dataclass
class ExtractedVitals:
    sbp: float | None = None
    dbp: float | None = None
    hr: float | None = None
    bt: float | None = None
    rr: float | None = None
    spo2: float | None = None
    bw: float | None = None
    bh: float | None = None
    bmi: float | None = None

    def to_dict(self) -> dict[str, float | None]:
        return {
            "sbp": self.sbp,
            "dbp": self.dbp,
            "hr": self.hr,
            "bt": self.bt,
            "rr": self.rr,
            "spo2": self.spo2,
            "bw": self.bw,
            "bh": self.bh,
            "bmi": self.bmi,
        }

    def non_null_dict(self) -> dict[str, float]:
        return {k: v for k, v in self.to_dict().items() if v is not None}


# BP patterns: "BP 130/80", "혈압 130/80", "130/80mmHg"
_BP_PATTERNS = [
    re.compile(r"(?:BP|혈압|B\.P\.?)\s*(\d{2,3})\s*/\s*(\d{2,3})"),
    re.compile(r"(\d{2,3})\s*/\s*(\d{2,3})\s*(?:mmHg|mmhg)"),
]

# HR patterns: "HR 72", "맥박 72", "72bpm", "PR 72"
_HR_PATTERNS = [
    re.compile(r"(?:HR|PR|심박|맥박|심박수)\s*[:=]?\s*(\d{2,3})"),
    re.compile(r"(\d{2,3})\s*(?:bpm|BPM|회/분)"),
]

# BT patterns: "BT 36.5", "체온 36.5", "36.5도", "36.5°C"
_BT_PATTERNS = [
    re.compile(r"(?:BT|체온|B\.T\.?)\s*[:=]?\s*(\d{2}\.\d{1,2})"),
    re.compile(r"(\d{2}\.\d{1,2})\s*(?:도|℃|°C|°c)"),
]

# SpO2 patterns: "SpO2 98", "산소포화도 98", "O2sat 98"
_SPO2_PATTERNS = [
    re.compile(r"(?:SpO2|SaO2|O2sat|산소포화도|O2)\s*[:=]?\s*(\d{2,3})\s*%?"),
]

# RR patterns: "RR 18", "호흡수 18", "호흡 18회"
_RR_PATTERNS = [
    re.compile(r"(?:RR|호흡수|호흡)\s*[:=]?\s*(\d{1,2})"),
]

# BW patterns: "BW 72", "체중 72kg", "72kg"
_BW_PATTERNS = [
    re.compile(r"(?:BW|체중|B\.W\.?)\s*[:=]?\s*(\d{2,3}(?:\.\d{1,2})?)"),
    re.compile(r"(\d{2,3}(?:\.\d{1,2})?)\s*(?:kg|KG)"),
]

# BH patterns: "BH 170", "신장 170cm", "키 170"
_BH_PATTERNS = [
    re.compile(r"(?:BH|신장|키|B\.H\.?)\s*[:=]?\s*(\d{2,3}(?:\.\d{1,2})?)"),
    re.compile(r"(\d{2,3}(?:\.\d{1,2})?)\s*(?:cm|CM)"),
]

# BMI patterns: "BMI 24.5"
_BMI_PATTERNS = [
    re.compile(r"(?:BMI|비만도)\s*[:=]?\s*(\d{1,2}(?:\.\d{1,2})?)"),
]


def _first_match(patterns: list[re.Pattern], text: str) -> float | None:
    for pat in patterns:
        m = pat.search(text)
        if m:
            return float(m.group(1))
    return None


def extract_vitals(text: str) -> ExtractedVitals:
    """Extract vital signs from raw shorthand text using regex patterns."""
    vitals = ExtractedVitals()

    # BP (special: two capture groups)
    for pat in _BP_PATTERNS:
        m = pat.search(text)
        if m:
            vitals.sbp = float(m.group(1))
            vitals.dbp = float(m.group(2))
            break

    vitals.hr = _first_match(_HR_PATTERNS, text)
    vitals.bt = _first_match(_BT_PATTERNS, text)
    vitals.spo2 = _first_match(_SPO2_PATTERNS, text)
    vitals.rr = _first_match(_RR_PATTERNS, text)
    vitals.bw = _first_match(_BW_PATTERNS, text)
    vitals.bh = _first_match(_BH_PATTERNS, text)
    vitals.bmi = _first_match(_BMI_PATTERNS, text)

    return vitals
