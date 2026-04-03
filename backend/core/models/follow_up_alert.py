import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from core.models.enums import AlertPriority, AlertType

if TYPE_CHECKING:
    from core.models.patient import Patient


class FollowUpAlert(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "follow_up_alerts"

    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    alert_type: Mapped[AlertType] = mapped_column(Enum(AlertType), nullable=False)
    item: Mapped[str] = mapped_column(String(100), nullable=False)
    last_value: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    days_overdue: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    priority: Mapped[AlertPriority] = mapped_column(Enum(AlertPriority), nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="follow_up_alerts")
