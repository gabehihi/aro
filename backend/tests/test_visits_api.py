"""VisitSchedule CRUD API 테스트."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import InsuranceType, Sex, UserRole
from core.models.patient import Patient
from core.models.user import User
from core.security import create_access_token, hash_password


async def _create_doctor(db: AsyncSession) -> tuple[User, str]:
    user = User(
        username="doctor_visit",
        hashed_password=hash_password("pass1234"),
        name="방문테스트의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return user, token


async def _setup_patient(db: AsyncSession) -> Patient:
    patient = Patient(
        chart_no="V-0001",
        name="방문테스트",
        birth_date=date(1970, 1, 1),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=[],
        allergies=[],
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


@pytest.mark.asyncio
async def test_create_visit(client: AsyncClient, db_session: AsyncSession):
    _, token = await _create_doctor(db_session)
    patient = await _setup_patient(db_session)
    resp = await client.post(
        "/api/v1/visits",
        json={
            "patient_id": str(patient.id),
            "scheduled_date": str(date.today() + timedelta(days=7)),
            "planned_tests": ["혈액검사", "소변검사"],
            "needs_fasting": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["patient_name"] == "방문테스트"
    assert data["needs_fasting"] is True
    assert "혈액검사" in data["planned_tests"]


@pytest.mark.asyncio
async def test_list_visits_upcoming(client: AsyncClient, db_session: AsyncSession):
    _, token = await _create_doctor(db_session)
    patient = await _setup_patient(db_session)
    await client.post(
        "/api/v1/visits",
        json={
            "patient_id": str(patient.id),
            "scheduled_date": str(date.today() + timedelta(days=3)),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get(
        "/api/v1/visits",
        params={"upcoming_only": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_complete_visit(client: AsyncClient, db_session: AsyncSession):
    _, token = await _create_doctor(db_session)
    patient = await _setup_patient(db_session)
    create_resp = await client.post(
        "/api/v1/visits",
        json={
            "patient_id": str(patient.id),
            "scheduled_date": str(date.today() + timedelta(days=1)),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    visit_id = create_resp.json()["id"]
    patch_resp = await client.patch(
        f"/api/v1/visits/{visit_id}",
        json={"visit_completed": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["visit_completed"] is True


@pytest.mark.asyncio
async def test_cancel_visit(client: AsyncClient, db_session: AsyncSession):
    _, token = await _create_doctor(db_session)
    patient = await _setup_patient(db_session)
    create_resp = await client.post(
        "/api/v1/visits",
        json={
            "patient_id": str(patient.id),
            "scheduled_date": str(date.today() + timedelta(days=2)),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    visit_id = create_resp.json()["id"]
    del_resp = await client.delete(
        f"/api/v1/visits/{visit_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_resp.status_code == 204
