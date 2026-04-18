import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from core.models.enums import VisitType


class HealthPromotionSchema(BaseModel):
    smoking_cessation: bool = False
    alcohol_reduction: bool = False
    exercise: bool = False
    diet: bool = False


class WarningSchema(BaseModel):
    type: str
    message: str
    severity: str
    location: str | None = None


class LLMMetaSchema(BaseModel):
    model: str = ""
    latency_ms: float = 0
    cost_usd: float = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0


# --- Encounter CRUD ---


class EncounterCreate(BaseModel):
    patient_id: uuid.UUID
    raw_input: str
    visit_type: VisitType
    encounter_date: datetime
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""
    vitals: dict | None = None
    kcd_codes: list[dict] = Field(default_factory=list)
    labs: list[dict] = Field(default_factory=list)
    health_promotion: dict | None = None
    referral_flag: bool = False
    external_referral_note: str | None = None
    next_visit_date: date | None = None
    next_visit_tests: list[str] = Field(default_factory=list)
    next_visit_fasting: bool = False


class EncounterUpdate(BaseModel):
    subjective: str | None = None
    objective: str | None = None
    assessment: str | None = None
    plan: str | None = None
    vitals: dict | None = None
    kcd_codes: list[dict] | None = None
    labs: list[dict] | None = None
    health_promotion: dict | None = None
    referral_flag: bool | None = None
    external_referral_note: str | None = None
    next_visit_date: date | None = None
    next_visit_tests: list[str] | None = None
    next_visit_fasting: bool | None = None


class EncounterResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    encounter_date: datetime
    raw_input: str
    visit_type: VisitType
    subjective: str | None
    objective: str | None
    assessment: str | None
    plan: str | None
    vitals: dict | None
    kcd_codes: list
    labs: list
    health_promotion: dict | None
    referral_flag: bool
    external_referral_note: str | None
    next_visit_date: date | None
    next_visit_tests: list
    next_visit_fasting: bool
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EncounterListResponse(BaseModel):
    items: list[EncounterResponse]
    total: int
    page: int
    size: int


# --- Clinical summary (dashboard) ---


class ClinicalSummaryResponse(BaseModel):
    patient_id: uuid.UUID
    recent_vitals: list[dict]
    recent_labs: list[dict]
    recent_encounters: list[dict]
    follow_up_alerts: list["ClinicalFollowUpAlertSchema"]


class ClinicalFollowUpAlertSchema(BaseModel):
    id: uuid.UUID
    alert_type: str
    item: str
    last_value: str | None
    last_date: date | None
    due_date: date
    days_overdue: int
    priority: str
    resolved: bool


# --- SOAP prefill (template-based SOAP writer) ---


class PrefillLabSchema(BaseModel):
    name: str
    value: float | None = None
    unit: str = ""
    flag: str | None = None
    measured_at: datetime


class SOAPPrefillResponse(BaseModel):
    """직전 encounter 기반 템플릿 SOAP Writer 프리필."""

    # DiseaseId[] — HTN/DM/DL/OB/MASLD/OP/CKD/HypoT/HyperT
    selected_diseases: list[str]
    chronic_vs: dict  # {sbp, dbp, hr, bt, rr, spo2, bw, bh, waist, bmi}
    labs_by_name: dict[str, PrefillLabSchema]  # 최근값 (180일 이내)
    other_labs: list[PrefillLabSchema] = Field(default_factory=list)
    education_flags: HealthPromotionSchema
    last_encounter_date: datetime | None
