"""Polypharmacy review orchestration service.

Flow: DDI check → renal dosing check → sick day check → LLM summary
Rule engine results only — LLM generates interpretation text only, never DDI/dosing decisions.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from core.llm.service import LLMService
from modules.polypharmacy.ddi_checker import DDIFinding, load_ddi_checker
from modules.polypharmacy.renal_dosing import RenalDosingRecommendation, load_renal_dosing_checker
from modules.polypharmacy.sick_day_advanced import SickDayAlert, load_sick_day_checker

_CACHED_SYSTEM = """당신은 의사의 약물 처방 검토를 보조하는 AI입니다.
규칙:
- 룰 엔진 결과만 해석하고 요약하십시오.
- 새로운 DDI나 용량 판단을 절대 생성하지 마십시오.
- 수치와 사실만 기술하고 주관적 판단은 [의사 소견: ___]으로 표시하십시오.
- 한국어로 응답하십시오."""


@dataclass
class PolypharmacyReport:
    drug_inns: list[str]
    egfr: float | None
    ddi_findings: list[DDIFinding]
    renal_recommendations: list[RenalDosingRecommendation]
    sick_day_alerts: list[SickDayAlert]
    llm_summary: str
    llm_meta: dict
    warnings: list[dict] = field(default_factory=list)


class PolypharmacyService:
    def __init__(self, llm_service: LLMService) -> None:
        self._llm = llm_service
        self._ddi = load_ddi_checker()
        self._renal = load_renal_dosing_checker()
        self._sick_day = load_sick_day_checker()

    async def review(
        self,
        drug_inns: list[str],
        egfr: float | None,
        clinical_flags: list[str],
        labs: list[dict],
    ) -> PolypharmacyReport:
        """Run full polypharmacy review: DDI + renal dosing + sick day + LLM summary."""
        ddi_findings = self._ddi.check(drug_inns)
        renal_recs = self._renal.check_all(drug_inns, egfr) if egfr is not None else []
        sick_day_alerts = self._sick_day.check(drug_inns, clinical_flags, labs)

        summary, llm_meta = await self._summarize(
            drug_inns, ddi_findings, renal_recs, sick_day_alerts, egfr
        )

        warnings: list[dict] = []
        if any(f.severity in ("CONTRAINDICATED", "MAJOR") for f in ddi_findings):
            warnings.append(
                {
                    "type": "ddi",
                    "message": "심각한 약물 상호작용이 검출되었습니다. 의사 확인 필수.",
                    "severity": "error",
                }
            )
        if any(a.action == "HOLD" for a in sick_day_alerts):
            warnings.append(
                {
                    "type": "sick_day",
                    "message": "급성 상황에서 일시 중단이 필요한 약물이 있습니다.",
                    "severity": "error",
                }
            )

        return PolypharmacyReport(
            drug_inns=drug_inns,
            egfr=egfr,
            ddi_findings=ddi_findings,
            renal_recommendations=renal_recs,
            sick_day_alerts=sick_day_alerts,
            llm_summary=summary,
            llm_meta=llm_meta,
            warnings=warnings,
        )

    async def _summarize(
        self,
        drug_inns: list[str],
        ddi_findings: list[DDIFinding],
        renal_recs: list[RenalDosingRecommendation],
        sick_day_alerts: list[SickDayAlert],
        egfr: float | None,
    ) -> tuple[str, dict]:
        """Call LLM to generate human-readable summary of rule engine results."""
        rule_results = {
            "약물목록": drug_inns,
            "eGFR": egfr,
            "DDI검출": [
                {
                    "약물A": f.drug_a,
                    "약물B": f.drug_b,
                    "중증도": f.severity,
                    "처치": f.management,
                }
                for f in ddi_findings
            ],
            "신기능용량조절": [
                {"약물": r.drug_inn, "권고": r.recommendation, "상세": r.detail}
                for r in renal_recs
                if r.recommendation != "FULL_DOSE"
            ],
            "SickDay경보": [
                {"약물": a.drug_inn, "조치": a.action, "이유": a.reason} for a in sick_day_alerts
            ],
        }
        dynamic_system = (
            f"룰 엔진 검토 결과:\n{json.dumps(rule_results, ensure_ascii=False, indent=2)}\n\n"
            "위 결과를 의사가 이해하기 쉽게 3~5문장으로 요약하십시오."
        )

        resp = await self._llm.generate_with_cache(
            cached_system=_CACHED_SYSTEM,
            dynamic_system=dynamic_system,
            messages=[{"role": "user", "content": "약물검토 요약을 작성하십시오."}],
        )
        meta = {
            "model": resp.model,
            "cost_usd": resp.cost_usd,
            "latency_ms": resp.latency_ms,
            "input_tokens": resp.input_tokens,
            "output_tokens": resp.output_tokens,
            "cache_read_tokens": resp.cache_read_tokens,
        }
        return resp.content, meta
