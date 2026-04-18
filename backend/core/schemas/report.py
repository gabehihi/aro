from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class MonthlyReportStatsResponse(BaseModel):
    year: int
    month: int
    total_patients: int
    new_patients_this_month: int
    active_patients_this_month: int
    total_encounters: int
    encounters_this_month: int
    documents_issued_this_month: int
    followup_alerts_this_month: int
    followup_resolved_this_month: int
    followup_resolution_rate: float
    screenings_this_month: int
    abnormal_screenings: int
    abnormal_rate: float


class MonthlyReportArchiveItem(BaseModel):
    year: int
    month: int
    filename: str
    size_bytes: int
    generated_at: datetime


class MonthlyReportArchiveResponse(BaseModel):
    items: list[MonthlyReportArchiveItem]
