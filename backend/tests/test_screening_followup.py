from datetime import date, timedelta
import pytest
from modules.screening.follow_up import FollowUpEngine, FollowUpCandidate


@pytest.fixture
def engine() -> FollowUpEngine:
    return FollowUpEngine()


def test_egfr_triggers_followup(engine: FollowUpEngine) -> None:
    today = date.today()
    candidates = engine.evaluate(
        findings=[{"name": "eGFR", "value": 45, "tier": "caution"}],
        last_date=today,
        patient_has_dm=False,
    )
    assert len(candidates) == 1
    c = candidates[0]
    assert c.item == "eGFR"
    assert c.interval_days == 90
    assert c.due_date == today + timedelta(days=90)


def test_normal_lab_no_followup(engine: FollowUpEngine) -> None:
    candidates = engine.evaluate(
        findings=[{"name": "eGFR", "value": 75, "tier": "normal"}],
        last_date=date.today(),
        patient_has_dm=False,
    )
    assert candidates == []


def test_ldl_no_trigger_without_dm(engine: FollowUpEngine) -> None:
    candidates = engine.evaluate(
        findings=[{"name": "LDL", "value": 150, "tier": "caution"}],
        last_date=date.today(),
        patient_has_dm=False,
    )
    assert candidates == []


def test_ldl_triggers_with_dm(engine: FollowUpEngine) -> None:
    candidates = engine.evaluate(
        findings=[{"name": "LDL", "value": 110, "tier": "caution"}],
        last_date=date.today(),
        patient_has_dm=True,
    )
    assert len(candidates) == 1
    assert candidates[0].interval_days == 42


def test_ua_protein_urgent_short_interval(engine: FollowUpEngine) -> None:
    candidates = engine.evaluate(
        findings=[{"name": "UA_protein", "value": "2+", "tier": "urgent"}],
        last_date=date.today(),
        patient_has_dm=False,
    )
    assert candidates[0].interval_days == 14


def test_priority_urgent_when_overdue(engine: FollowUpEngine) -> None:
    past_date = date.today() - timedelta(days=100)
    candidates = engine.evaluate(
        findings=[{"name": "eGFR", "value": 45, "tier": "caution"}],
        last_date=past_date,
        patient_has_dm=False,
    )
    assert candidates[0].priority == "urgent"


def test_priority_due_within_week(engine: FollowUpEngine) -> None:
    last_date = date.today() - timedelta(days=87)
    candidates = engine.evaluate(
        findings=[{"name": "eGFR", "value": 45, "tier": "caution"}],
        last_date=last_date,
        patient_has_dm=False,
    )
    assert candidates[0].priority == "due"


def test_priority_upcoming(engine: FollowUpEngine) -> None:
    candidates = engine.evaluate(
        findings=[{"name": "eGFR", "value": 45, "tier": "caution"}],
        last_date=date.today(),
        patient_has_dm=False,
    )
    assert candidates[0].priority == "upcoming"
