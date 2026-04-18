from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class LabEntry(BaseModel):
    name: str
    value: Any
    unit: str = ""


class AbnormalFinding(BaseModel):
    name: str
    value: Any
    unit: str
    tier: str  # "urgent" | "caution" | "normal"
    ref_range: str
    message: str


class ScreeningResultCreate(BaseModel):
    patient_id: UUID
    screening_type: str  # "국가건강검진" | "암검진" | "생애전환기"
    screening_date: date
    results: dict[str, Any]  # {"eGFR": 45, "HbA1c": 8.2, ...}
    patient_has_dm: bool = False


class ScreeningResultResponse(BaseModel):
    id: UUID
    patient_id: UUID
    screening_type: str
    screening_date: date
    results: dict[str, Any]
    abnormal_findings: list[dict]
    follow_up_required: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ClassifyPreviewRequest(BaseModel):
    results: dict[str, Any]
    patient_sex: str = "M"  # "M" | "F"


class ClassifyPreviewResponse(BaseModel):
    findings: list[AbnormalFinding]
    urgent_count: int
    caution_count: int
    normal_count: int


class FollowUpAlertResponse(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: str
    chart_no: str
    alert_type: str
    item: str
    last_value: str | None
    last_date: date | None
    due_date: date
    days_overdue: int
    priority: str
    resolved: bool

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    today_appointments: int
    followup_needed: int
    noshow_last_week: int
    screening_incomplete: int


class NoShowPatientResponse(BaseModel):
    patient_id: UUID
    patient_name: str
    chart_no: str
    scheduled_date: date
    planned_tests: list[str]


class FollowUpDashboardResponse(BaseModel):
    summary: DashboardSummary
    followup_alerts: list[FollowUpAlertResponse]
    noshow_patients: list[NoShowPatientResponse]


class BulkUploadRow(BaseModel):
    """일괄 업로드 결과의 한 행."""

    chart_no: str
    screening_date: date
    results: dict[str, Any]
    patient_id: UUID | None = None
    error: str | None = None
    findings: list[AbnormalFinding] = []
    urgent_count: int = 0
    caution_count: int = 0


class BulkUploadResponse(BaseModel):
    """일괄 업로드 전체 결과."""

    total_rows: int
    success_count: int
    error_count: int
    rows: list[BulkUploadRow]
