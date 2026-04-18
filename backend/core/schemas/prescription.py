import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from core.models.enums import DrugRoute, PrescribedBy


class PrescriptionCreate(BaseModel):
    encounter_id: uuid.UUID | None = None
    drug_name: str | None = None
    drug_code: str | None = None
    ingredient_inn: str | None = None
    atc_code: str | None = None
    drugbank_id: str | None = None
    dose: str | None = None
    frequency: str | None = None
    duration_days: int | None = Field(default=None, ge=1)
    route: DrugRoute | None = None
    prescribed_by: PrescribedBy = PrescribedBy.보건소
    source_hospital: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool = True


class PrescriptionUpdate(BaseModel):
    drug_name: str | None = None
    drug_code: str | None = None
    ingredient_inn: str | None = None
    atc_code: str | None = None
    drugbank_id: str | None = None
    dose: str | None = None
    frequency: str | None = None
    duration_days: int | None = Field(default=None, ge=1)
    route: DrugRoute | None = None
    prescribed_by: PrescribedBy | None = None
    source_hospital: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class PrescriptionResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    encounter_id: uuid.UUID | None
    drug_name: str | None
    drug_code: str | None
    ingredient_inn: str | None
    atc_code: str | None
    drugbank_id: str | None
    dose: str | None
    frequency: str | None
    duration_days: int | None
    route: DrugRoute | None
    is_active: bool
    prescribed_by: PrescribedBy
    source_hospital: str | None
    start_date: date | None
    end_date: date | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
