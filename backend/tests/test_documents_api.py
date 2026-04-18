"""Document Automation API integration tests."""

from datetime import date, datetime
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.document import MedicalDocument
from core.models.enums import DocStatus, DocType, InsuranceType, Sex, UserRole
from core.models.patient import Patient
from core.models.user import User
from core.security import create_access_token, hash_password


async def _create_user(db: AsyncSession, username: str, role: UserRole) -> tuple[User, str]:
    user = User(
        username=username,
        hashed_password=hash_password("testpass"),
        name="API테스트사용자",
        role=role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user, create_access_token(data={"sub": str(user.id)})


async def _setup(
    db: AsyncSession,
    username: str = "doc_api_test",
    role: UserRole = UserRole.doctor,
) -> tuple[Patient, User, str]:
    user, token = await _create_user(db, username, role)

    patient = Patient(
        chart_no="D-0001",
        name="문서테스트환자",
        birth_date=date(1970, 5, 20),
        sex=Sex.F,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=["I10"],
        allergies=[],
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)

    return patient, user, token


async def _make_doc(
    db: AsyncSession,
    patient: Patient,
    user: User,
    status: DocStatus = DocStatus.draft,
    doc_type: DocType = DocType.진단서,
    created_at: datetime | None = None,
) -> MedicalDocument:
    doc = MedicalDocument(
        patient_id=patient.id,
        doc_type=doc_type,
        title=f"테스트 {doc_type}",
        content={"title": doc_type.value, "diagnosis": "본태성 고혈압(I10)"},
        generated_text=f"본태성 고혈압(I10) {doc_type}",
        status=status,
        created_by=user.id,
    )
    db.add(doc)
    await db.commit()
    if created_at is not None:
        doc.created_at = created_at
        doc.updated_at = created_at
        await db.commit()
    await db.refresh(doc)
    return doc


# --- Source data ---


@pytest.mark.asyncio
async def test_source_data_endpoint(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /documents/source-data 는 원본 데이터 dict를 반환한다."""
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/documents/source-data",
        json={"patient_id": str(patient.id), "doc_type": "진단서"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "patient" in data
    assert data["patient"]["chart_no"] == "D-0001"


# --- Save ---


@pytest.mark.asyncio
async def test_save_document(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /documents 는 201을 반환하고 draft 상태로 저장한다."""
    patient, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    body = {
        "patient_id": str(patient.id),
        "doc_type": "진단서",
        "title": "본태성 고혈압 진단서",
        "content": {"title": "진단서", "diagnosis": "본태성 고혈압(I10)"},
        "generated_text": "본태성 고혈압(I10) 진단서",
    }
    resp = await client.post("/api/v1/documents", json=body, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["patient_id"] == str(patient.id)
    assert data["doc_type"] == "진단서"
    assert data["status"] == "draft"
    assert data["title"] == "본태성 고혈압 진단서"


# --- List ---


@pytest.mark.asyncio
async def test_list_documents(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /documents 는 페이지네이션 목록을 반환한다."""
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    await _make_doc(db_session, patient, user)

    resp = await client.get("/api/v1/documents", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_documents_filter_by_patient(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """GET /documents?patient_id=... 는 해당 환자 문서만 반환한다."""
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # 다른 환자 생성
    other_patient = Patient(
        chart_no="D-0002",
        name="다른환자",
        birth_date=date(1980, 1, 1),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=[],
        allergies=[],
    )
    db_session.add(other_patient)
    await db_session.commit()
    await db_session.refresh(other_patient)

    await _make_doc(db_session, patient, user)
    await _make_doc(db_session, other_patient, user)

    resp = await client.get(
        f"/api/v1/documents?patient_id={patient.id}",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["patient_id"] == str(patient.id)


@pytest.mark.asyncio
async def test_list_documents_filter_by_status_and_doc_type(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    await _make_doc(
        db_session,
        patient,
        user,
        status=DocStatus.reviewed,
        doc_type=DocType.교육문서,
    )
    await _make_doc(
        db_session,
        patient,
        user,
        status=DocStatus.issued,
        doc_type=DocType.진단서,
    )

    resp = await client.get(
        "/api/v1/documents",
        params={"status": "reviewed", "doc_type": "교육문서"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "reviewed"
    assert data["items"][0]["doc_type"] == "교육문서"


@pytest.mark.asyncio
async def test_list_documents_filter_by_date_range(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    await _make_doc(
        db_session,
        patient,
        user,
        created_at=datetime(2026, 4, 10, 9, 0, 0),
    )
    await _make_doc(
        db_session,
        patient,
        user,
        doc_type=DocType.검사결과안내서,
        created_at=datetime(2026, 4, 20, 15, 30, 0),
    )

    resp = await client.get(
        "/api/v1/documents",
        params={"date_from": "2026-04-20", "date_to": "2026-04-20"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["doc_type"] == "검사결과안내서"


@pytest.mark.asyncio
async def test_list_documents_invalid_date_range(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, _, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get(
        "/api/v1/documents",
        params={"date_from": "2026-04-21", "date_to": "2026-04-20"},
        headers=headers,
    )
    assert resp.status_code == 400


# --- Get single ---


@pytest.mark.asyncio
async def test_get_document(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /documents/{id} 는 단일 문서를 반환한다."""
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    doc = await _make_doc(db_session, patient, user)

    resp = await client.get(f"/api/v1/documents/{doc.id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(doc.id)
    assert data["title"] == "테스트 진단서"


@pytest.mark.asyncio
async def test_get_document_not_found(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /documents/{nonexistent} 는 404를 반환한다."""
    _, __, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get(
        "/api/v1/documents/00000000-0000-0000-0000-000000000000",
        headers=headers,
    )
    assert resp.status_code == 404


# --- Update ---


@pytest.mark.asyncio
async def test_update_document(client: AsyncClient, db_session: AsyncSession) -> None:
    """PUT /documents/{id} 는 제공된 필드만 업데이트한다."""
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    doc = await _make_doc(db_session, patient, user)

    resp = await client.put(
        f"/api/v1/documents/{doc.id}",
        json={"generated_text": "수정된 진단서 내용", "status": "reviewed"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["generated_text"] == "수정된 진단서 내용"
    assert data["status"] == "reviewed"
    # title은 변경되지 않아야 함
    assert data["title"] == "테스트 진단서"


# --- Issue ---


@pytest.mark.asyncio
async def test_issue_document(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /documents/{id}/issue 는 reviewed → issued 전환 및 issued_at 설정."""
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    doc = await _make_doc(db_session, patient, user, status=DocStatus.reviewed)

    resp = await client.post(f"/api/v1/documents/{doc.id}/issue", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "issued"
    assert data["issued_at"] is not None


@pytest.mark.asyncio
async def test_issue_document_wrong_status(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /documents/{id}/issue 는 draft 상태이면 400을 반환한다."""
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    doc = await _make_doc(db_session, patient, user, status=DocStatus.draft)

    resp = await client.post(f"/api/v1/documents/{doc.id}/issue", headers=headers)
    assert resp.status_code == 400


# --- Download ---


@pytest.mark.asyncio
async def test_download_pdf(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /documents/{id}/download?format=pdf 는 PDF 바이트를 반환한다.

    WeasyPrint는 CI 환경에서 시스템 라이브러리(libgobject)가 없어 mock 처리.
    """
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    doc = await _make_doc(db_session, patient, user)

    fake_pdf = b"%PDF-1.4 fake pdf content"
    with patch(
        "modules.documents.renderer.DocumentRenderer.render_pdf",
        return_value=fake_pdf,
    ):
        resp = await client.get(
            f"/api/v1/documents/{doc.id}/download?format=pdf",
            headers=headers,
        )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment" in resp.headers["content-disposition"]
    assert len(resp.content) > 0


@pytest.mark.asyncio
async def test_download_docx(client: AsyncClient, db_session: AsyncSession) -> None:
    """GET /documents/{id}/download?format=docx 는 DOCX 바이트를 반환한다."""
    patient, user, token = await _setup(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    doc = await _make_doc(db_session, patient, user)

    resp = await client.get(
        f"/api/v1/documents/{doc.id}/download?format=docx",
        headers=headers,
    )
    assert resp.status_code == 200
    assert "wordprocessingml" in resp.headers["content-type"]
    assert "attachment" in resp.headers["content-disposition"]
    assert len(resp.content) > 0


# --- Auth ---


@pytest.mark.asyncio
async def test_unauthenticated_rejected(client: AsyncClient) -> None:
    """토큰 없는 요청은 401을 반환한다."""
    resp = await client.get("/api/v1/documents")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_nurse_can_access_documents(client: AsyncClient, db_session: AsyncSession) -> None:
    patient, _, token = await _setup(db_session, "doc_nurse", UserRole.nurse)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/v1/documents/source-data",
        json={"patient_id": str(patient.id), "doc_type": "진단서"},
        headers=headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_forbidden_from_documents(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    patient, _, token = await _setup(db_session, "doc_admin", UserRole.admin)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/v1/documents", headers=headers)
    assert resp.status_code == 403

    save_resp = await client.post(
        "/api/v1/documents",
        json={
            "patient_id": str(patient.id),
            "doc_type": "진단서",
            "title": "차단 테스트",
            "content": {"title": "진단서"},
            "generated_text": "차단",
        },
        headers=headers,
    )
    assert save_resp.status_code == 403
