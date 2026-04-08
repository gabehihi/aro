"""SOAP conversion orchestration service.

Flow: vitals pre-extraction → LLM call → parse → guard check → result
"""

import uuid
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.llm.guards import (
    GuardWarning,
    hallucination_guard,
    subjective_filter,
)
from core.llm.service import LLMResponse, LLMService, ModelTier
from core.models.encounter import Encounter
from core.models.patient import Patient
from core.models.prescription import Prescription
from modules.soap.codebook import codebook_service
from modules.soap.parser import parse_soap_response
from modules.soap.prompts import build_cached_system, build_dynamic_system
from modules.soap.sick_day import sick_day_detector
from modules.soap.vitals import extract_vitals


@dataclass
class SOAPResult:
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""
    vitals: dict = field(default_factory=dict)
    kcd_codes: list[dict] = field(default_factory=list)
    labs: list[dict] = field(default_factory=list)
    health_promotion: dict = field(default_factory=dict)
    unresolved_abbreviations: list[str] = field(default_factory=list)
    warnings: list[dict] = field(default_factory=list)
    sick_day_alerts: list[dict] = field(default_factory=list)
    llm_meta: dict = field(default_factory=dict)


class SOAPService:
    def __init__(self, llm_service: LLMService) -> None:
        self._llm = llm_service

    async def convert(
        self,
        raw_input: str,
        patient_id: uuid.UUID,
        visit_type: str,
        user_personal_codebook: dict | None,
        db: AsyncSession,
    ) -> SOAPResult:
        """Convert raw shorthand input to structured SOAP format."""
        # 1. Load patient context
        patient = await self._load_patient(patient_id, db)
        active_rxs = await self._load_active_prescriptions(patient_id, db)
        recent = await self._load_recent_encounters(patient_id, db)

        # 2. Pre-extract vitals (ground-truth anchors)
        extracted_vitals = extract_vitals(raw_input)

        # 3. Build prompts
        codebook_text = codebook_service.get_prompt_text(user_personal_codebook)
        cached_system = build_cached_system(codebook_text)
        dynamic_system = build_dynamic_system(
            chronic_diseases=patient.chronic_diseases or [],
            allergies=patient.allergies or [],
            active_prescriptions=[
                f"{rx.drug_name or rx.ingredient_inn} ({rx.dose or ''} {rx.frequency or ''})"
                for rx in active_rxs
            ],
            recent_encounters=[
                f"{enc.encounter_date.strftime('%Y-%m-%d')}: {enc.assessment or ''}".strip()
                for enc in recent
            ],
            visit_type=visit_type,
            today=date.today().isoformat(),
        )

        # 4. LLM call
        llm_response = await self._llm.generate_with_cache(
            cached_system=cached_system,
            dynamic_system=dynamic_system,
            messages=[{"role": "user", "content": raw_input}],
            model_tier=ModelTier.SONNET,
            max_tokens=4096,
            temperature=0.0,
        )

        # 5. Parse response
        parsed = parse_soap_response(llm_response.content)

        # 6. Hallucination guard
        guard_result = hallucination_guard.check(
            raw_input=raw_input,
            soap_result=parsed,
            pre_extracted_vitals=extracted_vitals.non_null_dict() or None,
            patient_chronic_diseases=patient.chronic_diseases or [],
        )

        # 7. Subjective expression filter
        all_text = " ".join(
            [
                parsed.get("subjective", ""),
                parsed.get("objective", ""),
                parsed.get("assessment", ""),
                parsed.get("plan", ""),
            ]
        )
        subj_warnings = subjective_filter.scan(all_text)

        # 8. Sick day detection
        rx_dicts = [
            {
                "drug_name": rx.drug_name,
                "ingredient_inn": rx.ingredient_inn,
                "atc_code": rx.atc_code,
            }
            for rx in active_rxs
        ]
        sick_alerts = sick_day_detector.scan(raw_input, rx_dicts)

        # 9. Combine warnings
        all_warnings = self._format_warnings(
            parsed.get("warnings", []),
            guard_result.warnings,
            subj_warnings,
        )

        return SOAPResult(
            subjective=parsed.get("subjective", ""),
            objective=parsed.get("objective", ""),
            assessment=parsed.get("assessment", ""),
            plan=parsed.get("plan", ""),
            vitals=parsed.get("vitals", {}),
            kcd_codes=parsed.get("kcd_codes", []),
            labs=parsed.get("labs", []),
            health_promotion=parsed.get("health_promotion", {}),
            unresolved_abbreviations=parsed.get("unresolved_abbreviations", []),
            warnings=all_warnings,
            sick_day_alerts=[
                {
                    "drug_name": a.drug_name,
                    "ingredient": a.ingredient,
                    "action": a.action,
                    "reason": a.reason,
                    "triggering_keyword": a.triggering_keyword,
                }
                for a in sick_alerts
            ],
            llm_meta=self._format_llm_meta(llm_response),
        )

    async def _load_patient(self, patient_id: uuid.UUID, db: AsyncSession) -> Patient:
        result = await db.execute(select(Patient).where(Patient.id == patient_id))
        patient = result.scalar_one_or_none()
        if not patient:
            msg = f"환자를 찾을 수 없습니다: {patient_id}"
            raise ValueError(msg)
        return patient

    async def _load_active_prescriptions(
        self, patient_id: uuid.UUID, db: AsyncSession
    ) -> list[Prescription]:
        result = await db.execute(
            select(Prescription).where(
                Prescription.patient_id == patient_id,
                Prescription.is_active.is_(True),
            )
        )
        return list(result.scalars().all())

    async def _load_recent_encounters(
        self,
        patient_id: uuid.UUID,
        db: AsyncSession,
        limit: int = 3,
    ) -> list[Encounter]:
        result = await db.execute(
            select(Encounter)
            .where(Encounter.patient_id == patient_id)
            .order_by(Encounter.encounter_date.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    def _format_warnings(
        llm_warnings: list[str],
        guard_warnings: list[GuardWarning],
        subj_warnings: list[GuardWarning],
    ) -> list[dict]:
        warnings: list[dict] = []
        for w in llm_warnings:
            warnings.append(
                {
                    "type": "llm",
                    "message": w,
                    "severity": "warning",
                }
            )
        for w in guard_warnings:
            warnings.append(
                {
                    "type": w.type,
                    "message": w.message,
                    "severity": w.severity,
                    "location": w.location,
                }
            )
        for w in subj_warnings:
            warnings.append(
                {
                    "type": w.type,
                    "message": w.message,
                    "severity": w.severity,
                    "location": w.location,
                }
            )
        return warnings

    @staticmethod
    def _format_llm_meta(response: LLMResponse) -> dict:
        return {
            "model": response.model,
            "latency_ms": response.latency_ms,
            "cost_usd": response.cost_usd,
            "input_tokens": response.input_tokens,
            "output_tokens": response.output_tokens,
            "cache_read_tokens": response.cache_read_tokens,
        }
