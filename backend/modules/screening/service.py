"""Screening orchestration service.

Flow: save ScreeningResult → AbnormalClassifier → FollowUpEngine → persist FollowUpAlerts
Rule-based classification only — no LLM in the critical path.
"""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import AlertPriority, AlertType
from core.models.follow_up_alert import FollowUpAlert
from core.models.patient import Patient
from core.models.screening import ScreeningResult
from core.schemas.screening import (
    ClassifyPreviewResponse,
    FollowUpDashboardResponse,
    ScreeningResultCreate,
    ScreeningResultResponse,
)
from modules.dashboard.service import build_followup_dashboard_snapshot
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
        patient_has_dm = payload.patient_has_dm or any(
            str(d).upper().startswith(("E10", "E11"))
            or "당뇨" in str(d)
            or "DM" in str(d).upper()
            or "diabetes" in str(d).lower()
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
        snapshot = await build_followup_dashboard_snapshot(db)
        return FollowUpDashboardResponse(
            summary=snapshot.summary,
            followup_alerts=snapshot.followup_alerts,
            noshow_patients=snapshot.noshow_patients,
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
