"""Pydantic schemas for Document Automation API."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from core.models.enums import DocStatus, DocType
from core.schemas.encounter import LLMMetaSchema, WarningSchema


class DocumentGenerateRequest(BaseModel):
    patient_id: uuid.UUID
    encounter_id: uuid.UUID | None = None
    doc_type: DocType


class SourceDataRequest(BaseModel):
    patient_id: uuid.UUID
    encounter_id: uuid.UUID | None = None
    doc_type: DocType


class DocumentGenerateResponse(BaseModel):
    generated_text: str
    content: dict
    source_data: dict
    warnings: list[WarningSchema]
    has_unresolved_errors: bool
    llm_meta: LLMMetaSchema


class DocumentSaveRequest(BaseModel):
    patient_id: uuid.UUID
    encounter_id: uuid.UUID | None = None
    doc_type: DocType
    title: str
    content: dict
    generated_text: str


class DocumentUpdateRequest(BaseModel):
    generated_text: str | None = None
    content: dict | None = None
    status: DocStatus | None = None


class DocumentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    encounter_id: uuid.UUID | None
    doc_type: DocType
    title: str
    content: dict
    generated_text: str | None
    file_path: str | None
    status: DocStatus
    created_by: uuid.UUID
    issued_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    size: int
