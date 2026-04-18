"""Encounter CRUD integration tests."""

import json
from datetime import UTC, date, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.encounter import Encounter
from core.models.enums import (
    AlertPriority,
    AlertType,
    InsuranceType,
    Sex,
    UserRole,
    VisitType,
)
from core.models.follow_up_alert import FollowUpAlert
from core.models.patient import Patient
from core.models.user import User
from core.security import create_access_token, hash_password


async def _create_user(db: AsyncSession, username: str, role: UserRole) -> tuple[User, str]:
    user = User(
        username=username,
        hashed_password=hash_password("pass1234"),
        name="진료사용자",
        role=role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user, create_access_token(data={"sub": str(user.id)})


async def _setup(db: AsyncSession) -> tuple[Patient, User, str]:
    user, token = await _create_user(db, "enc_doc", UserRole.doctor)

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
    await db.refresh(patient)

    return patient, user, token


async def _setup_with_role(
    db: AsyncSession,
    username: str,
    role: UserRole,
) -> tuple[Patient, User, str]:
    user, token = await _create_user(db, username, role)

    patient = Patient(
        chart_no=f"{username[:4]}-0001",
        name="진료환자",
        birth_date=date(1960, 3, 15),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=["I10", "E11"],
        allergies=[],
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)

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
async def test_template_v2_round_trip_from_save_to_prefill(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    snapshot = {
        "mode": "chronic",
        "chronic": {
            "selectedDiseases": ["HTN", "CKD"],
            "vitals": {"sbp": "126", "dbp": "74", "bt": "36.7", "waist": "87"},
            "labs": {"acr": "38", "hb": "13.5"},
            "otherLabs": [{"name": "CRP", "value": "0.2", "unit": "mg/dL"}],
        },
        "acute": {
            "toggles": [{"symptomId": "cough", "sign": "+"}],
            "assessment": {"diagnosis": "Acute bronchitis"},
        },
        "overrides": {"o": "사용자 수정 Objective"},
    }
    body = {
        "patient_id": str(patient.id),
        "raw_input": f"TEMPLATE_V2|{json.dumps(snapshot, ensure_ascii=False)}",
        "visit_type": "재진",
        "encounter_date": "2026-04-18T09:30:00",
        "subjective": "혈압약 복용 중, 기침은 호전됨",
        "objective": "V/S : 126/74, 36.7℃\nACR 38 mg/g\nHb 13.5 g/dL\nCRP 0.2 mg/dL",
        "assessment": "# 고혈압\n# 만성콩팥병",
        "plan": "약 유지, 3개월 후 재진",
        "vitals": {
            "sbp": 126,
            "dbp": 74,
            "bt": 36.7,
            "bw": 68.0,
            "bh": 169.0,
            "waist": 87.0,
            "bmi": 23.8,
        },
        "kcd_codes": [
            {"code": "I10", "description": "본태성 고혈압"},
            {"code": "N18.9", "description": "만성 콩팥병"},
        ],
        "labs": [
            {"name": "ACR", "value": 38.0, "unit": "mg/g", "flag": "H"},
            {"name": "Hb", "value": 13.5, "unit": "g/dL", "flag": None},
            {"name": "CRP", "value": 0.2, "unit": "mg/dL", "flag": None},
        ],
        "health_promotion": {
            "smoking_cessation": False,
            "alcohol_reduction": False,
            "exercise": True,
            "diet": True,
        },
    }

    create_resp = await client.post("/api/v1/encounters", json=body, headers=headers)
    assert create_resp.status_code == 201
    encounter_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/v1/encounters/{encounter_id}", headers=headers)
    assert get_resp.status_code == 200
    saved = get_resp.json()
    version, payload = saved["raw_input"].split("|", 1)
    restored = json.loads(payload)
    assert version == "TEMPLATE_V2"
    assert restored["mode"] == "chronic"
    assert restored["chronic"]["selectedDiseases"] == ["HTN", "CKD"]
    assert restored["chronic"]["vitals"]["waist"] == "87"
    assert restored["chronic"]["otherLabs"] == [{"name": "CRP", "value": "0.2", "unit": "mg/dL"}]
    assert restored["acute"]["assessment"]["diagnosis"] == "Acute bronchitis"
    assert restored["overrides"]["o"] == "사용자 수정 Objective"

    prefill_resp = await client.get(
        f"/api/v1/patients/{patient.id}/soap-prefill",
        headers=headers,
    )
    assert prefill_resp.status_code == 200
    prefill = prefill_resp.json()
    assert prefill["selected_diseases"] == ["HTN", "CKD"]
    assert prefill["chronic_vs"]["sbp"] == 126
    assert prefill["chronic_vs"]["waist"] == 87.0
    assert prefill["labs_by_name"]["acr"]["value"] == 38.0
    assert prefill["labs_by_name"]["hb"]["value"] == 13.5
    assert prefill["other_labs"] == [
        {
            "name": "CRP",
            "value": 0.2,
            "unit": "mg/dL",
            "flag": None,
            "measured_at": "2026-04-18T09:30:00",
        }
    ]


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
    db_session.add(
        FollowUpAlert(
            patient_id=patient.id,
            alert_type=AlertType.screening_fu,
            item="HbA1c",
            last_value="8.1",
            last_date=date.today(),
            due_date=date.today(),
            days_overdue=0,
            priority=AlertPriority.urgent,
            resolved=False,
        )
    )
    await db_session.commit()

    resp = await client.get(
        f"/api/v1/patients/{patient.id}/clinical-summary",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["patient_id"] == str(patient.id)
    assert len(data["recent_vitals"]) == 1
    assert len(data["recent_encounters"]) == 1
    assert len(data["follow_up_alerts"]) == 1
    assert data["follow_up_alerts"][0]["item"] == "HbA1c"
    assert data["follow_up_alerts"][0]["priority"] == "urgent"


@pytest.mark.asyncio
async def test_encounter_endpoints_forbidden_for_nurse(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, _, token = await _setup_with_role(db_session, "enc_nurse", UserRole.nurse)
    headers = {"Authorization": f"Bearer {token}"}

    body = {**SAMPLE_ENCOUNTER, "patient_id": str(patient.id)}
    create_resp = await client.post("/api/v1/encounters", json=body, headers=headers)
    assert create_resp.status_code == 403

    summary_resp = await client.get(
        f"/api/v1/patients/{patient.id}/clinical-summary",
        headers=headers,
    )
    assert summary_resp.status_code == 403


@pytest.mark.asyncio
async def test_encounters_unauthorized(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/encounters?patient_id=00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_soap_prefill_empty_for_new_patient(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get(
        f"/api/v1/patients/{patient.id}/soap-prefill",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["selected_diseases"] == []
    assert data["labs_by_name"] == {}
    assert data["other_labs"] == []
    assert data["last_encounter_date"] is None


@pytest.mark.asyncio
async def test_soap_prefill_maps_kcd_codes_to_disease_ids(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.now(UTC).replace(tzinfo=None)
    db_session.add_all(
        [
            Encounter(
                patient_id=patient.id,
                encounter_date=now,
                raw_input="TEMPLATE_V2|{}",
                visit_type=VisitType.재진,
                subjective="",
                objective="",
                assessment="# 고혈압 # 당뇨병 # CKD stage III",
                plan="",
                vitals={
                    "sbp": 132,
                    "dbp": 82,
                    "hr": 74,
                    "bt": 36.8,
                    "waist": 90.0,
                    "bw": 70.0,
                    "bh": 170.0,
                    "bmi": 24.2,
                },
                kcd_codes=[
                    {"code": "I10", "description": "본태성(원발성) 고혈압"},
                    {"code": "E11.9", "description": "2형 당뇨병"},
                    {"code": "N18.9", "description": "만성 콩팥병"},
                ],
                labs=[
                    {"name": "HbA1c", "value": 7.1, "unit": "%", "flag": "H"},
                    {"name": "FBS", "value": 122.0, "unit": "mg/dL", "flag": "H"},
                    {"name": "eGFR", "value": 55.0, "unit": "mL/min/1.73", "flag": "L"},
                    {"name": "ACR", "value": 45.0, "unit": "mg/g", "flag": "H"},
                    {"name": "Vit D", "value": 28.0, "unit": "ng/mL", "flag": "L"},
                    {"name": "Hb", "value": 13.2, "unit": "g/dL", "flag": None},
                    {"name": "CRP", "value": 0.4, "unit": "mg/dL", "flag": None},
                ],
                health_promotion={
                    "smoking_cessation": True,
                    "alcohol_reduction": False,
                    "exercise": True,
                    "diet": True,
                },
                created_by=user.id,
            ),
            # 이전 방문 — HbA1c 구값 (최신값이 우선이어야 함)
            Encounter(
                patient_id=patient.id,
                encounter_date=now - timedelta(days=30),
                raw_input="TEMPLATE_V2|{}",
                visit_type=VisitType.재진,
                subjective="",
                objective="",
                assessment="",
                plan="",
                vitals={"sbp": 140, "dbp": 88},
                kcd_codes=[{"code": "I10", "description": "고혈압"}],
                labs=[
                    {"name": "HbA1c", "value": 7.8, "unit": "%", "flag": "H"},
                    {"name": "LDL", "value": 110.0, "unit": "mg/dL", "flag": None},
                    {"name": "T-Chol", "value": 189.0, "unit": "mg/dL", "flag": None},
                ],
                health_promotion=None,
                created_by=user.id,
            ),
        ]
    )
    await db_session.commit()

    resp = await client.get(
        f"/api/v1/patients/{patient.id}/soap-prefill",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    # DISEASE_ORDER 대로 정렬
    assert data["selected_diseases"] == ["HTN", "DM", "CKD"]

    # 최근 encounter 의 vitals 복사
    assert data["chronic_vs"]["sbp"] == 132
    assert data["chronic_vs"]["bt"] == 36.8
    assert data["chronic_vs"]["waist"] == 90.0
    assert data["chronic_vs"]["bmi"] == 24.2

    # HbA1c 는 최신값 (7.1), LDL/TC 는 구 encounter 에서만 존재
    assert data["labs_by_name"]["hba1c"]["value"] == 7.1
    assert data["labs_by_name"]["hba1c"]["flag"] == "H"
    assert data["labs_by_name"]["fbs"]["value"] == 122.0
    assert data["labs_by_name"]["egfr"]["value"] == 55.0
    assert data["labs_by_name"]["acr"]["value"] == 45.0
    assert data["labs_by_name"]["vitd"]["value"] == 28.0
    assert data["labs_by_name"]["hb"]["value"] == 13.2
    assert data["labs_by_name"]["ldl"]["value"] == 110.0
    assert data["labs_by_name"]["tc"]["value"] == 189.0
    assert data["other_labs"][0]["name"] == "CRP"
    assert data["other_labs"][0]["value"] == 0.4

    # health_promotion 복사
    assert data["education_flags"]["smoking_cessation"] is True
    assert data["education_flags"]["exercise"] is True

    assert data["last_encounter_date"] is not None


@pytest.mark.asyncio
async def test_soap_prefill_excludes_labs_older_than_180_days(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    old = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=200)
    db_session.add(
        Encounter(
            patient_id=patient.id,
            encounter_date=old,
            raw_input="TEMPLATE_V2|{}",
            visit_type=VisitType.재진,
            subjective="",
            objective="",
            assessment="",
            plan="",
            vitals={"sbp": 130},
            kcd_codes=[{"code": "I10", "description": "고혈압"}],
            labs=[{"name": "HbA1c", "value": 6.5, "unit": "%", "flag": None}],
            health_promotion=None,
            created_by=user.id,
        )
    )
    await db_session.commit()

    resp = await client.get(
        f"/api/v1/patients/{patient.id}/soap-prefill",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    # 질환은 유지 (kcd_codes 는 cutoff 무관)
    assert "HTN" in data["selected_diseases"]
    # lab 은 180 일 cutoff 로 제외
    assert data["labs_by_name"] == {}


@pytest.mark.asyncio
async def test_soap_prefill_patient_not_found(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get(
        "/api/v1/patients/00000000-0000-0000-0000-000000000000/soap-prefill",
        headers=headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_soap_prefill_forbidden_for_nurse(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, _, token = await _setup_with_role(db_session, "prefill_nurse", UserRole.nurse)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get(
        f"/api/v1/patients/{patient.id}/soap-prefill",
        headers=headers,
    )
    assert resp.status_code == 403
