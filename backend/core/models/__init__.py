# Alembic autogenerate가 모든 모델을 감지할 수 있도록 전체 import
from core.models.audit_log import AuditLog
from core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from core.models.document import MedicalDocument
from core.models.encounter import Encounter
from core.models.enums import (
    AlertPriority,
    AlertType,
    DocStatus,
    DocType,
    DrugRoute,
    InsuranceType,
    MessagingMethod,
    PrescribedBy,
    ScreeningType,
    Sex,
    UserRole,
    VisitType,
)
from core.models.follow_up_alert import FollowUpAlert
from core.models.patient import Patient
from core.models.prescription import Prescription
from core.models.screening import ScreeningResult
from core.models.user import User
from core.models.visit_schedule import VisitSchedule

__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "User",
    "Patient",
    "Encounter",
    "Prescription",
    "ScreeningResult",
    "MedicalDocument",
    "VisitSchedule",
    "FollowUpAlert",
    "AuditLog",
    # Enums
    "Sex",
    "InsuranceType",
    "UserRole",
    "VisitType",
    "DrugRoute",
    "PrescribedBy",
    "MessagingMethod",
    "AlertType",
    "AlertPriority",
    "DocType",
    "DocStatus",
    "ScreeningType",
]
