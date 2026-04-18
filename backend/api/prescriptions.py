from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.audit import log_action
from core.database import get_db
from core.models.enums import UserRole
from core.models.patient import Patient
from core.models.prescription import Prescription
from core.models.user import User
from core.schemas.prescription import PrescriptionCreate, PrescriptionResponse, PrescriptionUpdate
from core.security import get_current_user, require_role

router = APIRouter(tags=["prescriptions"])


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _ensure_drug_identity(drug_name: str | None, ingredient_inn: str | None) -> None:
    if not (drug_name or ingredient_inn):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="drug_name 또는 ingredient_inn 중 하나는 필요합니다",
        )


async def _get_patient_or_404(patient_id: uuid.UUID, db: AsyncSession) -> Patient:
    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다")
    return patient


async def _get_prescription_or_404(prescription_id: uuid.UUID, db: AsyncSession) -> Prescription:
    prescription = await db.get(Prescription, prescription_id)
    if prescription is None:
        raise HTTPException(status_code=404, detail="처방 정보를 찾을 수 없습니다")
    return prescription


@router.get(
    "/patients/{patient_id}/prescriptions",
    response_model=list[PrescriptionResponse],
    summary="환자 처방 목록 조회",
)
async def list_prescriptions(
    patient_id: uuid.UUID,
    active_only: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PrescriptionResponse]:
    await _get_patient_or_404(patient_id, db)

    query = select(Prescription).where(Prescription.patient_id == patient_id)
    if active_only:
        query = query.where(Prescription.is_active.is_(True))

    query = query.order_by(Prescription.is_active.desc(), Prescription.created_at.desc())
    result = await db.execute(query)
    prescriptions = list(result.scalars().all())
    return [PrescriptionResponse.model_validate(rx) for rx in prescriptions]


@router.post(
    "/patients/{patient_id}/prescriptions",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="환자 처방 추가",
)
async def create_prescription(
    patient_id: uuid.UUID,
    body: PrescriptionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> PrescriptionResponse:
    await _get_patient_or_404(patient_id, db)

    payload = body.model_dump()
    payload["drug_name"] = _normalize_text(payload["drug_name"])
    payload["ingredient_inn"] = _normalize_text(payload["ingredient_inn"])
    payload["source_hospital"] = _normalize_text(payload["source_hospital"])
    _ensure_drug_identity(payload["drug_name"], payload["ingredient_inn"])

    prescription = Prescription(patient_id=patient_id, **payload)
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)

    await log_action(
        db,
        current_user,
        "create",
        "prescription",
        str(prescription.id),
        details={"patient_id": str(patient_id), "is_active": prescription.is_active},
        request=request,
    )
    return PrescriptionResponse.model_validate(prescription)


@router.patch(
    "/prescriptions/{prescription_id}",
    response_model=PrescriptionResponse,
    summary="처방 수정",
)
async def update_prescription(
    prescription_id: uuid.UUID,
    body: PrescriptionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> PrescriptionResponse:
    prescription = await _get_prescription_or_404(prescription_id, db)

    update_data = body.model_dump(exclude_unset=True)
    if "drug_name" in update_data:
        update_data["drug_name"] = _normalize_text(update_data["drug_name"])
    if "ingredient_inn" in update_data:
        update_data["ingredient_inn"] = _normalize_text(update_data["ingredient_inn"])
    if "source_hospital" in update_data:
        update_data["source_hospital"] = _normalize_text(update_data["source_hospital"])

    next_drug_name = update_data.get("drug_name", prescription.drug_name)
    next_ingredient = update_data.get("ingredient_inn", prescription.ingredient_inn)
    _ensure_drug_identity(next_drug_name, next_ingredient)

    for field, value in update_data.items():
        setattr(prescription, field, value)

    await db.commit()
    await db.refresh(prescription)

    await log_action(
        db,
        current_user,
        "update",
        "prescription",
        str(prescription_id),
        details={"updated_fields": list(update_data.keys())},
        request=request,
    )
    return PrescriptionResponse.model_validate(prescription)


@router.delete(
    "/prescriptions/{prescription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="처방 중단 처리",
)
async def deactivate_prescription(
    prescription_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> None:
    prescription = await _get_prescription_or_404(prescription_id, db)
    if prescription.is_active:
        prescription.is_active = False
        if prescription.end_date is None:
            prescription.end_date = date.today()
        await db.commit()

    await log_action(
        db,
        current_user,
        "delete",
        "prescription",
        str(prescription_id),
        details={"patient_id": str(prescription.patient_id), "soft_delete": True},
        request=request,
    )
