"""Screening & Follow-up API endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.schemas.screening import (
    AbnormalFinding,
    ClassifyPreviewRequest,
    ClassifyPreviewResponse,
    FollowUpDashboardResponse,
    ScreeningResultCreate,
    ScreeningResultResponse,
)
from modules.screening.service import ScreeningService

router = APIRouter(prefix="/screening", tags=["screening"])
_svc = ScreeningService()


@router.post(
    "/classify-preview",
    response_model=ClassifyPreviewResponse,
    summary="검진 결과 이상소견 미리보기 (저장 없음)",
)
async def classify_preview(body: ClassifyPreviewRequest) -> ClassifyPreviewResponse:
    result = _svc.classify_preview(body.results, body.patient_sex)
    # service returns ClassifyPreviewResponse directly; rebuild to ensure AbnormalFinding types
    findings = [AbnormalFinding(**f) if isinstance(f, dict) else f for f in result.findings]
    return ClassifyPreviewResponse(
        findings=findings,
        urgent_count=result.urgent_count,
        caution_count=result.caution_count,
        normal_count=result.normal_count,
    )


@router.post(
    "/results",
    response_model=ScreeningResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="검진 결과 저장 + 이상소견 분류 + F/U 알림 생성",
)
async def save_screening_result(
    body: ScreeningResultCreate,
    db: AsyncSession = Depends(get_db),
) -> ScreeningResultResponse:
    try:
        result = await _svc.save_and_classify(db, body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return result


@router.get(
    "/dashboard",
    response_model=FollowUpDashboardResponse,
    summary="F/U 대시보드 데이터",
)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
) -> FollowUpDashboardResponse:
    return await _svc.get_dashboard(db)


@router.patch(
    "/alerts/{alert_id}/resolve",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="F/U 알림 해결 처리",
)
async def resolve_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await _svc.resolve_alert(db, alert_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
