"""Screening & Follow-up API endpoints."""

from __future__ import annotations

import csv
from io import BytesIO, StringIO
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models.patient import Patient
from core.schemas.screening import (
    AbnormalFinding,
    BulkUploadResponse,
    BulkUploadRow,
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


# ── 일괄 업로드 헬퍼 ──────────────────────────────────────────────────────────

_META_COLS = {"chart_no", "screening_date"}


def _is_numeric(v: object) -> bool:
    try:
        float(str(v))
        return True
    except (ValueError, TypeError):
        return False


def _parse_csv_content(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig")  # BOM 처리
    reader = csv.DictReader(StringIO(text))
    return [dict(row) for row in reader]


def _parse_excel_content(content: bytes) -> list[dict]:
    import openpyxl

    wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
    ws = wb.active
    if ws is None:
        return []
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    return [
        dict(zip(headers, row, strict=False)) for row in rows[1:] if any(v is not None for v in row)
    ]


# ── 엔드포인트 ────────────────────────────────────────────────────────────────


@router.post(
    "/upload-bulk",
    response_model=BulkUploadResponse,
    summary="검진 결과 일괄 업로드 (.xlsx / .csv)",
)
async def upload_bulk_screening(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
) -> BulkUploadResponse:
    """엑셀(.xlsx) 또는 CSV 파일로 검진 결과를 일괄 저장한다.

    필수 열: chart_no, screening_date (YYYY-MM-DD 형식)
    검사값 열: eGFR, HbA1c, FBS, Total_Cholesterol, LDL 등 (숫자 가능한 열은 자동 포함)
    """
    from datetime import date as date_type

    filename = file.filename or ""
    content = await file.read()

    if filename.endswith(".xlsx"):
        raw_rows = _parse_excel_content(content)
    elif filename.endswith(".csv"):
        raw_rows = _parse_csv_content(content)
    else:
        raise HTTPException(status_code=400, detail=".xlsx 또는 .csv 파일만 지원합니다")

    results: list[BulkUploadRow] = []

    for raw in raw_rows:
        chart_no = str(raw.get("chart_no") or "").strip()
        screening_date_str = str(raw.get("screening_date") or "").strip()

        if not chart_no or not screening_date_str:
            results.append(
                BulkUploadRow(
                    chart_no=chart_no,
                    screening_date=date_type.today(),
                    results={},
                    error="chart_no 또는 screening_date 누락",
                )
            )
            continue

        try:
            screening_date = date_type.fromisoformat(screening_date_str)
        except ValueError:
            results.append(
                BulkUploadRow(
                    chart_no=chart_no,
                    screening_date=date_type.today(),
                    results={},
                    error=f"날짜 형식 오류 (YYYY-MM-DD 필요): {screening_date_str}",
                )
            )
            continue

        patient_result = await db.execute(select(Patient).where(Patient.chart_no == chart_no))
        patient = patient_result.scalar_one_or_none()
        if patient is None:
            results.append(
                BulkUploadRow(
                    chart_no=chart_no,
                    screening_date=screening_date,
                    results={},
                    error=f"환자 없음 (chart_no={chart_no})",
                )
            )
            continue

        lab_results = {
            k: float(str(v))
            for k, v in raw.items()
            if k not in _META_COLS and v is not None and str(v).strip() and _is_numeric(v)
        }

        try:
            await _svc.save_and_classify(
                db,
                ScreeningResultCreate(
                    patient_id=patient.id,
                    screening_type="국가건강검진",
                    screening_date=screening_date,
                    results=lab_results,
                ),
            )
            preview = _svc.classify_preview(lab_results, str(patient.sex))
            results.append(
                BulkUploadRow(
                    chart_no=chart_no,
                    screening_date=screening_date,
                    results=lab_results,
                    patient_id=patient.id,
                    findings=preview.findings,
                    urgent_count=preview.urgent_count,
                    caution_count=preview.caution_count,
                )
            )
        except Exception as exc:
            results.append(
                BulkUploadRow(
                    chart_no=chart_no,
                    screening_date=screening_date,
                    results=lab_results,
                    error=str(exc),
                )
            )

    success = [r for r in results if r.error is None]
    errors = [r for r in results if r.error is not None]

    return BulkUploadResponse(
        total_rows=len(results),
        success_count=len(success),
        error_count=len(errors),
        rows=results,
    )
