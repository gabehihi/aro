import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.llm.service import LLMService
from core.models.encounter import Encounter
from core.models.patient import Patient
from core.models.user import User
from core.schemas.encounter import (
    ClinicalSummaryResponse,
    EncounterCreate,
    EncounterListResponse,
    EncounterResponse,
    EncounterUpdate,
    HealthPromotionSchema,
    KCDCodeSchema,
    LabSchema,
    LLMMetaSchema,
    SickDayAlertSchema,
    SOAPRequest,
    SOAPResponse,
    VitalsSchema,
    WarningSchema,
)
from core.security import get_current_user
from modules.soap.service import SOAPService

router = APIRouter(tags=["encounters"])

_soap_service: SOAPService | None = None


def _get_soap_service() -> SOAPService:
    global _soap_service
    if _soap_service is None:
        _soap_service = SOAPService(LLMService())
    return _soap_service


@router.post("/soap/convert", response_model=SOAPResponse)
async def convert_soap(
    body: SOAPRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SOAPResponse:
    """AI SOAP 변환 (미리보기, 저장하지 않음)."""
    service = _get_soap_service()
    try:
        result = await service.convert(
            raw_input=body.raw_input,
            patient_id=body.patient_id,
            visit_type=body.visit_type,
            user_personal_codebook=current_user.personal_codebook,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e

    return SOAPResponse(
        subjective=result.subjective,
        objective=result.objective,
        assessment=result.assessment,
        plan=result.plan,
        vitals=VitalsSchema(**result.vitals) if result.vitals else VitalsSchema(),
        kcd_codes=[KCDCodeSchema(**c) for c in result.kcd_codes],
        labs=[LabSchema(**la) for la in result.labs],
        health_promotion=(
            HealthPromotionSchema(**result.health_promotion)
            if result.health_promotion
            else HealthPromotionSchema()
        ),
        unresolved_abbreviations=result.unresolved_abbreviations,
        warnings=[WarningSchema(**w) for w in result.warnings],
        sick_day_alerts=[SickDayAlertSchema(**a) for a in result.sick_day_alerts],
        llm_meta=LLMMetaSchema(**result.llm_meta) if result.llm_meta else LLMMetaSchema(),
    )


@router.post(
    "/encounters",
    response_model=EncounterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_encounter(
    body: EncounterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EncounterResponse:
    """의사 확인 후 진료 기록 저장."""
    # Verify patient exists
    patient_result = await db.execute(select(Patient).where(Patient.id == body.patient_id))
    if not patient_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="환자를 찾을 수 없습니다",
        )

    encounter = Encounter(
        patient_id=body.patient_id,
        encounter_date=body.encounter_date,
        raw_input=body.raw_input,
        visit_type=body.visit_type,
        subjective=body.subjective,
        objective=body.objective,
        assessment=body.assessment,
        plan=body.plan,
        vitals=body.vitals,
        kcd_codes=body.kcd_codes,
        labs=body.labs,
        health_promotion=body.health_promotion,
        referral_flag=body.referral_flag,
        external_referral_note=body.external_referral_note,
        next_visit_date=body.next_visit_date,
        next_visit_tests=body.next_visit_tests,
        next_visit_fasting=body.next_visit_fasting,
        created_by=current_user.id,
    )
    db.add(encounter)
    await db.commit()
    await db.refresh(encounter)
    return EncounterResponse.model_validate(encounter)


@router.get("/encounters", response_model=EncounterListResponse)
async def list_encounters(
    patient_id: uuid.UUID = Query(description="환자 ID"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EncounterListResponse:
    total_result = await db.execute(
        select(func.count(Encounter.id)).where(Encounter.patient_id == patient_id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Encounter)
        .where(Encounter.patient_id == patient_id)
        .order_by(Encounter.encounter_date.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    encounters = list(result.scalars().all())

    return EncounterListResponse(
        items=[EncounterResponse.model_validate(e) for e in encounters],
        total=total,
        page=page,
        size=size,
    )


@router.get("/encounters/{encounter_id}", response_model=EncounterResponse)
async def get_encounter(
    encounter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EncounterResponse:
    result = await db.execute(select(Encounter).where(Encounter.id == encounter_id))
    encounter = result.scalar_one_or_none()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="진료 기록을 찾을 수 없습니다",
        )
    return EncounterResponse.model_validate(encounter)


@router.put("/encounters/{encounter_id}", response_model=EncounterResponse)
async def update_encounter(
    encounter_id: uuid.UUID,
    body: EncounterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EncounterResponse:
    result = await db.execute(select(Encounter).where(Encounter.id == encounter_id))
    encounter = result.scalar_one_or_none()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="진료 기록을 찾을 수 없습니다",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(encounter, field, value)

    await db.commit()
    await db.refresh(encounter)
    return EncounterResponse.model_validate(encounter)


@router.get(
    "/patients/{patient_id}/clinical-summary",
    response_model=ClinicalSummaryResponse,
)
async def get_clinical_summary(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClinicalSummaryResponse:
    """임상 대시보드 집계 데이터."""
    # Verify patient exists
    patient_result = await db.execute(select(Patient).where(Patient.id == patient_id))
    if not patient_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="환자를 찾을 수 없습니다",
        )

    # Recent encounters (last 10)
    enc_result = await db.execute(
        select(Encounter)
        .where(Encounter.patient_id == patient_id)
        .order_by(Encounter.encounter_date.desc())
        .limit(10)
    )
    encounters = list(enc_result.scalars().all())

    recent_vitals = []
    recent_labs = []
    recent_enc_summaries = []

    for enc in encounters:
        enc_date = enc.encounter_date.isoformat()
        if enc.vitals:
            recent_vitals.append({"date": enc_date, **enc.vitals})
        if enc.labs:
            recent_labs.append({"date": enc_date, "labs": enc.labs})
        recent_enc_summaries.append(
            {
                "id": str(enc.id),
                "date": enc_date,
                "visit_type": enc.visit_type,
                "assessment": enc.assessment or "",
                "kcd_codes": enc.kcd_codes or [],
            }
        )

    return ClinicalSummaryResponse(
        patient_id=patient_id,
        recent_vitals=recent_vitals,
        recent_labs=recent_labs,
        recent_encounters=recent_enc_summaries,
        follow_up_alerts=[],  # TODO: implement F/U rules in Step 8
    )
