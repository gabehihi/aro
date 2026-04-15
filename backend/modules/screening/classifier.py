from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_DATA_DIR = Path(__file__).parent / "data"
_RANGES: dict = json.loads((_DATA_DIR / "lab_normal_ranges.json").read_text())

_OPS = {
    ">": lambda v, t: v > t,
    ">=": lambda v, t: v >= t,
    "<": lambda v, t: v < t,
    "<=": lambda v, t: v <= t,
}


class AbnormalClassifier:
    """Rule-based 3-tier lab abnormality classifier.

    Tiers: urgent | caution | normal
    Returns a list of finding dicts, one per recognized lab name.
    Unknown lab names are silently skipped.
    """

    def classify(
        self,
        results: dict[str, Any],
        sex: str = "M",
    ) -> list[dict[str, Any]]:
        findings: list[dict[str, Any]] = []
        for name, value in results.items():
            spec = _RANGES.get(name)
            if spec is None:
                continue
            tier = self._tier(spec, value, sex)
            findings.append(
                {
                    "name": name,
                    "value": value,
                    "unit": spec.get("unit", ""),
                    "tier": tier,
                    "ref_range": spec.get("ref_range", ""),
                    "message": self._message(name, value, spec.get("unit", ""), tier),
                }
            )
        return findings

    def _tier(self, spec: dict, value: Any, sex: str) -> str:
        if spec.get("sex_based"):
            spec = spec.get("male" if sex == "M" else "female", spec)

        if spec.get("ordinal"):
            return self._classify_ordinal(spec, value)

        tiers = spec.get("tiers", [])
        for rule in tiers:
            if rule["condition"] == "range":
                if rule["low"] <= float(value) <= rule["high"]:
                    return rule["tier"]
            else:
                op = _OPS.get(rule["condition"])
                if op and op(float(value), rule["value"]):
                    return rule["tier"]
        return "normal"

    def _classify_ordinal(self, spec: dict, value: Any) -> str:
        order: list[str] = spec["order"]
        tiers = spec["tiers"]
        try:
            idx = order.index(str(value).lower())
        except ValueError:
            return "normal"
        for rule in tiers:
            threshold_idx = order.index(rule["value"])
            if rule["condition"] == ">=" and idx >= threshold_idx:
                return rule["tier"]
            if rule["condition"] == "<" and idx < threshold_idx:
                return rule["tier"]
        return "normal"

    def _message(self, name: str, value: Any, unit: str, tier: str) -> str:
        tier_kor = {
            "urgent": "즉시 확인 필요",
            "caution": "주의 관찰 필요",
            "normal": "정상",
        }
        return f"{name} {value}{(' ' + unit) if unit else ''} — {tier_kor.get(tier, tier)}"
