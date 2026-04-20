"""Polypharmacy review API endpoints."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.llm.service import LLMService
from core.models.encounter import Encounter
from core.models.enums import UserRole
from core.models.patient import Patient
from core.models.prescription import Prescription
from core.models.user import User
from core.schemas.polypharmacy import (
    DDIFindingSchema,
    PolypharmacyPrefillResponse,
    PolypharmacyReviewRequest,
    PolypharmacyReviewResponse,
    RenalRecommendationSchema,
    SickDayAlertSchema,
    WarningSchema,
)
from core.security import require_role
from modules.polypharmacy.service import PolypharmacyService

router = APIRouter(prefix="/polypharmacy", tags=["polypharmacy"])

_service: PolypharmacyService | None = None


def _get_service() -> PolypharmacyService:
    global _service
    if _service is None:
        _service = PolypharmacyService(LLMService())
    return _service


def _calc_age(birth_date: date) -> int:
    today = date.today()
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )


def _calc_crcl(age: int, sex: str, weight_kg: float, serum_cr: float) -> float:
    """Cockcroft-Gault formula. Returns CrCl in mL/min."""
    crcl = (140 - age) * weight_kg / (72 * serum_cr)
    if sex == "F":
        crcl *= 0.85
    return round(crcl, 1)


@router.get(
    "/patients/{patient_id}/polypharmacy-prefill",
    response_model=PolypharmacyPrefillResponse,
    summary="약물검토 자동 프리필 (나이/성별/체중/신기능)",
)
async def get_polypharmacy_prefill(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor)),
) -> PolypharmacyPrefillResponse:
    """환자의 최근 encounter에서 신기능 관련 데이터를 자동 추출한다.

    반환 값: 나이, 성별, 체중(kg), 신장(cm), 혈청 Cr, eGFR, CrCl(Cockcroft-Gault).
    데이터가 부족하면 None으로 반환하고, 사용자가 수동 입력한다.
    """
    patient_result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = patient_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="환자를 찾을 수 없습니다")

    age = _calc_age(patient.birth_date)
    sex = patient.sex.value if patient.sex else None  # "M" | "F"

    enc_result = await db.execute(
        select(Encounter)
        .where(Encounter.patient_id == patient_id)
        .order_by(Encounter.encounter_date.desc())
        .limit(5)
    )
    encounters = list(enc_result.scalars().all())

    weight_kg: float | None = None
    height_cm: float | None = None
    serum_cr: float | None = None
    egfr: float | None = None

    for enc in encounters:
        vitals = enc.vitals or {}
        if weight_kg is None:
            bw = vitals.get("bw")
            try:
                weight_kg = float(bw) if bw not in (None, "", "0") else None
            except (ValueError, TypeError):
                pass
        if height_cm is None:
            bh = vitals.get("bh")
            try:
                height_cm = float(bh) if bh not in (None, "", "0") else None
            except (ValueError, TypeError):
                pass

        for lab in enc.labs or []:
            if not isinstance(lab, dict):
                continue
            name = str(lab.get("name") or "").strip().lower().replace(" ", "").replace("_", "")
            val = lab.get("value")
            if val is None:
                continue
            try:
                val_f = float(val)
            except (ValueError, TypeError):
                continue
            if serum_cr is None and name in ("cr", "creatinine"):
                serum_cr = val_f
            if egfr is None and name in ("egfr",):
                egfr = val_f

        if weight_kg and height_cm and serum_cr:
            break

    crcl: float | None = None
    if age and sex and weight_kg and serum_cr and serum_cr > 0:
        crcl = _calc_crcl(age, sex, weight_kg, serum_cr)

    return PolypharmacyPrefillResponse(
        age=age,
        sex=sex,
        weight_kg=weight_kg,
        height_cm=height_cm,
        serum_cr=serum_cr,
        egfr=egfr,
        crcl=crcl,
    )


@router.post("/review", response_model=PolypharmacyReviewResponse, summary="약물검토 리포트 생성")
async def review_polypharmacy(
    body: PolypharmacyReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor)),
) -> PolypharmacyReviewResponse:
    """DDI + 신기능 용량 조절 + Sick Day 통합 약물검토 리포트를 생성한다."""
    drug_inns: list[str] = []

    if body.drug_inns:
        drug_inns = body.drug_inns
    elif body.patient_id:
        result = await db.execute(
            select(Prescription).where(
                Prescription.patient_id == body.patient_id,
                Prescription.is_active.is_(True),
                Prescription.ingredient_inn.isnot(None),
            )
        )
        prescriptions = result.scalars().all()
        drug_inns = [p.ingredient_inn for p in prescriptions if p.ingredient_inn]

    labs = [lab.model_dump() for lab in body.labs]

    report = await _get_service().review(
        drug_inns=drug_inns,
        egfr=body.egfr,
        crcl=body.crcl,
        clinical_flags=body.clinical_flags,
        labs=labs,
    )

    return PolypharmacyReviewResponse(
        drug_inns=report.drug_inns,
        egfr=report.egfr,
        crcl=report.crcl,
        ddi_findings=[DDIFindingSchema(**f.__dict__) for f in report.ddi_findings],
        renal_recommendations=[
            RenalRecommendationSchema(**r.__dict__) for r in report.renal_recommendations
        ],
        sick_day_alerts=[SickDayAlertSchema(**a.__dict__) for a in report.sick_day_alerts],
        llm_summary=report.llm_summary,
        llm_meta=report.llm_meta,
        warnings=[WarningSchema(**w) for w in report.warnings],
    )
