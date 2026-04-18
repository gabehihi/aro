import uuid
import re
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models.encounter import Encounter
from core.models.enums import UserRole
from core.models.follow_up_alert import FollowUpAlert
from core.models.patient import Patient
from core.models.user import User
from core.schemas.encounter import (
    ClinicalFollowUpAlertSchema,
    ClinicalSummaryResponse,
    EncounterCreate,
    EncounterListResponse,
    EncounterResponse,
    EncounterUpdate,
    HealthPromotionSchema,
    PrefillLabSchema,
    SOAPPrefillResponse,
)
from core.security import require_role

# KCD 코드 → 템플릿 SOAP Writer의 DiseaseId 매핑.
# 레지스트리의 canonical 코드를 우선 매칭하고, 미스매치된 코드에 대해서는 prefix 규칙을 적용한다.
_KCD_PREFIX_TO_DISEASE: list[tuple[str, str]] = [
    ("I10", "HTN"),
    ("I11", "HTN"),
    ("I12", "HTN"),
    ("I13", "HTN"),
    ("I15", "HTN"),
    ("E10", "DM"),
    ("E11", "DM"),
    ("E13", "DM"),
    ("E14", "DM"),
    ("E78", "DL"),
    ("E66", "OB"),
    ("K76.0", "MASLD"),
    ("K75.8", "MASLD"),
    ("M81", "OP"),
    ("M80", "OP"),
    ("N18", "CKD"),
    ("E03", "HypoT"),
    ("E02", "HypoT"),
    ("E05", "HyperT"),
    ("E06", "HyperT"),
]

_LAB_NAME_ALIASES: dict[str, str] = {
    "hba1c": "hba1c",
    "a1c": "hba1c",
    "glucose": "fbs",
    "fbs": "fbs",
    "fbg": "fbs",
    "fpg": "fbs",
    "fastingbloodsugar": "fbs",
    "ldl": "ldl",
    "ldlc": "ldl",
    "ldlcholesterol": "ldl",
    "hdl": "hdl",
    "hdlc": "hdl",
    "hdlcholesterol": "hdl",
    "tg": "tg",
    "triglyceride": "tg",
    "triglycerides": "tg",
    "cholesterol": "tc",
    "totalcholesterol": "tc",
    "tc": "tc",
    "tchol": "tc",
    "cr": "cr",
    "creatinine": "cr",
    "bun": "bun",
    "bloodureanitrogen": "bun",
    "egfr": "egfr",
    "tsh": "tsh",
    "ft4": "ft4",
    "freet4": "ft4",
    "t4": "ft4",
    "ast": "ast",
    "alt": "alt",
    "ggt": "ggt",
    "ggtp": "ggt",
    "acr": "acr",
    "uacr": "acr",
    "albumincreatinineratio": "acr",
    "albumincrratio": "acr",
    "albumincr": "acr",
    "vitd": "vitd",
    "vitamind": "vitd",
    "25ohvitd": "vitd",
    "25ohvitamind": "vitd",
    "hb": "hb",
    "hgb": "hb",
    "hemoglobin": "hb",
    "ppg": "ppg",
    "postprandialglucose": "ppg",
    "tscorespine": "tscore_spine",
    "spinetscore": "tscore_spine",
    "tscorehip": "tscore_hip",
    "hiptscore": "tscore_hip",
}


def _compact_lab_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.strip().lower())


def _kcd_to_disease_id(code: str) -> str | None:
    if not code:
        return None
    normalized = code.strip().upper().replace(" ", "")
    for prefix, disease_id in _KCD_PREFIX_TO_DISEASE:
        if normalized.startswith(prefix):
            return disease_id
    return None


def _normalize_lab_name(name: str) -> str | None:
    if not name:
        return None
    key = _compact_lab_name(name)
    return _LAB_NAME_ALIASES.get(key)


router = APIRouter(tags=["encounters"])


