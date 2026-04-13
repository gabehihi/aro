from __future__ import annotations

import uuid

from pydantic import BaseModel


class LabInput(BaseModel):
    name: str
    value: float
    unit: str = ""
    baseline: float | None = None


class PolypharmacyReviewRequest(BaseModel):
    patient_id: uuid.UUID | None = None
    drug_inns: list[str] | None = None
    egfr: float | None = None
    clinical_flags: list[str] = []
    labs: list[LabInput] = []


class DDIFindingSchema(BaseModel):
    drug_a: str
    drug_b: str
    severity: str
    mechanism: str
    management: str
    clinic_note: str | None = None
    ddi_id: str | None = None


class RenalRecommendationSchema(BaseModel):
    drug_inn: str
    egfr: float
    recommendation: str
    detail: str
    max_daily_dose: str | None = None
    monitoring: list[str] = []
    source: str | None = None


class SickDayAlertSchema(BaseModel):
    drug_inn: str
    action: str
    reason: str
    trigger_matched: str
    detail: str


class WarningSchema(BaseModel):
    type: str
    message: str
    severity: str


class PolypharmacyReviewResponse(BaseModel):
    drug_inns: list[str]
    egfr: float | None
    ddi_findings: list[DDIFindingSchema]
    renal_recommendations: list[RenalRecommendationSchema]
    sick_day_alerts: list[SickDayAlertSchema]
    llm_summary: str
    llm_meta: dict
    warnings: list[WarningSchema]
