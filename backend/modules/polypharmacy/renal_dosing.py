from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class RenalDosingRecommendation:
    drug_inn: str
    egfr: float
    recommendation: str  # FULL_DOSE | REDUCE | AVOID | CONTRAINDICATED | NOT_IN_DB
    detail: str
    max_daily_dose: str | None
    monitoring: list[str] = field(default_factory=list)
    source: str | None = None


class RenalDosingChecker:
    def __init__(self, db: dict) -> None:
        self._db = {k.lower(): v for k, v in db.items()}

    def check(self, drug_inn: str, egfr: float) -> RenalDosingRecommendation:
        entry = self._db.get(drug_inn.lower())
        if not entry:
            return RenalDosingRecommendation(
                drug_inn=drug_inn,
                egfr=egfr,
                recommendation="NOT_IN_DB",
                detail="DB 미등록 약물 — PI 직접 확인 필요",
                max_daily_dose=None,
            )
        for adj in entry["dose_adjustments"]:
            min_e: float | None = adj.get("egfr_min")
            max_e: float | None = adj.get("egfr_max")
            in_range = (min_e is None or egfr >= min_e) and (max_e is None or egfr < max_e)
            if in_range:
                return RenalDosingRecommendation(
                    drug_inn=drug_inn,
                    egfr=egfr,
                    recommendation=adj["recommendation"],
                    detail=adj["detail"],
                    max_daily_dose=adj.get("max_daily_dose"),
                    monitoring=entry.get("monitoring", []),
                    source=entry.get("source"),
                )
        return RenalDosingRecommendation(
            drug_inn=drug_inn,
            egfr=egfr,
            recommendation="NOT_IN_DB",
            detail="eGFR 범위 매핑 없음 — PI 직접 확인 필요",
            max_daily_dose=None,
        )

    def check_all(self, drug_inns: list[str], egfr: float) -> list[RenalDosingRecommendation]:
        return [self.check(inn, egfr) for inn in drug_inns]


def load_renal_dosing_checker() -> RenalDosingChecker:
    data_path = Path(__file__).parent / "data" / "renal_dosing.json"
    with data_path.open(encoding="utf-8") as f:
        db: dict = json.load(f)
    return RenalDosingChecker(db)
