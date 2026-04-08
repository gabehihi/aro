import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from core.models.enums import InsuranceType, MessagingMethod, Sex


class PatientCreate(BaseModel):
    chart_no: str = Field(max_length=20)
    name: str
    birth_date: date
    sex: Sex
    phone: str | None = None
    address: str | None = None
    insurance_type: InsuranceType
    chronic_diseases: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    memo: str | None = None
    messaging_consent: bool = False
    messaging_method: MessagingMethod | None = None


class PatientUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None
    insurance_type: InsuranceType | None = None
    chronic_diseases: list[str] | None = None
    allergies: list[str] | None = None
    memo: str | None = None
    messaging_consent: bool | None = None
    messaging_method: MessagingMethod | None = None


class PatientResponse(BaseModel):
    id: uuid.UUID
    chart_no: str
    name: str
    birth_date: date
    sex: Sex
    phone: str | None
    address: str | None
    insurance_type: InsuranceType
    chronic_diseases: list[str]
    allergies: list[str]
    memo: str | None
    messaging_consent: bool
    messaging_method: MessagingMethod | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PatientListResponse(BaseModel):
    items: list[PatientResponse]
    total: int
    page: int
    size: int
