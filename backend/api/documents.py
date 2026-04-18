"""Document Automation API endpoints."""

import io
import uuid
from datetime import UTC, date, datetime, time, timedelta
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.audit import log_action
from core.database import get_db
from core.llm.service import LLMService
from core.models.document import MedicalDocument
from core.models.enums import DocStatus, DocType, UserRole
from core.models.patient import Patient
from core.models.user import User
from core.schemas.document import (
    DocumentGenerateRequest,
    DocumentGenerateResponse,
    DocumentListResponse,
    DocumentResponse,
    DocumentSaveRequest,
    DocumentUpdateRequest,
    SourceDataRequest,
)
from core.schemas.encounter import LLMMetaSchema, WarningSchema
from core.security import require_role
from modules.documents.assembler import source_assembler
from modules.documents.renderer import document_renderer
from modules.documents.service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])

_doc_service: DocumentService | None = None


def _get_service() -> DocumentService:
    global _doc_service
    if _doc_service is None:
        _doc_service = DocumentService(LLMService())
    return _doc_service


@router.post("/generate", response_model=DocumentGenerateResponse)
async def generate_document(
    body: DocumentGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> DocumentGenerateResponse:
    """AI 문서 생성 미리보기 (저장하지 않음)."""
    service = _get_service()
    try:
        result = await service.generate(
            patient_id=body.patient_id,
            encounter_id=body.encounter_id,
            doc_type=body.doc_type,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e

    return DocumentGenerateResponse(
        generated_text=result.generated_text,
        content=result.content,
        source_data=result.source_data,
        warnings=[WarningSchema(**w) for w in result.warnings],
        has_unresolved_errors=result.has_unresolved_errors,
        llm_meta=LLMMetaSchema(**result.llm_meta) if result.llm_meta else LLMMetaSchema(),
    )


@router.post("/source-data", response_model=dict)
async def get_source_data(
    body: SourceDataRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> dict:
    """문서 생성에 사용될 원본 데이터 미리보기."""
    try:
        source_data = await source_assembler.assemble(
            patient_id=body.patient_id,
            encounter_id=body.encounter_id,
            doc_type=body.doc_type,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    return source_data


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def save_document(
    body: DocumentSaveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> DocumentResponse:
    """의사 확인 후 문서를 초안(draft) 상태로 저장."""
    doc = MedicalDocument(
        patient_id=body.patient_id,
        encounter_id=body.encounter_id,
        doc_type=body.doc_type,
        title=body.title,
        content=body.content,
        generated_text=body.generated_text,
        status=DocStatus.draft,
        created_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    patient_id: uuid.UUID | None = Query(default=None, description="환자 ID로 필터링"),
    doc_status: DocStatus | None = Query(default=None, alias="status"),
    doc_type: DocType | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> DocumentListResponse:
    """문서 목록 조회 (페이지네이션, 환자 ID 필터 선택)."""
    del current_user
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from은 date_to보다 늦을 수 없습니다",
        )

    base_where = []
    if patient_id is not None:
        base_where.append(MedicalDocument.patient_id == patient_id)
    if doc_status is not None:
        base_where.append(MedicalDocument.status == doc_status)
    if doc_type is not None:
        base_where.append(MedicalDocument.doc_type == doc_type)
    if date_from is not None:
        base_where.append(MedicalDocument.created_at >= datetime.combine(date_from, time.min))
    if date_to is not None:
        next_day = date_to + timedelta(days=1)
        base_where.append(MedicalDocument.created_at < datetime.combine(next_day, time.min))

    total_q = select(func.count(MedicalDocument.id))
    if base_where:
        total_q = total_q.where(*base_where)
    total_result = await db.execute(total_q)
    total = total_result.scalar_one()

    items_q = select(MedicalDocument).order_by(MedicalDocument.created_at.desc())
    if base_where:
        items_q = items_q.where(*base_where)
    items_q = items_q.offset((page - 1) * size).limit(size)
    items_result = await db.execute(items_q)
    docs = list(items_result.scalars().all())

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> DocumentResponse:
    """단일 문서 조회."""
    result = await db.execute(select(MedicalDocument).where(MedicalDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="문서를 찾을 수 없습니다",
        )
    return DocumentResponse.model_validate(doc)


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: uuid.UUID,
    body: DocumentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> DocumentResponse:
    """문서 부분 수정 (제공된 필드만 업데이트)."""
    result = await db.execute(select(MedicalDocument).where(MedicalDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="문서를 찾을 수 없습니다",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(doc, field, value)

    await db.commit()
    await db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post("/{document_id}/issue", response_model=DocumentResponse)
async def issue_document(
    document_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> DocumentResponse:
    """문서 발급 처리 (reviewed → issued 전환)."""
    result = await db.execute(select(MedicalDocument).where(MedicalDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="문서를 찾을 수 없습니다",
        )
    if doc.status != DocStatus.reviewed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"발급 처리는 reviewed 상태에서만 가능합니다 (현재: {doc.status})",
        )

    doc.status = DocStatus.issued
    doc.issued_at = datetime.now(tz=UTC)
    await db.commit()
    await db.refresh(doc)
    await log_action(
        db,
        current_user,
        "issue",
        "document",
        str(document_id),
        details={"doc_type": str(doc.doc_type), "patient_id": str(doc.patient_id)},
        request=request,
    )
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    request: Request,
    format: str = Query(default="pdf", pattern="^(pdf|docx)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.doctor, UserRole.nurse)),
) -> StreamingResponse:
    """문서 파일 다운로드 (PDF 또는 DOCX)."""
    doc_result = await db.execute(select(MedicalDocument).where(MedicalDocument.id == document_id))
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="문서를 찾을 수 없습니다",
        )

    patient_result = await db.execute(select(Patient).where(Patient.id == doc.patient_id))
    patient = patient_result.scalar_one_or_none()
    patient_name = patient.name if patient else ""

    doc_type: DocType = doc.doc_type

    if format == "pdf":
        file_bytes = document_renderer.render_pdf(doc_type, doc.content, patient_name)
        media_type = "application/pdf"
        filename = f"{doc_type.value}_{document_id}.pdf"
    else:
        file_bytes = document_renderer.render_docx(doc_type, doc.content, patient_name)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"{doc_type.value}_{document_id}.docx"

    await log_action(
        db,
        current_user,
        "download",
        "document",
        str(document_id),
        details={"format": format, "doc_type": doc_type.value, "patient_id": str(doc.patient_id)},
        request=request,
    )

    encoded_filename = quote(filename, safe="")
    content_disposition = f"attachment; filename=\"document\"; filename*=UTF-8''{encoded_filename}"

    return StreamingResponse(
        content=io.BytesIO(file_bytes),
        media_type=media_type,
        headers={"Content-Disposition": content_disposition},
    )
