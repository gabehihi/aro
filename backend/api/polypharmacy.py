"""Polypharmacy review API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.llm.service import LLMService
from core.models.enums import UserRole
from core.models.prescription import Prescription
from core.models.user import User
from core.schemas.polypharmacy import (
    DDIFindingSchema,
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
        clinical_flags=body.clinical_flags,
        labs=labs,
    )

    return PolypharmacyReviewResponse(
        drug_inns=report.drug_inns,
        egfr=report.egfr,
        ddi_findings=[DDIFindingSchema(**f.__dict__) for f in report.ddi_findings],
        renal_recommendations=[
            RenalRecommendationSchema(**r.__dict__) for r in report.renal_recommendations
        ],
        sick_day_alerts=[SickDayAlertSchema(**a.__dict__) for a in report.sick_day_alerts],
        llm_summary=report.llm_summary,
        llm_meta=report.llm_meta,
        warnings=[WarningSchema(**w) for w in report.warnings],
    )
