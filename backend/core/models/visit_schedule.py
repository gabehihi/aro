import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from core.models.patient import Patient


class VisitSchedule(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "visit_schedules"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    planned_tests: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    needs_fasting: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    special_instructions: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    reminder_status: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    visit_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_from: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="visit_schedules")
