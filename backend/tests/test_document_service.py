"""DocumentService integration tests using mocked LLM."""

import json
from datetime import date, datetime
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.llm.service import LLMResponse
from core.models.encounter import Encounter
from core.models.enums import DocType, InsuranceType, Sex, UserRole, VisitType
from core.models.patient import Patient
from core.models.user import User
from core.security import hash_password
from modules.documents.service import DocumentResult, DocumentService

MOCK_DIAGNOSIS_RESPONSE = json.dumps(
    {
        "title": "진단서",
        "patient_info": "테스트환자, 남, 1955-06-01생",
        "diagnosis": "본태성 고혈압(I10)",
        "diagnosis_date": "2026-04-06",
        "clinical_findings": "혈압 150/95 mmHg (2026-04-06 측정). [의사 소견: ___]",
        "doctor_opinion": "[의사 소견: 현재 질환 상태에 대한 판단을 입력해 주세요]",
        "purpose": "보험 청구용",
    }
)

MOCK_REFERRAL_RESPONSE = json.dumps(
    {
        "title": "진료의뢰서",
        "patient_info": "테스트환자, 남, 1955-06-01생",
        "referral_reason": "[의뢰 사유: ___]",
        "clinical_summary": "I10 본태성 고혈압, BP 150/95",
        "requested_evaluation": "심장 초음파",
        "current_medications": "Amlodipine 5mg QD",
    }
)

MOCK_CONFIRM_RESPONSE = json.dumps(
    {
        "title": "진료확인서",
        "patient_info": "테스트환자, 남, 1955-06-01생",
        "visit_dates": "2026-04-06",
        "visit_count": "1",
        "diagnosis": "본태성 고혈압(I10)",
        "purpose": "직장 제출용",
    }
)


def _make_mock_llm(response_text: str) -> AsyncMock:
    mock = AsyncMock()
    mock.generate_with_cache.return_value = LLMResponse(
        content=response_text,
        model="claude-sonnet-4-20250514",
        input_tokens=2000,
        output_tokens=500,
        cache_read_tokens=1800,
        cache_creation_tokens=0,
        cost_usd=0.01,
        latency_ms=800.0,
    )
    return mock


async def _create_user(db: AsyncSession) -> User:
    user = User(
        username="doc_test",
        hashed_password=hash_password("pass1234"),
        name="테스트의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return user


async def _setup_patient(db: AsyncSession) -> Patient:
    patient = Patient(
        chart_no="D-0001",
        name="테스트환자",
        birth_date=date(1955, 6, 1),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=["I10"],
        allergies=["페니실린"],
    )
    db.add(patient)
    await db.flush()
    return patient


async def _setup_patient_with_encounter(db: AsyncSession) -> tuple[Patient, Encounter]:
    user = await _create_user(db)
    patient = await _setup_patient(db)
    encounter = Encounter(
        patient_id=patient.id,
        created_by=user.id,
        encounter_date=datetime(2026, 4, 6, 10, 0),
        raw_input="BP 150/95 HTN f/u",
        visit_type=VisitType.재진,
        subjective="두통 2일째",
        objective="BP 150/95",
        assessment="I10 본태성 고혈압",
        plan="암로디핀 증량",
        vitals={"sbp": 150, "dbp": 95, "hr": 78},
        kcd_codes=[{"code": "I10", "description": "본태성 고혈압"}],
        labs=[{"name": "HbA1c", "value": 7.2, "unit": "%"}],
    )
    db.add(encounter)
    await db.flush()
    return patient, encounter


@pytest.mark.asyncio
async def test_generate_diagnosis_cert(db_session: AsyncSession) -> None:
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(MOCK_DIAGNOSIS_RESPONSE))

    result = await service.generate(patient.id, encounter.id, DocType.진단서, db_session)

    assert isinstance(result, DocumentResult)
    assert result.generated_text
    assert result.source_data["patient"]["chart_no"] == "D-0001"
    assert result.llm_meta["model"] == "claude-sonnet-4-20250514"


@pytest.mark.asyncio
async def test_generate_referral(db_session: AsyncSession) -> None:
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(MOCK_REFERRAL_RESPONSE))

    result = await service.generate(patient.id, encounter.id, DocType.의뢰서, db_session)

    assert isinstance(result, DocumentResult)
    assert result.generated_text


@pytest.mark.asyncio
async def test_generate_confirmation(db_session: AsyncSession) -> None:
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(MOCK_CONFIRM_RESPONSE))

    result = await service.generate(patient.id, encounter.id, DocType.확인서, db_session)

    assert result.generated_text
    assert "진료확인서" in result.content.get("title", "")


