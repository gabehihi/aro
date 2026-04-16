"""VisitSchedule Pydantic schemas."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class VisitScheduleCreate(BaseModel):
    patient_id: UUID
    scheduled_date: date
    planned_tests: list[str] = []
    needs_fasting: bool = False
    special_instructions: list[str] = []
    created_from: UUID | None = None


class VisitScheduleUpdate(BaseModel):
    scheduled_date: date | None = None
    planned_tests: list[str] | None = None
    needs_fasting: bool | None = None
    special_instructions: list[str] | None = None
    visit_completed: bool | None = None
    reminder_status: dict | None = None


class VisitScheduleResponse(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: str
    chart_no: str
    scheduled_date: date
    planned_tests: list[str]
    needs_fasting: bool
    special_instructions: list[str]
    reminder_status: dict
    visit_completed: bool
    created_at: datetime

    model_config = {"from_attributes": False}  # manually constructed
