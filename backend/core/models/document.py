import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from core.models.enums import DocStatus, DocType

if TYPE_CHECKING:
    from core.models.patient import Patient
    from core.models.user import User


class MedicalDocument(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "medical_documents"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    doc_type: Mapped[DocType] = mapped_column(Enum(DocType), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    generated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[DocStatus] = mapped_column(
        Enum(DocStatus), default=DocStatus.draft, nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    issued_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient")
    creator: Mapped["User"] = relationship("User")
