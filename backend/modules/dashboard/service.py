from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import AlertPriority, AlertType
from core.models.follow_up_alert import FollowUpAlert
from core.models.patient import Patient
from core.models.visit_schedule import VisitSchedule
from core.schemas.screening import (
    DashboardSummary,
    FollowUpAlertResponse,
    NoShowPatientResponse,
)

_PRIORITY_ORDER = {
    AlertPriority.urgent: 0,
    AlertPriority.due: 1,
    AlertPriority.upcoming: 2,
}


@dataclass(slots=True)
class FollowUpDashboardSnapshot:
    summary: DashboardSummary
    followup_alerts: list[FollowUpAlertResponse]
    noshow_patients: list[NoShowPatientResponse]


async def build_followup_dashboard_snapshot(
    db: AsyncSession,
    *,
    alert_limit: int | None = None,
    noshow_limit: int | None = None,
) -> FollowUpDashboardSnapshot:
    """Build shared follow-up dashboard data used by multiple surfaces."""
    today = date.today()
    week_ago = today - timedelta(days=7)

    today_appointments = (
        await db.execute(
            select(func.count(VisitSchedule.id)).where(
                VisitSchedule.scheduled_date == today,
                VisitSchedule.visit_completed.is_(False),
            )
        )
    ).scalar_one()

    followup_needed = (
        await db.execute(
            select(func.count(FollowUpAlert.id)).where(FollowUpAlert.resolved.is_(False))
        )
    ).scalar_one()

    screening_incomplete = (
        await db.execute(
            select(func.count(FollowUpAlert.id)).where(
                FollowUpAlert.alert_type == AlertType.screening_fu,
                FollowUpAlert.resolved.is_(False),
            )
        )
    ).scalar_one()

    pending_result = await db.execute(
        select(FollowUpAlert, Patient)
        .join(Patient, FollowUpAlert.patient_id == Patient.id)
        .where(FollowUpAlert.resolved.is_(False))
    )
    pending_rows = sorted(
        pending_result.all(),
        key=lambda row: (
            _PRIORITY_ORDER.get(row[0].priority, 99),
            row[0].due_date,
        ),
    )
    if alert_limit is not None:
        pending_rows = pending_rows[:alert_limit]

    followup_alerts = [
        FollowUpAlertResponse(
            id=alert.id,
            patient_id=alert.patient_id,
            patient_name=str(patient.name),
            chart_no=patient.chart_no,
            alert_type=str(alert.alert_type),
            item=alert.item,
            last_value=alert.last_value,
            last_date=alert.last_date,
            due_date=alert.due_date,
            days_overdue=alert.days_overdue,
            priority=str(alert.priority),
            resolved=alert.resolved,
        )
        for alert, patient in pending_rows
    ]

    noshow_result = await db.execute(
        select(VisitSchedule, Patient)
        .join(Patient, VisitSchedule.patient_id == Patient.id)
        .where(
            VisitSchedule.scheduled_date >= week_ago,
            VisitSchedule.scheduled_date < today,
            VisitSchedule.visit_completed.is_(False),
        )
        .order_by(VisitSchedule.scheduled_date.desc(), VisitSchedule.created_at.desc())
    )
    noshow_rows = list(noshow_result.all())
    noshow_last_week = len(noshow_rows)
    if noshow_limit is not None:
        noshow_rows = noshow_rows[:noshow_limit]

    noshow_patients = [
        NoShowPatientResponse(
            patient_id=visit.patient_id,
            patient_name=str(patient.name),
            chart_no=patient.chart_no,
            scheduled_date=visit.scheduled_date,
            planned_tests=visit.planned_tests or [],
        )
        for visit, patient in noshow_rows
    ]

    summary = DashboardSummary(
        today_appointments=today_appointments,
        followup_needed=followup_needed,
        noshow_last_week=noshow_last_week,
        screening_incomplete=screening_incomplete,
    )

    return FollowUpDashboardSnapshot(
        summary=summary,
        followup_alerts=followup_alerts,
        noshow_patients=noshow_patients,
    )
