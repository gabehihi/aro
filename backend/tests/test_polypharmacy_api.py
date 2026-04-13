from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import UserRole
from core.models.user import User
from core.security import create_access_token, hash_password
from modules.polypharmacy.ddi_checker import DDIFinding
from modules.polypharmacy.service import PolypharmacyReport


async def _make_token(db: AsyncSession) -> str:
    user = User(
        username="poly_test_user",
        hashed_password=hash_password("testpass"),
        name="약물검토테스트의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return create_access_token(data={"sub": str(user.id)})


def _mock_report() -> PolypharmacyReport:
    return PolypharmacyReport(
        drug_inns=["warfarin", "ibuprofen"],
        egfr=65.0,
        ddi_findings=[
            DDIFinding(
                drug_a="warfarin",
                drug_b="ibuprofen",
                severity="MAJOR",
                mechanism="출혈 위험",
                management="병용 금지",
                ddi_id="DDI_0001",
            )
        ],
        renal_recommendations=[],
        sick_day_alerts=[],
        llm_summary="주요 DDI가 검출되었습니다.",
        llm_meta={
            "model": "claude-sonnet-4-6-20260401",
            "cost_usd": 0.001,
            "latency_ms": 800.0,
            "input_tokens": 500,
            "output_tokens": 80,
            "cache_read_tokens": 450,
        },
        warnings=[{"type": "ddi", "message": "심각한 DDI", "severity": "error"}],
    )


@pytest.mark.asyncio
async def test_review_returns_200(client: AsyncClient, db_session: AsyncSession) -> None:
    token = await _make_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    with patch("api.polypharmacy._get_service") as mock_get:
        svc = AsyncMock()
        svc.review = AsyncMock(return_value=_mock_report())
        mock_get.return_value = svc

        resp = await client.post(
            "/api/v1/polypharmacy/review",
            json={"drug_inns": ["warfarin", "ibuprofen"], "egfr": 65.0},
            headers=headers,
        )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["ddi_findings"]) == 1
    assert data["ddi_findings"][0]["severity"] == "MAJOR"
    assert data["llm_summary"] == "주요 DDI가 검출되었습니다."


@pytest.mark.asyncio
async def test_review_with_clinical_flags(client: AsyncClient, db_session: AsyncSession) -> None:
    token = await _make_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    with patch("api.polypharmacy._get_service") as mock_get:
        svc = AsyncMock()
        svc.review = AsyncMock(return_value=_mock_report())
        mock_get.return_value = svc

        resp = await client.post(
            "/api/v1/polypharmacy/review",
            json={
                "drug_inns": ["metformin"],
                "egfr": 55.0,
                "clinical_flags": ["AKI"],
            },
            headers=headers,
        )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_review_empty_drug_list(client: AsyncClient, db_session: AsyncSession) -> None:
    token = await _make_token(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    with patch("api.polypharmacy._get_service") as mock_get:
        empty_report = PolypharmacyReport(
            drug_inns=[],
            egfr=None,
            ddi_findings=[],
            renal_recommendations=[],
            sick_day_alerts=[],
            llm_summary="",
            llm_meta={},
            warnings=[],
        )
        svc = AsyncMock()
        svc.review = AsyncMock(return_value=empty_report)
        mock_get.return_value = svc

        resp = await client.post(
            "/api/v1/polypharmacy/review",
            json={},
            headers=headers,
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ddi_findings"] == []
