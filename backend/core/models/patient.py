from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Date, Enum, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from core.models.encryption import EncryptedString
from core.models.enums import InsuranceType, MessagingMethod, Sex

if TYPE_CHECKING:
    from core.models.encounter import Encounter
    from core.models.follow_up_alert import FollowUpAlert
    from core.models.prescription import Prescription
    from core.models.visit_schedule import VisitSchedule


class Patient(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "patients"

    chart_no: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(EncryptedString, nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    sex: Mapped[Sex] = mapped_column(Enum(Sex), nullable=False)
    phone: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    address: Mapped[str | None] = mapped_column(String(200), nullable=True)
    insurance_type: Mapped[InsuranceType] = mapped_column(Enum(InsuranceType), nullable=False)
    chronic_diseases: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    allergies: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    messaging_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    messaging_method: Mapped[MessagingMethod | None] = mapped_column(
        Enum(MessagingMethod), nullable=True
    )

    # Relationships
    encounters: Mapped[list["Encounter"]] = relationship(
        "Encounter", back_populates="patient", cascade="all, delete-orphan"
    )
    prescriptions: Mapped[list["Prescription"]] = relationship(
        "Prescription", back_populates="patient", cascade="all, delete-orphan"
    )
    visit_schedules: Mapped[list["VisitSchedule"]] = relationship(
        "VisitSchedule", back_populates="patient", cascade="all, delete-orphan"
    )
    follow_up_alerts: Mapped[list["FollowUpAlert"]] = relationship(
        "FollowUpAlert", back_populates="patient", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_patients_chart_no", "chart_no"),)
