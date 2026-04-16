"""VisitSchedule CRUD API endpoints."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models.patient import Patient
from core.models.user import User
from core.models.visit_schedule import VisitSchedule
from core.schemas.visit import VisitScheduleCreate, VisitScheduleResponse, VisitScheduleUpdate
from core.security import get_current_user

router = APIRouter(prefix="/visits", tags=["visits"])


def _to_response(visit: VisitSchedule, patient: Patient) -> VisitScheduleResponse:
    return VisitScheduleResponse(
        id=visit.id,
        patient_id=visit.patient_id,
        patient_name=patient.name,
        chart_no=patient.chart_no,
        scheduled_date=visit.scheduled_date,
        planned_tests=visit.planned_tests or [],
        needs_fasting=visit.needs_fasting,
        special_instructions=visit.special_instructions or [],
        reminder_status=visit.reminder_status or {},
        visit_completed=visit.visit_completed,
        created_at=visit.created_at,
    )


async def _get_visit_or_404(visit_id: UUID, db: AsyncSession) -> tuple[VisitSchedule, Patient]:
    result = await db.execute(select(VisitSchedule).where(VisitSchedule.id == visit_id))
    visit = result.scalar_one_or_none()
    if visit is None:
        raise HTTPException(status_code=404, detail="내원 예약을 찾을 수 없습니다")

    patient_result = await db.execute(select(Patient).where(Patient.id == visit.patient_id))
    patient = patient_result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다")

    return visit, patient


@router.post(
    "",
    response_model=VisitScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="내원 예약 생성",
)
async def create_visit(
    body: VisitScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisitScheduleResponse:
    patient_result = await db.execute(select(Patient).where(Patient.id == body.patient_id))
    patient = patient_result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=404, detail="환자를 찾을 수 없습니다")

    visit = VisitSchedule(
        patient_id=body.patient_id,
        scheduled_date=body.scheduled_date,
        planned_tests=body.planned_tests,
        needs_fasting=body.needs_fasting,
        special_instructions=body.special_instructions,
        reminder_status={"sent_at": None, "method": None},
        visit_completed=False,
        created_from=body.created_from,
    )
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return _to_response(visit, patient)


@router.get(
    "",
    response_model=list[VisitScheduleResponse],
    summary="내원 예약 목록 조회",
)
async def list_visits(
    patient_id: UUID | None = None,
    upcoming_only: bool = True,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[VisitScheduleResponse]:
    query = select(VisitSchedule)

    if patient_id is not None:
        query = query.where(VisitSchedule.patient_id == patient_id)

    if upcoming_only:
        query = query.where(VisitSchedule.scheduled_date >= date.today())

    query = query.order_by(VisitSchedule.scheduled_date).limit(limit)

    result = await db.execute(query)
    visits = result.scalars().all()

    # patient 정보를 일괄 조회
    patient_ids = list({v.patient_id for v in visits})
    patients: dict[UUID, Patient] = {}
    if patient_ids:
        pat_result = await db.execute(select(Patient).where(Patient.id.in_(patient_ids)))
        for p in pat_result.scalars().all():
            patients[p.id] = p

    return [_to_response(v, patients[v.patient_id]) for v in visits if v.patient_id in patients]


@router.patch(
    "/{visit_id}",
    response_model=VisitScheduleResponse,
    summary="내원 예약 수정 (완료 처리, 리마인더 상태 등)",
)
async def update_visit(
    visit_id: UUID,
    body: VisitScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisitScheduleResponse:
    visit, patient = await _get_visit_or_404(visit_id, db)

    if body.scheduled_date is not None:
        visit.scheduled_date = body.scheduled_date
    if body.planned_tests is not None:
        visit.planned_tests = body.planned_tests
    if body.needs_fasting is not None:
        visit.needs_fasting = body.needs_fasting
    if body.special_instructions is not None:
        visit.special_instructions = body.special_instructions
    if body.visit_completed is not None:
        visit.visit_completed = body.visit_completed
    if body.reminder_status is not None:
        visit.reminder_status = body.reminder_status

    await db.commit()
    await db.refresh(visit)
    return _to_response(visit, patient)


@router.delete(
    "/{visit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="내원 예약 취소 (소프트 삭제: visit_completed=True)",
)
async def cancel_visit(
    visit_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    visit, _ = await _get_visit_or_404(visit_id, db)
    visit.visit_completed = True
    await db.commit()
