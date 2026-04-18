from __future__ import annotations

from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import InsuranceType, Sex, UserRole
from core.models.patient import Patient
from core.models.user import User
from core.security import create_access_token, hash_password


async def _setup(db: AsyncSession) -> tuple[Patient, str]:
    user = User(
        username="rxdoctor",
        hashed_password=hash_password("pass1234"),
        name="처방의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    patient = Patient(
        chart_no="RX-0001",
        name="처방환자",
        birth_date=date(1975, 1, 1),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=["I10"],
        allergies=[],
    )
    db.add(patient)
    await db.commit()
    await db.refresh(user)
    await db.refresh(patient)
    token = create_access_token(data={"sub": str(user.id)})
    return patient, token


@pytest.mark.asyncio
async def test_create_and_list_prescriptions(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post(
        f"/api/v1/patients/{patient.id}/prescriptions",
        headers=headers,
        json={
            "drug_name": "Metformin 500mg",
            "ingredient_inn": "metformin",
            "dose": "500mg",
            "frequency": "BID",
        },
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["ingredient_inn"] == "metformin"
    assert created["is_active"] is True

    list_resp = await client.get(
        f"/api/v1/patients/{patient.id}/prescriptions",
        headers=headers,
    )
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 1
    assert items[0]["id"] == created["id"]


@pytest.mark.asyncio
async def test_update_prescription(client: AsyncClient, db_session: AsyncSession) -> None:
    patient, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = await client.post(
        f"/api/v1/patients/{patient.id}/prescriptions",
        headers=headers,
        json={"ingredient_inn": "losartan"},
    )
    prescription_id = create_resp.json()["id"]

    update_resp = await client.patch(
        f"/api/v1/prescriptions/{prescription_id}",
        headers=headers,
        json={"dose": "100mg", "frequency": "QD"},
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["dose"] == "100mg"
    assert data["frequency"] == "QD"


@pytest.mark.asyncio
async def test_deactivate_prescription(client: AsyncClient, db_session: AsyncSession) -> None:
    patient, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = await client.post(
        f"/api/v1/patients/{patient.id}/prescriptions",
        headers=headers,
        json={"ingredient_inn": "amlodipine"},
    )
    prescription_id = create_resp.json()["id"]

    delete_resp = await client.delete(
        f"/api/v1/prescriptions/{prescription_id}",
        headers=headers,
    )
    assert delete_resp.status_code == 204

    active_resp = await client.get(
        f"/api/v1/patients/{patient.id}/prescriptions",
        headers=headers,
    )
    assert active_resp.status_code == 200
    assert active_resp.json() == []

    all_resp = await client.get(
        f"/api/v1/patients/{patient.id}/prescriptions",
        params={"active_only": "false"},
        headers=headers,
    )
    assert all_resp.status_code == 200
    items = all_resp.json()
    assert len(items) == 1
    assert items[0]["is_active"] is False


@pytest.mark.asyncio
async def test_prescription_requires_identity(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        f"/api/v1/patients/{patient.id}/prescriptions",
        headers=headers,
        json={"dose": "10mg"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_prescription_unauthorized(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/patients/00000000-0000-0000-0000-000000000000/prescriptions")
    assert resp.status_code == 401
