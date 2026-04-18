from __future__ import annotations

from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import UserRole
from core.models.user import User
from core.security import create_access_token, hash_password


async def _create_doctor(db: AsyncSession) -> tuple[User, str]:
    user = User(
        username="report_doctor",
        hashed_password=hash_password("pass1234"),
        name="보고서테스트의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return user, token


@pytest.mark.asyncio
async def test_monthly_stats_returns_structure(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, token = await _create_doctor(db_session)
    resp = await client.get(
        "/api/v1/reports/monthly/stats",
        params={"year": 2026, "month": 4},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_patients" in data
    assert "encounters_this_month" in data
    assert "followup_resolution_rate" in data
    assert "abnormal_rate" in data
    assert data["year"] == 2026
    assert data["month"] == 4


@pytest.mark.asyncio
async def test_monthly_stats_invalid_month(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    resp = await client.get(
        "/api/v1/reports/monthly/stats",
        params={"year": 2026, "month": 13},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_monthly_stats_month_zero_invalid(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, token = await _create_doctor(db_session)
    resp = await client.get(
        "/api/v1/reports/monthly/stats",
        params={"year": 2026, "month": 0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_monthly_stats_unauthenticated(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/reports/monthly/stats",
        params={"year": 2026, "month": 4},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_monthly_stats_empty_db_returns_zeros(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    _, token = await _create_doctor(db_session)
    resp = await client.get(
        "/api/v1/reports/monthly/stats",
        params={"year": 2026, "month": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_patients"] == 0
    assert data["encounters_this_month"] == 0
    assert data["followup_resolution_rate"] == 0.0
    assert data["abnormal_rate"] == 0.0


@pytest.mark.asyncio
async def test_monthly_archive_lists_saved_reports(
    client: AsyncClient, db_session: AsyncSession, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, token = await _create_doctor(db_session)
    reports_dir = tmp_path / "reports"
    reports_dir.mkdir()
    report_path = reports_dir / "monthly_202603.pdf"
    report_path.write_bytes(b"%PDF-1.4 test")
    monkeypatch.setattr("api.reports._get_reports_dir", lambda: reports_dir)

    resp = await client.get(
        "/api/v1/reports/archive",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["year"] == 2026
    assert data["items"][0]["month"] == 3
    assert data["items"][0]["filename"] == "monthly_202603.pdf"


@pytest.mark.asyncio
async def test_download_monthly_archive_returns_pdf(
    client: AsyncClient, db_session: AsyncSession, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, token = await _create_doctor(db_session)
    reports_dir = tmp_path / "reports"
    reports_dir.mkdir()
    report_path = reports_dir / "monthly_202603.pdf"
    report_path.write_bytes(b"%PDF-1.4 archive")
    monkeypatch.setattr("api.reports._get_reports_dir", lambda: reports_dir)

    resp = await client.get(
        "/api/v1/reports/archive/2026/3",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content == b"%PDF-1.4 archive"
