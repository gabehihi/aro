"""Tests for SourceDataAssembler."""

import uuid
from datetime import date, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.encounter import Encounter
from core.models.enums import (
    DocType,
    InsuranceType,
    PrescribedBy,
    ScreeningType,
    Sex,
    UserRole,
    VisitType,
)
from core.models.patient import Patient
from core.models.prescription import Prescription
from core.models.screening import ScreeningResult
from core.models.user import User
from core.security import hash_password
from modules.documents.assembler import SourceDataAssembler

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _make_user(db: AsyncSession) -> User:
    user = User(
        username=f"doc_{uuid.uuid4().hex[:6]}",
        hashed_password=hash_password("pass1234"),
        name="테스트의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def _make_patient(db: AsyncSession, chart_no: str = "TEST001") -> Patient:
    patient = Patient(
        id=uuid.uuid4(),
        chart_no=chart_no,
        name="테스트환자",
        birth_date=date(1960, 5, 15),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=["I10", "E11"],
        allergies=["페니실린"],
    )
    db.add(patient)
    await db.flush()
    return patient


async def _make_encounter(
    db: AsyncSession,
    patient_id: uuid.UUID,
    user_id: uuid.UUID,
    encounter_date: datetime | None = None,
) -> Encounter:
    enc = Encounter(
        id=uuid.uuid4(),
        patient_id=patient_id,
        created_by=user_id,
        encounter_date=encounter_date or datetime(2026, 4, 1, 9, 0),
        raw_input="HTN f/u",
        visit_type=VisitType.재진,
        subjective="특이 호소 없음",
        objective="BP 130/80",
        assessment="고혈압 조절 중",
        plan="현 처방 유지",
        vitals={"sbp": 130, "dbp": 80},
        kcd_codes=[{"code": "I10", "description": "본태성 고혈압"}],
        labs=[{"name": "HbA1c", "value": 7.2, "unit": "%"}],
    )
    db.add(enc)
    await db.flush()
    return enc


async def _make_prescription(
    db: AsyncSession,
    patient_id: uuid.UUID,
    is_active: bool = True,
) -> Prescription:
    rx = Prescription(
        id=uuid.uuid4(),
        patient_id=patient_id,
        drug_name="암로디핀",
        ingredient_inn="amlodipine",
        dose="5mg",
        frequency="1일 1회",
        prescribed_by=PrescribedBy.보건소,
        is_active=is_active,
    )
    db.add(rx)
    await db.flush()
    return rx


async def _make_screening(
    db: AsyncSession,
    patient_id: uuid.UUID,
    screening_date: date | None = None,
) -> ScreeningResult:
    sr = ScreeningResult(
        id=uuid.uuid4(),
        patient_id=patient_id,
        screening_type=ScreeningType.국가건강검진,
        screening_date=screening_date or date(2026, 3, 1),
        results={"혈당": 95, "혈압": "130/80"},
        abnormal_findings=[],
        follow_up_required=False,
    )
    db.add(sr)
    await db.flush()
    return sr


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_assemble_full_data(db_session: AsyncSession):
    """Patient + encounter + prescriptions → complete structured dict."""
    user = await _make_user(db_session)
    patient = await _make_patient(db_session)
    encounter = await _make_encounter(db_session, patient.id, user.id)
    await _make_prescription(db_session, patient.id)
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, encounter.id, DocType.소견서, db_session)

    assert result["patient"]["chart_no"] == "TEST001"
    assert result["encounter"] is not None
    assert len(result["active_prescriptions"]) == 1
    assert result["metadata"]["doc_type"] == DocType.소견서


@pytest.mark.asyncio
async def test_assemble_without_encounter(db_session: AsyncSession):
    """encounter_id=None → encounter field is None."""
    patient = await _make_patient(db_session)
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, None, DocType.확인서, db_session)

    assert result["encounter"] is None


@pytest.mark.asyncio
async def test_assemble_health_cert_includes_screening(db_session: AsyncSession):
    """건강진단서 doc type → screening_results is populated."""
    patient = await _make_patient(db_session)
    await _make_screening(db_session, patient.id)
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, None, DocType.건강진단서, db_session)

    assert result["screening_results"] is not None
    assert result["screening_results"]["screening_type"] == ScreeningType.국가건강검진


@pytest.mark.asyncio
async def test_assemble_non_health_cert_no_screening(db_session: AsyncSession):
    """진단서 doc type → screening_results is None even if data exists."""
    patient = await _make_patient(db_session)
    await _make_screening(db_session, patient.id)
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, None, DocType.진단서, db_session)

    assert result["screening_results"] is None


@pytest.mark.asyncio
async def test_assemble_patient_not_found(db_session: AsyncSession):
    """Raises ValueError when patient does not exist."""
    assembler = SourceDataAssembler()

    with pytest.raises(ValueError, match="환자를 찾을 수 없습니다"):
        await assembler.assemble(uuid.uuid4(), None, DocType.진단서, db_session)


@pytest.mark.asyncio
async def test_assemble_no_prescriptions(db_session: AsyncSession):
    """No active prescriptions → empty list."""
    patient = await _make_patient(db_session)
    # 비활성 처방만 추가
    await _make_prescription(db_session, patient.id, is_active=False)
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, None, DocType.확인서, db_session)

    assert result["active_prescriptions"] == []


@pytest.mark.asyncio
async def test_assemble_recent_encounters_limit(db_session: AsyncSession):
    """Only 5 most recent encounters are returned."""
    user = await _make_user(db_session)
    patient = await _make_patient(db_session)

    # 7개 생성
    for i in range(7):
        await _make_encounter(
            db_session,
            patient.id,
            user.id,
            encounter_date=datetime(2026, 1, i + 1, 9, 0),
        )
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, None, DocType.소견서, db_session)

    assert len(result["recent_encounters"]) == 5


@pytest.mark.asyncio
async def test_assemble_metadata_correct(db_session: AsyncSession):
    """metadata contains doc_type, generation_date, clinic_name."""
    from datetime import date

    patient = await _make_patient(db_session)
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, None, DocType.의뢰서, db_session)

    meta = result["metadata"]
    assert meta["doc_type"] == DocType.의뢰서
    assert meta["generation_date"] == date.today().isoformat()
    assert meta["clinic_name"] == "보건소"


@pytest.mark.asyncio
async def test_assemble_patient_fields(db_session: AsyncSession):
    """Patient dict contains all required fields."""
    patient = await _make_patient(db_session)
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, None, DocType.진단서, db_session)

    p = result["patient"]
    assert p["chart_no"] == "TEST001"
    assert p["birth_date"] == date(1960, 5, 15).isoformat()
    assert p["sex"] == Sex.M
    assert p["insurance_type"] == InsuranceType.건강보험
    assert "I10" in p["chronic_diseases"]
    assert "페니실린" in p["allergies"]


@pytest.mark.asyncio
async def test_assemble_encounter_fields(db_session: AsyncSession):
    """Encounter dict contains all required fields."""
    user = await _make_user(db_session)
    patient = await _make_patient(db_session)
    encounter = await _make_encounter(db_session, patient.id, user.id)
    await db_session.commit()

    assembler = SourceDataAssembler()
    result = await assembler.assemble(patient.id, encounter.id, DocType.소견서, db_session)

    enc = result["encounter"]
    assert enc is not None
    assert "encounter_date" in enc
    assert enc["subjective"] == "특이 호소 없음"
    assert enc["vitals"] == {"sbp": 130, "dbp": 80}
    assert enc["visit_type"] == VisitType.재진
    assert len(enc["kcd_codes"]) == 1
