import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from core.models.enums import DrugRoute, PrescribedBy

if TYPE_CHECKING:
    from core.models.patient import Patient


class Prescription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "prescriptions"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    encounter_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("encounters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    drug_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    drug_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ingredient_inn: Mapped[str | None] = mapped_column(String(200), nullable=True)
    atc_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    drugbank_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dose: Mapped[str | None] = mapped_column(String(50), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(50), nullable=True)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    route: Mapped[DrugRoute | None] = mapped_column(Enum(DrugRoute), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    prescribed_by: Mapped[PrescribedBy] = mapped_column(Enum(PrescribedBy), nullable=False)
    source_hospital: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="prescriptions")