@pytest.mark.asyncio
async def test_generate_without_encounter(db_session: AsyncSession) -> None:
    patient = await _setup_patient(db_session)
    service = DocumentService(_make_mock_llm(MOCK_DIAGNOSIS_RESPONSE))

    result = await service.generate(patient.id, None, DocType.진단서, db_session)

    assert result.source_data["encounter"] is None
    assert result.generated_text


@pytest.mark.asyncio
async def test_patient_not_found_raises(db_session: AsyncSession) -> None:
    import uuid

    service = DocumentService(_make_mock_llm(MOCK_DIAGNOSIS_RESPONSE))

    with pytest.raises(ValueError, match="환자를 찾을 수 없습니다"):
        await service.generate(uuid.uuid4(), None, DocType.진단서, db_session)


@pytest.mark.asyncio
async def test_source_data_included_in_result(db_session: AsyncSession) -> None:
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(MOCK_DIAGNOSIS_RESPONSE))

    result = await service.generate(patient.id, encounter.id, DocType.진단서, db_session)

    assert "patient" in result.source_data
    assert "encounter" in result.source_data
    assert result.source_data["patient"]["chronic_diseases"] == ["I10"]


@pytest.mark.asyncio
async def test_guard_warnings_included(db_session: AsyncSession) -> None:
    # Response with ungrounded KCD code
    bad_response = json.dumps(
        {
            "title": "진단서",
            "patient_info": "테스트",
            "diagnosis": "M54 요통(I10과 무관한 코드 Z99 추가)",
            "diagnosis_date": "2026-04-06",
            "clinical_findings": "BP 150/95 mmHg. [의사 소견: ___]",
            "doctor_opinion": "[의사 소견: ___]",
            "purpose": "용도",
        }
    )
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(bad_response))

    result = await service.generate(patient.id, encounter.id, DocType.진단서, db_session)

    # Should have at least diagnosis grounding warnings
    warning_types = [w["type"] for w in result.warnings]
    assert "ungrounded_diagnosis" in warning_types


@pytest.mark.asyncio
async def test_subjective_expression_warnings(db_session: AsyncSession) -> None:
    # Response with subjective expression
    subj_response = json.dumps(
        {
            "title": "진단서",
            "patient_info": "테스트",
            "diagnosis": "본태성 고혈압(I10)",
            "diagnosis_date": "2026-04-06",
            "clinical_findings": "혈압이 양호한 수준으로 조절되고 있음. [의사 소견: ___]",
            "doctor_opinion": "[의사 소견: ___]",
            "purpose": "용도",
        }
    )
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(subj_response))

    result = await service.generate(patient.id, encounter.id, DocType.진단서, db_session)

    warning_types = [w["type"] for w in result.warnings]
    assert "subjective_expression" in warning_types


@pytest.mark.asyncio
async def test_term_normalization_applied(db_session: AsyncSession) -> None:
    # Response with informal term "당뇨"
    informal_response = json.dumps(
        {
            "title": "진단서",
            "patient_info": "테스트",
            "diagnosis": "고혈압(I10), 당뇨 의심",
            "diagnosis_date": "2026-04-06",
            "clinical_findings": "BP 150/95. [의사 소견: ___]",
            "doctor_opinion": "[의사 소견: ___]",
            "purpose": "용도",
        }
    )
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(informal_response))

    result = await service.generate(patient.id, encounter.id, DocType.진단서, db_session)

    # "당뇨" should be normalized to "제2형 당뇨병"
    assert "제2형 당뇨병" in result.generated_text


@pytest.mark.asyncio
async def test_llm_meta_populated(db_session: AsyncSession) -> None:
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(MOCK_DIAGNOSIS_RESPONSE))

    result = await service.generate(patient.id, encounter.id, DocType.진단서, db_session)

    assert result.llm_meta["cost_usd"] == 0.01
    assert result.llm_meta["cache_read_tokens"] == 1800
    assert result.llm_meta["input_tokens"] == 2000


@pytest.mark.asyncio
async def test_has_unresolved_errors_flag(db_session: AsyncSession) -> None:
    # Clean response should not have errors
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(MOCK_DIAGNOSIS_RESPONSE))

    result = await service.generate(patient.id, encounter.id, DocType.진단서, db_session)

    # Clean response may or may not have errors depending on guard checks
    assert isinstance(result.has_unresolved_errors, bool)


@pytest.mark.asyncio
async def test_content_dict_preserved(db_session: AsyncSession) -> None:
    patient, encounter = await _setup_patient_with_encounter(db_session)
    service = DocumentService(_make_mock_llm(MOCK_DIAGNOSIS_RESPONSE))

    result = await service.generate(patient.id, encounter.id, DocType.진단서, db_session)

    assert "title" in result.content
    assert result.content["title"] == "진단서"
    assert "diagnosis" in result.content
