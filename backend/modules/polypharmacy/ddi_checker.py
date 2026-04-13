from __future__ import annotations

import json
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path

_SEVERITY_ORDER: dict[str, int] = {
    "CONTRAINDICATED": 0,
    "MAJOR": 1,
    "MODERATE": 2,
    "MINOR": 3,
}


@dataclass
class DDIFinding:
    drug_a: str
    drug_b: str
    severity: str
    mechanism: str
    management: str
    clinic_note: str | None = None


class DDIChecker:
    def __init__(self, ddi_pairs: list[dict]) -> None:
        self._index: dict[tuple[str, str], dict] = {}
        for pair in ddi_pairs:
            a = pair["drug_a_inn"].lower()
            b = pair["drug_b_inn"].lower()
            self._index[(a, b)] = pair
            self._index[(b, a)] = pair

    def check(self, drug_inns: list[str]) -> list[DDIFinding]:
        normalized = [d.lower() for d in drug_inns]
        seen: set[str] = set()
        findings: list[DDIFinding] = []
        for a, b in combinations(normalized, 2):
            hit = self._index.get((a, b))
            if hit and hit["ddi_id"] not in seen:
                seen.add(hit["ddi_id"])
                findings.append(
                    DDIFinding(
                        drug_a=hit["drug_a_inn"],
                        drug_b=hit["drug_b_inn"],
                        severity=hit["severity"],
                        mechanism=hit["mechanism"],
                        management=hit["management"],
                        clinic_note=hit.get("clinic_note"),
                    )
                )
        return sorted(findings, key=lambda f: _SEVERITY_ORDER.get(f.severity, 99))


def load_ddi_checker() -> DDIChecker:
    data_path = Path(__file__).parent / "data" / "ddi_pairs.json"
    with data_path.open(encoding="utf-8") as f:
        pairs: list[dict] = json.load(f)
    return DDIChecker(pairs)
