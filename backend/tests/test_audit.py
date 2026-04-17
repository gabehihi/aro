"""AuditLog 서비스 — 유닛 + 통합 테스트."""

from __future__ import annotations

from datetime import date

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.audit_log import AuditLog
from core.models.enums import InsuranceType, Sex, UserRole
from core.models.patient import Patient
from core.models.user import User
from core.security import create_access_token, hash_password


async def _make_user(db: AsyncSession) -> tuple[User, str]:
    user = User(
        username="audit_doc",
        hashed_password=hash_password("pass"),
        name="감사의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user, create_access_token(data={"sub": str(user.id)})


async def _make_patient(db: AsyncSession, chart_no: str = "AUDIT001") -> Patient:
    patient = Patient(
        chart_no=chart_no,
        name="감사환자",
        birth_date=date(1980, 1, 1),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=[],
        allergies=[],
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


async def test_log_action_creates_record(db_session: AsyncSession) -> None:
    user, _ = await _make_user(db_session)
    from core.audit import log_action
    await log_action(db_session, user, "read", "patient", "abc-123")
    result = await db_session.execute(select(AuditLog))
    logs = result.scalars().all()
    assert len(logs) == 1
    log = logs[0]
    assert log.action == "read"
    assert log.resource_type == "patient"
    assert log.resource_id == "abc-123"
    assert log.user_id == user.id
    assert log.ip_address is None
    assert log.details is None


async def test_log_action_with_details(db_session: AsyncSession) -> None:
    user, _ = await _make_user(db_session)
    from core.audit import log_action
    await log_action(
        db_session, user, "update", "patient", "def-456",
        details={"updated_fields": ["name", "phone"]},
    )
    result = await db_session.execute(select(AuditLog))
    log = result.scalars().first()
    assert log is not None
    assert log.details == {"updated_fields": ["name", "phone"]}


async def test_get_patient_creates_audit_log(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user, token = await _make_user(db_session)
    patient = await _make_patient(db_session)
    resp = await client.get(
        f"/api/v1/patients/{patient.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    result = await db_session.execute(select(AuditLog))
    logs = result.scalars().all()
    assert len(logs) == 1
    assert logs[0].action == "read"
    assert logs[0].resource_type == "patient"
    assert logs[0].resource_id == str(patient.id)
    assert logs[0].user_id == user.id


async def test_create_patient_creates_audit_log(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, token = await _make_user(db_session)
    resp = await client.post(
        "/api/v1/patients",
        json={
            "chart_no": "AUDIT002",
            "name": "신규환자",
            "birth_date": "1975-06-10",
            "sex": "F",
            "insurance_type": "건강보험",
            "chronic_diseases": [],
            "allergies": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    patient_id = resp.json()["id"]
    result = await db_session.execute(select(AuditLog))
    logs = result.scalars().all()
    assert len(logs) == 1
    assert logs[0].action == "create"
    assert logs[0].resource_id == patient_id


async def test_update_patient_creates_audit_log(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, token = await _make_user(db_session)
    patient = await _make_patient(db_session, "AUDIT003")
    resp = await client.put(
        f"/api/v1/patients/{patient.id}",
        json={"memo": "혈압 조절 중"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    result = await db_session.execute(select(AuditLog))
    log = result.scalars().first()
    assert log is not None
    assert log.action == "update"
    assert log.details == {"updated_fields": ["memo"]}