@router.post(
    "/encounters",
    response_model=EncounterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_encounter(
    body: EncounterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor)),
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
    current_user: User = Depends(require_role(UserRole.doctor)),
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
    current_user: User = Depends(require_role(UserRole.doctor)),
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
    current_user: User = Depends(require_role(UserRole.doctor)),
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
    "/patients/{patient_id}/soap-prefill",
    response_model=SOAPPrefillResponse,
)
async def get_soap_prefill(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor)),
) -> SOAPPrefillResponse:
    """직전 encounter 3건 기반 템플릿 SOAP Writer 프리필.

    - selected_diseases: kcd_codes → DiseaseId 매핑 (중복 제거)
    - chronic_vs: 가장 최근 encounter의 vitals
    - labs_by_name: 분석물별 최신값, 180일 이내
    - education_flags: 가장 최근 encounter의 health_promotion
    - last_encounter_date: 가장 최근 encounter 날짜
    """
    patient_result = await db.execute(select(Patient).where(Patient.id == patient_id))
    if not patient_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="환자를 찾을 수 없습니다",
        )

    enc_result = await db.execute(
        select(Encounter)
        .where(Encounter.patient_id == patient_id)
        .order_by(Encounter.encounter_date.desc())
        .limit(3)
    )
    encounters = list(enc_result.scalars().all())

    if not encounters:
        return SOAPPrefillResponse(
            selected_diseases=[],
            chronic_vs={},
            labs_by_name={},
            other_labs=[],
            education_flags=HealthPromotionSchema(),
            last_encounter_date=None,
        )

    # KCD → DiseaseId (DISEASE_ORDER 유지하면서 중복 제거)
    disease_order = ["HTN", "DM", "DL", "OB", "MASLD", "OP", "CKD", "HypoT", "HyperT"]
    found: set[str] = set()
    for enc in encounters:
        for kcd in enc.kcd_codes or []:
            code = kcd.get("code") if isinstance(kcd, dict) else None
            disease_id = _kcd_to_disease_id(code or "")
            if disease_id:
                found.add(disease_id)
    # Hypo/Hyper 배타 — 최근 encounter 기준 우선
    if "HypoT" in found and "HyperT" in found:
        latest_thyroid: str | None = None
        for enc in encounters:
            for kcd in enc.kcd_codes or []:
                code = kcd.get("code") if isinstance(kcd, dict) else None
                did = _kcd_to_disease_id(code or "")
                if did in ("HypoT", "HyperT"):
                    latest_thyroid = did
                    break
            if latest_thyroid:
                break
        if latest_thyroid == "HypoT":
            found.discard("HyperT")
        else:
            found.discard("HypoT")
    selected_diseases = [d for d in disease_order if d in found]

    latest = encounters[0]

    # 180일 이내 labs dedupe (분석물별 최신 1건)
    cutoff = datetime.now(UTC) - timedelta(days=180)
    labs_by_name: dict[str, PrefillLabSchema] = {}
    other_labs: list[PrefillLabSchema] = []
    seen_other_labs: set[str] = set()
    for enc in encounters:
        enc_dt = enc.encounter_date
        enc_dt_aware = enc_dt.replace(tzinfo=UTC) if enc_dt.tzinfo is None else enc_dt
        if enc_dt_aware < cutoff:
            continue
        for lab in enc.labs or []:
            if not isinstance(lab, dict):
                continue
            raw_name = str(lab.get("name") or "").strip()
            canonical = _normalize_lab_name(lab.get("name") or "")
            measured_at = enc.encounter_date
            if canonical:
                if canonical in labs_by_name:
                    # encounters 는 최신순으로 조회되므로 먼저 들어간 값이 최신
                    continue
                labs_by_name[canonical] = PrefillLabSchema(
                    name=canonical,
                    value=lab.get("value"),
                    unit=lab.get("unit") or "",
                    flag=lab.get("flag"),
                    measured_at=measured_at,
                )
                continue
            other_key = _compact_lab_name(raw_name)
            if not raw_name or not other_key or other_key in seen_other_labs:
                continue
            seen_other_labs.add(other_key)
            other_labs.append(
                PrefillLabSchema(
                    name=raw_name,
                    value=lab.get("value"),
                    unit=lab.get("unit") or "",
                    flag=lab.get("flag"),
                    measured_at=measured_at,
                )
            )

    vitals = latest.vitals or {}
    chronic_vs = {
        "sbp": vitals.get("sbp"),
        "dbp": vitals.get("dbp"),
        "hr": vitals.get("hr"),
        "bt": vitals.get("bt"),
        "rr": vitals.get("rr"),
        "spo2": vitals.get("spo2"),
        "bw": vitals.get("bw"),
        "bh": vitals.get("bh"),
        "waist": vitals.get("waist"),
        "bmi": vitals.get("bmi"),
    }

    education_flags = HealthPromotionSchema(
        **(latest.health_promotion or {}),
    )

    return SOAPPrefillResponse(
        selected_diseases=selected_diseases,
        chronic_vs=chronic_vs,
        labs_by_name=labs_by_name,
        other_labs=other_labs,
        education_flags=education_flags,
        last_encounter_date=latest.encounter_date,
    )


@router.get(
    "/patients/{patient_id}/clinical-summary",
    response_model=ClinicalSummaryResponse,
)
async def get_clinical_summary(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor)),
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

    alert_result = await db.execute(
        select(FollowUpAlert)
        .where(
            FollowUpAlert.patient_id == patient_id,
            FollowUpAlert.resolved.is_(False),
        )
        .order_by(FollowUpAlert.due_date.asc())
        .limit(5)
    )
    follow_up_alerts = list(alert_result.scalars().all())

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

    priority_order = {
        "urgent": 0,
        "due": 1,
        "upcoming": 2,
    }
    serialized_alerts = [
        ClinicalFollowUpAlertSchema(
            id=alert.id,
            alert_type=str(alert.alert_type),
            item=alert.item,
            last_value=alert.last_value,
            last_date=alert.last_date,
            due_date=alert.due_date,
            days_overdue=alert.days_overdue,
            priority=str(alert.priority),
            resolved=alert.resolved,
        )
        for alert in sorted(
            follow_up_alerts,
            key=lambda alert: (
                priority_order.get(str(alert.priority), 99),
                alert.due_date,
            ),
        )
    ]

    return ClinicalSummaryResponse(
        patient_id=patient_id,
        recent_vitals=recent_vitals,
        recent_labs=recent_labs,
        recent_encounters=recent_enc_summaries,
        follow_up_alerts=serialized_alerts,
    )
