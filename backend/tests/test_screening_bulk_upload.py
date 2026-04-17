"""검진 결과 일괄 업로드 API 테스트."""

from __future__ import annotations

import io
from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import InsuranceType, Sex
from core.models.patient import Patient


async def _create_patient(db: AsyncSession, chart_no: str) -> Patient:
    patient = Patient(
        chart_no=chart_no,
        name=f"환자{chart_no}",
        birth_date=date(1970, 1, 1),
        sex=Sex.M,
        insurance_type=InsuranceType.건강보험,
        chronic_diseases=[],
        allergies=[],
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient


async def test_upload_bulk_csv_success(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """정상 CSV — 1행 저장 성공."""
    await _create_patient(db_session, "BULK001")
    csv_content = b"chart_no,screening_date,eGFR,HbA1c\nBULK001,2026-04-17,45,8.2\n"

    resp = await client.post(
        "/api/v1/screening/upload-bulk",
        files={"file": ("results.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 1
    assert data["success_count"] == 1
    assert data["error_count"] == 0
    row = data["rows"][0]
    assert row["chart_no"] == "BULK001"
    assert row["error"] is None
    assert row["patient_id"] is not None


async def test_upload_bulk_csv_unknown_patient(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """존재하지 않는 chart_no → 해당 행만 에러, 전체 응답은 200."""
    csv_content = b"chart_no,screening_date,eGFR\nZZZZZZ,2026-04-17,45\n"

    resp = await client.post(
        "/api/v1/screening/upload-bulk",
        files={"file": ("results.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["error_count"] == 1
    assert "환자 없음" in data["rows"][0]["error"]


async def test_upload_bulk_csv_bad_date(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """날짜 형식 오류 → 해당 행 에러."""
    await _create_patient(db_session, "BULK002")
    csv_content = b"chart_no,screening_date,eGFR\nBULK002,2026/04/17,45\n"

    resp = await client.post(
        "/api/v1/screening/upload-bulk",
        files={"file": ("results.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["error_count"] == 1
    assert "날짜 형식" in data["rows"][0]["error"]


async def test_upload_bulk_invalid_extension(client: AsyncClient) -> None:
    """.txt 파일 → 400."""
    resp = await client.post(
        "/api/v1/screening/upload-bulk",
        files={"file": ("data.txt", io.BytesIO(b"data"), "text/plain")},
    )
    assert resp.status_code == 400


async def test_upload_bulk_excel(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """정상 XLSX — 1행 저장 성공."""
    import openpyxl

    await _create_patient(db_session, "BULK003")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["chart_no", "screening_date", "eGFR", "HbA1c"])
    ws.append(["BULK003", "2026-04-17", 55, 7.5])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    resp = await client.post(
        "/api/v1/screening/upload-bulk",
        files={
            "file": (
                "results.xlsx",
                buf,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success_count"] == 1
    assert data["rows"][0]["error"] is None


async def test_upload_bulk_mixed_rows(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """성공 행과 에러 행이 섞인 CSV."""
    await _create_patient(db_session, "BULK004")
    csv_content = (
        b"chart_no,screening_date,eGFR\n"
        b"BULK004,2026-04-17,52\n"
        b"NOTEXIST,2026-04-17,60\n"
    )

    resp = await client.post(
        "/api/v1/screening/upload-bulk",
        files={"file": ("results.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_rows"] == 2
    assert data["success_count"] == 1
    assert data["error_count"] == 1
