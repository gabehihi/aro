from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.reports import _collect_stats, _list_report_archives
from core.database import get_db
from core.models.document import MedicalDocument
from core.models.patient import Patient
from core.models.user import User
from core.models.visit_schedule import VisitSchedule
from core.schemas.dashboard import DashboardOverviewResponse, RecentDocumentSummary
from core.schemas.visit import VisitScheduleResponse
from core.security import get_current_user
from modules.dashboard.service import build_followup_dashboard_snapshot

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _to_visit_response(visit: VisitSchedule, patient: Patient) -> VisitScheduleResponse:
    return VisitScheduleResponse(
        id=visit.id,
        patient_id=visit.patient_id,
        patient_name=str(patient.name),
        chart_no=patient.chart_no,
        scheduled_date=visit.scheduled_date,
        planned_tests=visit.planned_tests or [],
        needs_fasting=visit.needs_fasting,
        special_instructions=visit.special_instructions or [],
        reminder_status=visit.reminder_status or {},
        visit_completed=visit.visit_completed,
        created_at=visit.created_at,
    )


@router.get("/summary", response_model=DashboardOverviewResponse, summary="홈 대시보드 집계")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardOverviewResponse:
    del current_user

    today = date.today()
    followup_snapshot = await build_followup_dashboard_snapshot(db, alert_limit=5)

    month_stats = await _collect_stats(db, today.year, today.month)

    upcoming_result = await db.execute(
        select(VisitSchedule, Patient)
        .join(Patient, VisitSchedule.patient_id == Patient.id)
        .where(
            VisitSchedule.scheduled_date >= today,
            VisitSchedule.visit_completed.is_(False),
        )
        .order_by(VisitSchedule.scheduled_date.asc(), VisitSchedule.created_at.asc())
        .limit(5)
    )
    upcoming_visits = [
        _to_visit_response(visit, patient) for visit, patient in upcoming_result.all()
    ]

    docs_result = await db.execute(
        select(MedicalDocument, Patient)
        .join(Patient, MedicalDocument.patient_id == Patient.id)
        .order_by(MedicalDocument.created_at.desc())
        .limit(8)
    )
    recent_documents = [
        RecentDocumentSummary(
            id=doc.id,
            patient_id=doc.patient_id,
            patient_name=str(patient.name),
            chart_no=patient.chart_no,
            doc_type=doc.doc_type,
            title=doc.title,
            status=doc.status,
            created_at=doc.created_at,
            issued_at=doc.issued_at,
        )
        for doc, patient in docs_result.all()
    ]

    return DashboardOverviewResponse(
        summary=followup_snapshot.summary,
        month_stats=month_stats,
        upcoming_visits=upcoming_visits,
        priority_followup_alerts=followup_snapshot.followup_alerts,
        recent_documents=recent_documents,
        report_archive=_list_report_archives(limit=6),
    )
