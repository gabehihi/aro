import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Date, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from core.models.enums import ScreeningType

if TYPE_CHECKING:
    from core.models.patient import Patient


class ScreeningResult(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "screening_results"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    screening_type: Mapped[ScreeningType] = mapped_column(Enum(ScreeningType), nullable=False)
    screening_date: Mapped[date] = mapped_column(Date, nullable=False)
    results: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    abnormal_findings: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    follow_up_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient")
