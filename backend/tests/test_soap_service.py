"""SOAP Service integration tests using mocked LLM."""

import json
from datetime import date
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.llm.service import LLMResponse
from core.models.enums import InsuranceType, PrescribedBy, Sex, UserRole, VisitType
from core.models.patient import Patient
from core.models.prescription import Prescription
from core.models.user import User
from core.security import hash_password
from modules.soap.service import SOAPService

MOCK_LLM_RESPONSE = json.dumps(
    {
        "subjective": "두통, 어지러움 2일째 호소. 혈압약 복용 중.",
        "objective": "BP 150/95mmHg, HR 78bpm. 의식 명료, 급성 병색 없음.",
        "assessment": "I10 본태성 고혈압 - 혈압 조절 불량, 경미한 두통 동반",
        "plan": "1. 암로디핀 5mg → 10mg 증량\n2. 2주 후 재진\n3. 가정 혈압 측정 교육",
        "vitals": {
            "sbp": 150,
            "dbp": 95,
            "hr": 78,
            "bt": None,
            "rr": None,
            "spo2": None,
            "bmi": None,
        },
        "kcd_codes": [{"code": "I10", "description": "본태성 고혈압"}],
        "labs": [],
        "health_promotion": {
            "smoking_cessation": False,
            "alcohol_reduction": False,
            "exercise": True,
            "diet": True,
        },
        "unresolved_abbreviations": [],
        "warnings": [],
    }
)


async def _setup_patient_with_rx(db: AsyncSession) -> tuple[Patient, User]:
    user = User(
        username="soap_doc",
        hashed_password=hash_password("pass1234"),
        name="SOAP의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    patient = Patient(
        chart_no="S-0001",
        name="테스트환자",
        birth_date=date(1955, 6, 1),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=["I10"],
        allergies=["페니실린"],
    )
    db.add(patient)
    await db.flush()

    rx = Prescription(
        patient_id=patient.id,
        drug_name="Amlodipine 5mg",
        ingredient_inn="amlodipine",
        atc_code="C08CA01",
        dose="5mg",
        frequency="QD",
        is_active=True,
        prescribed_by=PrescribedBy.보건소,
    )
    db.add(rx)
    await db.commit()
    await db.refresh(patient)
    await db.refresh(user)

    return patient, user


def _mock_llm_service() -> AsyncMock:
    mock = AsyncMock()
    mock.generate_with_cache = AsyncMock(
        return_value=LLMResponse(
            content=MOCK_LLM_RESPONSE,
            model="claude-sonnet-4-6-20260401",
            input_tokens=2000,
            output_tokens=500,
            cache_read_tokens=1800,
            cost_usd=0.003,
            latency_ms=1200.0,
        )
    )
    return mock


@pytest.mark.asyncio
async def test_soap_convert(db_session: AsyncSession) -> None:
    patient, user = await _setup_patient_with_rx(db_session)
    mock_llm = _mock_llm_service()
    service = SOAPService(mock_llm)

    result = await service.convert(
        raw_input="두통 어지러움 2일 BP 150/95 HR 78 HTN med 조절",
        patient_id=patient.id,
        visit_type=VisitType.재진,
        user_personal_codebook=None,
        db=db_session,
    )

    assert result.subjective != ""
    assert result.objective != ""
    assert result.assessment != ""
    assert result.plan != ""
    assert result.vitals["sbp"] == 150
    assert result.vitals["dbp"] == 95
    assert len(result.kcd_codes) == 1
    assert result.kcd_codes[0]["code"] == "I10"
    assert result.llm_meta["model"] == "claude-sonnet-4-6-20260401"
    assert result.llm_meta["latency_ms"] == 1200.0

    # LLM was called exactly once
    mock_llm.generate_with_cache.assert_called_once()


@pytest.mark.asyncio
async def test_soap_convert_with_sick_day(db_session: AsyncSession) -> None:
    """When sick day keyword is in input and patient has relevant drugs."""
    patient, user = await _setup_patient_with_rx(db_session)

    # Add metformin to prescriptions
    rx = Prescription(
        patient_id=patient.id,
        drug_name="Metformin 500mg",
        ingredient_inn="metformin",
        atc_code="A10BA02",
        dose="500mg",
        frequency="BID",
        is_active=True,
        prescribed_by=PrescribedBy.보건소,
    )
    db_session.add(rx)
    await db_session.commit()

    mock_llm = _mock_llm_service()
    service = SOAPService(mock_llm)

    result = await service.convert(
        raw_input="발열 38.5 폐렴 의심 BP 150/95 HR 78",
        patient_id=patient.id,
        visit_type=VisitType.재진,
        user_personal_codebook=None,
        db=db_session,
    )

    # Should detect sick day alert for metformin
    assert len(result.sick_day_alerts) > 0
    met_alerts = [a for a in result.sick_day_alerts if "metformin" in a["ingredient"].lower()]
    assert len(met_alerts) == 1
    assert met_alerts[0]["action"] == "HOLD"


@pytest.mark.asyncio
async def test_soap_convert_hallucination_guard(db_session: AsyncSession) -> None:
    """Vitals mismatch between pre-extracted and LLM output triggers warning."""
    patient, user = await _setup_patient_with_rx(db_session)

    # LLM says sbp=150 but input has BP 130/80 → mismatch
    mock_llm = _mock_llm_service()
    service = SOAPService(mock_llm)

    result = await service.convert(
        raw_input="BP 130/80 HR 72 경과 관찰",
        patient_id=patient.id,
        visit_type=VisitType.재진,
        user_personal_codebook=None,
        db=db_session,
    )

    # Pre-extracted: sbp=130, LLM output: sbp=150 → vital_mismatch error
    mismatch_warnings = [w for w in result.warnings if w["type"] == "vital_mismatch"]
    assert len(mismatch_warnings) > 0


@pytest.mark.asyncio
async def test_soap_convert_subjective_filter(db_session: AsyncSession) -> None:
    """Subjective expressions in LLM output trigger warnings."""
    patient, user = await _setup_patient_with_rx(db_session)

    # Mock response with subjective expression "조절 불충분"
    mock_llm = _mock_llm_service()
    service = SOAPService(mock_llm)

    result = await service.convert(
        raw_input="HTN f/u BP 150/95 HR 78",
        patient_id=patient.id,
        visit_type=VisitType.재진,
        user_personal_codebook=None,
        db=db_session,
    )

    # The mock response contains "불충분" in assessment
    subj_warnings = [w for w in result.warnings if w["type"] == "subjective_expression"]
    assert len(subj_warnings) > 0


@pytest.mark.asyncio
async def test_soap_convert_patient_not_found(db_session: AsyncSession) -> None:
    import uuid

    mock_llm = _mock_llm_service()
    service = SOAPService(mock_llm)

    with pytest.raises(ValueError, match="환자를 찾을 수 없습니다"):
        await service.convert(
            raw_input="test",
            patient_id=uuid.uuid4(),
            visit_type=VisitType.초진,
            user_personal_codebook=None,
            db=db_session,
        )
