from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class RenalDosingRecommendation:
    drug_inn: str
    egfr: float | None
    crcl: float | None
    dosing_basis: str  # "eGFR" | "CrCl"
    recommendation: str  # FULL_DOSE | REDUCE | AVOID | CONTRAINDICATED | NOT_IN_DB
    detail: str
    max_daily_dose: str | None
    monitoring: list[str] = field(default_factory=list)
    source: str | None = None


class RenalDosingChecker:
    def __init__(self, db: dict) -> None:
        self._db = {k.lower(): v for k, v in db.items()}

    def check(
        self,
        drug_inn: str,
        egfr: float | None,
        crcl: float | None = None,
    ) -> RenalDosingRecommendation:
        entry = self._db.get(drug_inn.lower())
        if not entry:
            return RenalDosingRecommendation(
                drug_inn=drug_inn,
                egfr=egfr,
                crcl=crcl,
                dosing_basis="eGFR",
                recommendation="NOT_IN_DB",
                detail="DB 미등록 약물 — PI 직접 확인 필요",
                max_daily_dose=None,
            )

        dosing_basis: str = entry.get("dosing_basis", "eGFR")
        metric_value: float | None = crcl if dosing_basis == "CrCl" else egfr

        if metric_value is None:
            metric_label = "CrCl" if dosing_basis == "CrCl" else "eGFR"
            return RenalDosingRecommendation(
                drug_inn=drug_inn,
                egfr=egfr,
                crcl=crcl,
                dosing_basis=dosing_basis,
                recommendation="NOT_IN_DB",
                detail=f"{metric_label} 값 미입력 — 용량 조절 확인 불가. PI 직접 확인 필요",
                max_daily_dose=None,
                monitoring=entry.get("monitoring", []),
                source=entry.get("source"),
            )

        for adj in entry["dose_adjustments"]:
            if dosing_basis == "CrCl":
                min_val: float | None = adj.get("crcl_min")
                max_val: float | None = adj.get("crcl_max")
            else:
                min_val = adj.get("egfr_min")
                max_val = adj.get("egfr_max")

            in_range = (min_val is None or metric_value >= min_val) and (
                max_val is None or metric_value < max_val
            )
            if in_range:
                return RenalDosingRecommendation(
                    drug_inn=drug_inn,
                    egfr=egfr,
                    crcl=crcl,
                    dosing_basis=dosing_basis,
                    recommendation=adj["recommendation"],
                    detail=adj["detail"],
                    max_daily_dose=adj.get("max_daily_dose"),
                    monitoring=entry.get("monitoring", []),
                    source=entry.get("source"),
                )

        return RenalDosingRecommendation(
            drug_inn=drug_inn,
            egfr=egfr,
            crcl=crcl,
            dosing_basis=dosing_basis,
            recommendation="NOT_IN_DB",
            detail="범위 매핑 없음 — PI 직접 확인 필요",
            max_daily_dose=None,
        )

    def check_all(
        self,
        drug_inns: list[str],
        egfr: float | None,
        crcl: float | None = None,
    ) -> list[RenalDosingRecommendation]:
        return [self.check(inn, egfr, crcl) for inn in drug_inns]


def load_renal_dosing_checker() -> RenalDosingChecker:
    data_path = Path(__file__).parent / "data" / "renal_dosing.json"
    with data_path.open(encoding="utf-8") as f:
        db: dict = json.load(f)
    return RenalDosingChecker(db)
