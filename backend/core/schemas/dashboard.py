from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from core.models.enums import DocStatus, DocType
from core.schemas.report import MonthlyReportArchiveItem, MonthlyReportStatsResponse
from core.schemas.screening import DashboardSummary, FollowUpAlertResponse
from core.schemas.visit import VisitScheduleResponse


class RecentDocumentSummary(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: str
    chart_no: str
    doc_type: DocType
    title: str
    status: DocStatus
    created_at: datetime
    issued_at: datetime | None


class DashboardOverviewResponse(BaseModel):
    summary: DashboardSummary
    month_stats: MonthlyReportStatsResponse
    upcoming_visits: list[VisitScheduleResponse]
    priority_followup_alerts: list[FollowUpAlertResponse]
    recent_documents: list[RecentDocumentSummary]
    report_archive: list[MonthlyReportArchiveItem]
