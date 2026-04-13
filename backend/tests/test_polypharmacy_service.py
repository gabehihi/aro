from unittest.mock import AsyncMock

import pytest

from modules.polypharmacy.service import PolypharmacyService


def _mock_llm() -> AsyncMock:
    from core.llm.service import LLMResponse

    mock = AsyncMock()
    mock.generate_with_cache = AsyncMock(
        return_value=LLMResponse(
            content="처방된 약물에서 1건의 주요 DDI가 검출되었습니다.",
            model="claude-sonnet-4-6-20260401",
            input_tokens=500,
            output_tokens=80,
            cache_read_tokens=450,
            cost_usd=0.001,
            latency_ms=800.0,
        )
    )
    return mock


@pytest.mark.asyncio
async def test_review_returns_report() -> None:
    service = PolypharmacyService(_mock_llm())
    report = await service.review(
        drug_inns=["warfarin", "ibuprofen"],
        egfr=65.0,
        clinical_flags=[],
        labs=[],
    )
    assert len(report.ddi_findings) >= 1
    assert report.ddi_findings[0].severity == "MAJOR"
    assert report.llm_summary != ""


@pytest.mark.asyncio
async def test_review_renal_dosing() -> None:
    service = PolypharmacyService(_mock_llm())
    report = await service.review(
        drug_inns=["metformin"],
        egfr=35.0,
        clinical_flags=[],
        labs=[],
    )
    recs = [r for r in report.renal_recommendations if r.drug_inn == "metformin"]
    assert len(recs) == 1
    assert recs[0].recommendation == "REDUCE"


@pytest.mark.asyncio
async def test_review_sick_day() -> None:
    service = PolypharmacyService(_mock_llm())
    report = await service.review(
        drug_inns=["metformin"],
        egfr=60.0,
        clinical_flags=["AKI"],
        labs=[],
    )
    alerts = [a for a in report.sick_day_alerts if a.drug_inn == "metformin"]
    assert len(alerts) == 1
    assert alerts[0].action == "HOLD"


@pytest.mark.asyncio
async def test_warning_generated_for_major_ddi() -> None:
    service = PolypharmacyService(_mock_llm())
    report = await service.review(
        drug_inns=["warfarin", "ibuprofen"],
        egfr=None,
        clinical_flags=[],
        labs=[],
    )
    assert any(w["severity"] == "error" for w in report.warnings)


@pytest.mark.asyncio
async def test_no_renal_check_when_egfr_none() -> None:
    service = PolypharmacyService(_mock_llm())
    report = await service.review(
        drug_inns=["metformin"],
        egfr=None,
        clinical_flags=[],
        labs=[],
    )
    assert report.renal_recommendations == []


@pytest.mark.asyncio
async def test_warning_generated_for_renal_contraindicated() -> None:
    service = PolypharmacyService(_mock_llm())
    # metformin eGFR=25 → CONTRAINDICATED
    report = await service.review(
        drug_inns=["metformin"],
        egfr=25.0,
        clinical_flags=[],
        labs=[],
    )
    assert any(w["type"] == "renal" and w["severity"] == "error" for w in report.warnings)
