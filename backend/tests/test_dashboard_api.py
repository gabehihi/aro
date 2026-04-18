from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.document import MedicalDocument
from core.models.enums import (
    AlertPriority,
    AlertType,
    DocStatus,
    DocType,
    InsuranceType,
    Sex,
    UserRole,
)
from core.models.follow_up_alert import FollowUpAlert
from core.models.patient import Patient
from core.models.user import User
from core.models.visit_schedule import VisitSchedule
from core.security import create_access_token, hash_password


async def _create_doctor(db: AsyncSession) -> tuple[User, str]:
    user = User(
        username="dashboard_doctor",
        hashed_password=hash_password("pass1234"),
        name="대시보드의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user, create_access_token(data={"sub": str(user.id)})


async def _create_patient(db: AsyncSession, chart_no: str = "DB-001") -> Patient:
    patient = Patient(
        chart_no=chart_no,
        name="대시보드환자",
        birth_date=date(1975, 6, 15),
        sex=Sex.F,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=["I10"],
        allergies=[],
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@pytest.mark.asyncio
async def test_dashboard_summary_returns_live_counts(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user, token = await _create_doctor(db_session)
    patient = await _create_patient(db_session)

    db_session.add_all(
        [
            VisitSchedule(
                patient_id=patient.id,
                scheduled_date=date.today(),
                planned_tests=["채혈"],
                needs_fasting=False,
                special_instructions=[],
                reminder_status={},
                visit_completed=False,
            ),
            VisitSchedule(
                patient_id=patient.id,
                scheduled_date=date.today() - timedelta(days=2),
                planned_tests=["재검"],
                needs_fasting=False,
                special_instructions=[],
                reminder_status={},
                visit_completed=False,
            ),
            FollowUpAlert(
                patient_id=patient.id,
                alert_type=AlertType.screening_fu,
                item="HbA1c",
                last_value="8.4",
                last_date=date.today() - timedelta(days=30),
                due_date=date.today() + timedelta(days=3),
                days_overdue=0,
                priority=AlertPriority.urgent,
                resolved=False,
            ),
            MedicalDocument(
                patient_id=patient.id,
                doc_type=DocType.진단서,
                title="최근 진단서",
                content={"title": "진단서"},
                generated_text="최근 진단서",
                status=DocStatus.issued,
                created_by=user.id,
                issued_at=datetime.now(tz=UTC),
            ),
        ]
    )
    await db_session.commit()

    resp = await client.get(
        "/api/v1/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["summary"]["today_appointments"] == 1
    assert data["summary"]["followup_needed"] == 1
    assert data["summary"]["noshow_last_week"] == 1
    assert data["summary"]["screening_incomplete"] == 1
    assert len(data["upcoming_visits"]) == 1
    assert len(data["priority_followup_alerts"]) == 1
    assert len(data["recent_documents"]) == 1
    assert data["recent_documents"][0]["patient_name"] == "대시보드환자"
    assert "month_stats" in data
    assert "report_archive" in data


@pytest.mark.asyncio
async def test_dashboard_summary_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/dashboard/summary")
    assert resp.status_code == 401
