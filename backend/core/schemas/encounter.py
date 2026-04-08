import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from core.models.enums import VisitType

# --- SOAP convert (preview, no save) ---


class SOAPRequest(BaseModel):
    patient_id: uuid.UUID
    raw_input: str = Field(min_length=1)
    visit_type: VisitType


class VitalsSchema(BaseModel):
    sbp: float | None = None
    dbp: float | None = None
    hr: float | None = None
    bt: float | None = None
    rr: float | None = None
    spo2: float | None = None
    bw: float | None = None
    bh: float | None = None
    bmi: float | None = None


class KCDCodeSchema(BaseModel):
    code: str
    description: str


class LabSchema(BaseModel):
    name: str
    value: float | None = None
    unit: str = ""
    flag: str | None = None


class HealthPromotionSchema(BaseModel):
    smoking_cessation: bool = False
    alcohol_reduction: bool = False
    exercise: bool = False
    diet: bool = False


class SickDayAlertSchema(BaseModel):
    drug_name: str
    ingredient: str
    action: str  # HOLD, REDUCE, MONITOR
    reason: str
    triggering_keyword: str


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


class SOAPResponse(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str
    vitals: VitalsSchema
    kcd_codes: list[KCDCodeSchema]
    labs: list[LabSchema]
    health_promotion: HealthPromotionSchema
    unresolved_abbreviations: list[str]
    warnings: list[WarningSchema]
    sick_day_alerts: list[SickDayAlertSchema]
    llm_meta: LLMMetaSchema


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
    follow_up_alerts: list[dict]
