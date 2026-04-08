import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models.patient import Patient
from core.models.user import User
from core.schemas.patient import (
    PatientCreate,
    PatientListResponse,
    PatientResponse,
    PatientUpdate,
)
from core.security import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    body: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PatientResponse:
    # chart_no 중복 체크
    exists = await db.execute(select(Patient).where(Patient.chart_no == body.chart_no))
    if exists.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"차트번호 '{body.chart_no}'가 이미 존재합니다",
        )

    patient = Patient(**body.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.get("", response_model=PatientListResponse)
async def list_patients(
    q: str = Query(default="", description="차트번호 또는 이름 검색"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PatientListResponse:
    if q:
        # chart_no는 평문 검색 가능
        result = await db.execute(select(Patient).where(Patient.chart_no.contains(q)))
        chart_matches = list(result.scalars().all())

        # name은 암호화되어 있으므로 전체 로드 후 Python 필터링
        all_result = await db.execute(select(Patient))
        all_patients = all_result.scalars().all()
        name_matches = [p for p in all_patients if q in p.name and p not in chart_matches]

        patients = chart_matches + name_matches
        total = len(patients)
        start = (page - 1) * size
        patients = patients[start : start + size]
    else:
        total_result = await db.execute(select(func.count(Patient.id)))
        total = total_result.scalar_one()

        query = (
            select(Patient)
            .order_by(Patient.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await db.execute(query)
        patients = list(result.scalars().all())

    return PatientListResponse(
        items=[PatientResponse.model_validate(p) for p in patients],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PatientResponse:
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="환자를 찾을 수 없습니다")
    return PatientResponse.model_validate(patient)


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: uuid.UUID,
    body: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PatientResponse:
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="환자를 찾을 수 없습니다")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    await db.commit()
    await db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="환자를 찾을 수 없습니다")

    await db.delete(patient)
    await db.commit()
