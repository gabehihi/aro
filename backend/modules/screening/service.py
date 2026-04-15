"""Screening orchestration service.

Flow: save ScreeningResult → AbnormalClassifier → FollowUpEngine → persist FollowUpAlerts
Rule-based classification only — no LLM in the critical path.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import AlertPriority, AlertType
from core.models.follow_up_alert import FollowUpAlert
from core.models.patient import Patient
from core.models.screening import ScreeningResult
from core.models.visit_schedule import VisitSchedule
from core.schemas.screening import (
    ClassifyPreviewResponse,
    DashboardSummary,
    FollowUpAlertResponse,
    FollowUpDashboardResponse,
    ScreeningResultCreate,
    ScreeningResultResponse,
)
from modules.screening.classifier import AbnormalClassifier
from modules.screening.follow_up import FollowUpEngine

_classifier = AbnormalClassifier()
_fu_engine = FollowUpEngine()


class ScreeningService:
    # ------------------------------------------------------------------
    # 1. save_and_classify
    # ------------------------------------------------------------------
    async def save_and_classify(
        self,
        db: AsyncSession,
        payload: ScreeningResultCreate,
    ) -> ScreeningResultResponse:
        """Save ScreeningResult and generate FollowUpAlerts from abnormal findings."""
        patient = await db.get(Patient, payload.patient_id)
        if patient is None:
            raise ValueError(f"Patient {payload.patient_id} not found")

        sex = str(patient.sex)  # Sex is StrEnum → str() gives "M" or "F"

        findings = _classifier.classify(payload.results, sex=sex)
        abnormal = [f for f in findings if f["tier"] != "normal"]
        follow_up_required = bool(abnormal)

        screening = ScreeningResult(
            patient_id=payload.patient_id,
            screening_type=payload.screening_type,  # type: ignore[arg-type]
            screening_date=payload.screening_date,
            results=payload.results,
            abnormal_findings=findings,
            follow_up_required=follow_up_required,
        )
        db.add(screening)
        await db.flush()  # get screening.id without committing yet

        # Generate and persist FollowUpAlerts
        patient_has_dm = any(
            "당뇨" in str(d) or "DM" in str(d) or "diabetes" in str(d).lower()
            for d in patient.chronic_diseases
        )
        candidates = _fu_engine.evaluate(
            findings, payload.screening_date, patient_has_dm=patient_has_dm
        )
        for c in candidates:
            days_overdue = max(0, (date.today() - c.due_date).days)
            alert = FollowUpAlert(
                patient_id=payload.patient_id,
                alert_type=AlertType.lab_recheck,
                item=c.item,
                last_value=str(c.value),
                last_date=payload.screening_date,
                due_date=c.due_date,
                days_overdue=days_overdue,
                priority=AlertPriority(c.priority),
                resolved=False,
            )
            db.add(alert)

        await db.commit()
        await db.refresh(screening)
        return ScreeningResultResponse.model_validate(screening)

    # ------------------------------------------------------------------
    # 2. classify_preview
    # ------------------------------------------------------------------
    def classify_preview(
        self,
        results: dict[str, Any],
        patient_sex: str,
    ) -> ClassifyPreviewResponse:
        """Return classification findings without persisting anything."""
        findings = _classifier.classify(results, sex=patient_sex)
        urgent = sum(1 for f in findings if f["tier"] == "urgent")
        caution = sum(1 for f in findings if f["tier"] == "caution")
        normal = sum(1 for f in findings if f["tier"] == "normal")
        return ClassifyPreviewResponse(
            findings=findings,  # type: ignore[arg-type]
            urgent_count=urgent,
            caution_count=caution,
            normal_count=normal,
        )

    # ------------------------------------------------------------------
    # 3. get_dashboard
    # ------------------------------------------------------------------
    async def get_dashboard(self, db: AsyncSession) -> FollowUpDashboardResponse:
        """Return dashboard: summary counts + pending alerts + no-show patients."""
        today = date.today()
        week_ago = today - timedelta(days=7)

        # Today's appointments (visit_schedules scheduled today, not yet completed)
        today_sched_result = await db.execute(
            select(VisitSchedule).where(
                VisitSchedule.scheduled_date == today,
                VisitSchedule.visit_completed.is_(False),
            )
        )
        today_appointments = len(today_sched_result.scalars().all())

        # Pending (unresolved) follow-up alerts
        pending_result = await db.execute(
            select(FollowUpAlert).where(FollowUpAlert.resolved.is_(False))
        )
        pending_alerts: list[FollowUpAlert] = pending_result.scalars().all()  # type: ignore[assignment]
        followup_needed = len(pending_alerts)

        # No-show: scheduled visits in last 7 days that were not completed
        noshow_sched_result = await db.execute(
            select(VisitSchedule)
            .where(
                VisitSchedule.scheduled_date >= week_ago,
                VisitSchedule.scheduled_date < today,
                VisitSchedule.visit_completed.is_(False),
            )
            .join(Patient, VisitSchedule.patient_id == Patient.id)
        )
        noshow_schedules: list[VisitSchedule] = noshow_sched_result.scalars().all()  # type: ignore[assignment]
        noshow_last_week = len(noshow_schedules)

        # Screening incomplete: patients who have unresolved alerts of type screening_fu
        screening_fu_result = await db.execute(
            select(FollowUpAlert).where(
                FollowUpAlert.alert_type == AlertType.screening_fu,
                FollowUpAlert.resolved.is_(False),
            )
        )
        screening_incomplete = len(screening_fu_result.scalars().all())

        summary = DashboardSummary(
            today_appointments=today_appointments,
            followup_needed=followup_needed,
            noshow_last_week=noshow_last_week,
            screening_incomplete=screening_incomplete,
        )

        # Build FollowUpAlertResponse list (eager-load patient names)
        alert_responses: list[FollowUpAlertResponse] = []
        for alert in sorted(
            pending_alerts,
            key=lambda a: (a.priority != AlertPriority.urgent, a.due_date),
        ):
            patient = await db.get(Patient, alert.patient_id)
            if patient is None:
                continue
            alert_responses.append(
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
            )

        # Build no-show patient list
        noshow_patients: list[dict] = []
        for vs in noshow_schedules:
            patient = await db.get(Patient, vs.patient_id)
            if patient is None:
                continue
            noshow_patients.append(
                {
                    "patient_id": str(vs.patient_id),
                    "patient_name": str(patient.name),
                    "chart_no": patient.chart_no,
                    "scheduled_date": vs.scheduled_date.isoformat(),
                    "planned_tests": vs.planned_tests,
                }
            )

        return FollowUpDashboardResponse(
            summary=summary,
            followup_alerts=alert_responses,
            noshow_patients=noshow_patients,
        )

    # ------------------------------------------------------------------
    # 4. resolve_alert
    # ------------------------------------------------------------------
    async def resolve_alert(self, db: AsyncSession, alert_id: UUID) -> FollowUpAlert:
        """Mark a FollowUpAlert as resolved."""
        alert = await db.get(FollowUpAlert, alert_id)
        if alert is None:
            raise ValueError(f"FollowUpAlert {alert_id} not found")

        alert.resolved = True
        alert.resolved_date = date.today()
        await db.commit()
        await db.refresh(alert)
        return alert
