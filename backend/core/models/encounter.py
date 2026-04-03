import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from core.models.enums import VisitType

if TYPE_CHECKING:
    from core.models.patient import Patient
    from core.models.user import User


class Encounter(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "encounters"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    encounter_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    raw_input: Mapped[str] = mapped_column(Text, nullable=False)
    subjective: Mapped[str | None] = mapped_column(Text, nullable=True)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    assessment: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    kcd_codes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    vitals: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    labs: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    health_promotion: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    referral_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    external_referral_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_visit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_visit_tests: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    next_visit_fasting: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    visit_type: Mapped[VisitType] = mapped_column(Enum(VisitType), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="encounters")
    creator: Mapped["User"] = relationship("User")
