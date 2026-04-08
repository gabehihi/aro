import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import UserRole
from core.models.user import User
from core.security import create_access_token, hash_password


async def _create_doctor(db: AsyncSession) -> tuple[User, str]:
    user = User(
        username="doctor1",
        hashed_password=hash_password("pass1234"),
        name="테스트의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return user, token


SAMPLE_PATIENT = {
    "chart_no": "P-0001",
    "name": "홍길동",
    "birth_date": "1960-03-15",
    "sex": "M",
    "insurance_type": "건강보험",
    "chronic_diseases": ["I10", "E11"],
    "allergies": ["페니실린"],
}


@pytest.mark.asyncio
async def test_create_patient(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    resp = await client.post(
        "/api/v1/patients",
        json=SAMPLE_PATIENT,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["chart_no"] == "P-0001"
    assert data["name"] == "홍길동"
    assert data["chronic_diseases"] == ["I10", "E11"]
    assert "id" in data


@pytest.mark.asyncio
async def test_create_patient_duplicate_chart_no(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, token = await _create_doctor(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    await client.post("/api/v1/patients", json=SAMPLE_PATIENT, headers=headers)
    resp = await client.post("/api/v1/patients", json=SAMPLE_PATIENT, headers=headers)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_list_patients(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    await client.post("/api/v1/patients", json=SAMPLE_PATIENT, headers=headers)

    resp = await client.get("/api/v1/patients", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_search_patients_by_chart_no(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    await client.post("/api/v1/patients", json=SAMPLE_PATIENT, headers=headers)

    resp = await client.get("/api/v1/patients?q=P-0001", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_get_patient(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = await client.post("/api/v1/patients", json=SAMPLE_PATIENT, headers=headers)
    patient_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/patients/{patient_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "홍길동"


@pytest.mark.asyncio
async def test_update_patient(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = await client.post("/api/v1/patients", json=SAMPLE_PATIENT, headers=headers)
    patient_id = create_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/patients/{patient_id}",
        json={"memo": "고혈압 주의", "chronic_diseases": ["I10", "E11", "N18"]},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["memo"] == "고혈압 주의"
    assert "N18" in data["chronic_diseases"]


@pytest.mark.asyncio
async def test_delete_patient(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = await client.post("/api/v1/patients", json=SAMPLE_PATIENT, headers=headers)
    patient_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/patients/{patient_id}", headers=headers)
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/patients/{patient_id}", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_patient_unauthorized(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/patients", json=SAMPLE_PATIENT)
    assert resp.status_code == 401
