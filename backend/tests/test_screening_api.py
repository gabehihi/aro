"""Screening API endpoint tests."""

from __future__ import annotations

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import InsuranceType, Sex, UserRole
from core.models.patient import Patient
from core.models.user import User
from core.security import create_access_token, hash_password


async def _create_patient(db: AsyncSession) -> Patient:
    patient = Patient(
        chart_no="S001",
        name="검진테스트환자",
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


async def _create_doctor(db: AsyncSession) -> str:
    user = User(
        username="screeningdoc",
        hashed_password=hash_password("pass1234"),
        name="검진의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return create_access_token(data={"sub": str(user.id)})


@pytest.mark.asyncio
async def test_classify_preview(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /screening/classify-preview — 인증 후 결과 반환."""
    token = await _create_doctor(db_session)
    resp = await client.post(
        "/api/v1/screening/classify-preview",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "results": {"eGFR": 45, "HbA1c": 8.2},
            "patient_sex": "M",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "findings" in data
    assert "urgent_count" in data
    assert "caution_count" in data
    assert "normal_count" in data
    assert isinstance(data["findings"], list)


@pytest.mark.asyncio
async def test_save_screening_result(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """POST /screening/results — 환자 생성 후 저장, follow_up_required 확인."""
    token = await _create_doctor(db_session)
    patient = await _create_patient(db_session)

    resp = await client.post(
        "/api/v1/screening/results",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": str(patient.id),
            "screening_type": "국가건강검진",
            "screening_date": date.today().isoformat(),
            "results": {"eGFR": 45, "HbA1c": 8.2},
            "patient_has_dm": False,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["patient_id"] == str(patient.id)
    assert "follow_up_required" in data
    assert isinstance(data["follow_up_required"], bool)
    assert "abnormal_findings" in data


@pytest.mark.asyncio
async def test_save_screening_patient_not_found(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """POST /screening/results — 존재하지 않는 환자 UUID → 404."""
    token = await _create_doctor(db_session)
    resp = await client.post(
        "/api/v1/screening/results",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "patient_id": "00000000-0000-0000-0000-000000000000",
            "screening_type": "국가건강검진",
            "screening_date": date.today().isoformat(),
            "results": {"eGFR": 50},
            "patient_has_dm": False,
        },
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dashboard_returns_structure(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """GET /screening/dashboard — summary/followup_alerts/noshow_patients 키 확인."""
    token = await _create_doctor(db_session)
    resp = await client.get(
        "/api/v1/screening/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    assert "followup_alerts" in data
    assert "noshow_patients" in data
    assert isinstance(data["followup_alerts"], list)
    assert isinstance(data["noshow_patients"], list)


@pytest.mark.asyncio
async def test_screening_unauthorized(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/screening/dashboard")
    assert resp.status_code == 401
