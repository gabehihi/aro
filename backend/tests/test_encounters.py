"""Encounter CRUD integration tests."""

from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import InsuranceType, Sex, UserRole
from core.models.patient import Patient
from core.models.user import User
from core.security import create_access_token, hash_password


async def _setup(db: AsyncSession) -> tuple[Patient, User, str]:
    user = User(
        username="enc_doc",
        hashed_password=hash_password("pass1234"),
        name="진료의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    patient = Patient(
        chart_no="E-0001",
        name="진료환자",
        birth_date=date(1960, 3, 15),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=["I10", "E11"],
        allergies=[],
    )
    db.add(patient)
    await db.commit()
    await db.refresh(user)
    await db.refresh(patient)

    token = create_access_token(data={"sub": str(user.id)})
    return patient, user, token


SAMPLE_ENCOUNTER = {
    "raw_input": "HTN DM f/u BP 130/80 HR 72 HbA1c 7.2",
    "visit_type": "재진",
    "encounter_date": "2026-04-06T09:30:00",
    "subjective": "특이 호소 없음",
    "objective": "BP 130/80, HR 72, HbA1c 7.2%",
    "assessment": "I10 고혈압, E11 2형당뇨 - 조절 양호",
    "plan": "현 처방 유지, 3개월 후 재진",
    "vitals": {"sbp": 130, "dbp": 80, "hr": 72},
    "kcd_codes": [
        {"code": "I10", "description": "본태성 고혈압"},
        {"code": "E11", "description": "2형 당뇨병"},
    ],
    "labs": [{"name": "HbA1c", "value": 7.2, "unit": "%", "flag": None}],
    "health_promotion": {
        "smoking_cessation": False,
        "alcohol_reduction": False,
        "exercise": True,
        "diet": True,
    },
}


@pytest.mark.asyncio
async def test_create_encounter(client: AsyncClient, db_session: AsyncSession) -> None:
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    body = {**SAMPLE_ENCOUNTER, "patient_id": str(patient.id)}
    resp = await client.post("/api/v1/encounters", json=body, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["patient_id"] == str(patient.id)
    assert data["subjective"] == "특이 호소 없음"
    assert data["vitals"]["sbp"] == 130
    assert len(data["kcd_codes"]) == 2


@pytest.mark.asyncio
async def test_create_encounter_patient_not_found(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    body = {
        **SAMPLE_ENCOUNTER,
        "patient_id": "00000000-0000-0000-0000-000000000000",
    }
    resp = await client.post("/api/v1/encounters", json=body, headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_encounters(client: AsyncClient, db_session: AsyncSession) -> None:
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    body = {**SAMPLE_ENCOUNTER, "patient_id": str(patient.id)}
    await client.post("/api/v1/encounters", json=body, headers=headers)

    resp = await client.get(
        f"/api/v1/encounters?patient_id={patient.id}",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_get_encounter(client: AsyncClient, db_session: AsyncSession) -> None:
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    body = {**SAMPLE_ENCOUNTER, "patient_id": str(patient.id)}
    create_resp = await client.post("/api/v1/encounters", json=body, headers=headers)
    enc_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/encounters/{enc_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["raw_input"] == SAMPLE_ENCOUNTER["raw_input"]


@pytest.mark.asyncio
async def test_update_encounter(client: AsyncClient, db_session: AsyncSession) -> None:
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    body = {**SAMPLE_ENCOUNTER, "patient_id": str(patient.id)}
    create_resp = await client.post("/api/v1/encounters", json=body, headers=headers)
    enc_id = create_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/encounters/{enc_id}",
        json={"plan": "약물 변경: 암로디핀 5mg → 10mg 증량"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert "암로디핀" in resp.json()["plan"]


@pytest.mark.asyncio
async def test_get_clinical_summary(client: AsyncClient, db_session: AsyncSession) -> None:
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # Create an encounter first
    body = {**SAMPLE_ENCOUNTER, "patient_id": str(patient.id)}
    await client.post("/api/v1/encounters", json=body, headers=headers)

    resp = await client.get(
        f"/api/v1/patients/{patient.id}/clinical-summary",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["patient_id"] == str(patient.id)
    assert len(data["recent_vitals"]) == 1
    assert len(data["recent_encounters"]) == 1


@pytest.mark.asyncio
async def test_encounters_unauthorized(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/encounters?patient_id=00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401
