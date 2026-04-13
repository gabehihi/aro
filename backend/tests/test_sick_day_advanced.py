from modules.polypharmacy.sick_day_advanced import SickDayAdvancedChecker

SAMPLE_RULES = [
    {
        "drug_inn": "metformin",
        "action": "HOLD",
        "triggers": ["AKI", "DEHYDRATION"],
        "lab_triggers": [{"lab": "creatinine", "condition": "acute_rise_1.5x"}],
        "reason": "젖산산증 위험",
        "detail": "회복 후 재개",
    },
    {
        "drug_inn": "spironolactone",
        "action": "HOLD",
        "triggers": ["AKI"],
        "lab_triggers": [{"lab": "potassium", "condition": "hyperkalemia_5.5"}],
        "reason": "고칼륨혈증 위험",
        "detail": "K+ 안정 후 재개",
    },
    {
        "drug_inn": "rivaroxaban",
        "action": "REDUCE",
        "triggers": ["AKI"],
        "lab_triggers": [],
        "reason": "혈중농도 상승",
        "detail": "신기능 안정화 후 재평가",
    },
    {
        "drug_inn": "glimepiride",
        "action": "MONITOR",
        "triggers": ["AKI"],
        "lab_triggers": [],
        "reason": "저혈당 위험",
        "detail": "혈당 모니터링",
    },
]


def make_checker() -> SickDayAdvancedChecker:
    return SickDayAdvancedChecker(SAMPLE_RULES)


def test_hold_on_clinical_flag() -> None:
    checker = make_checker()
    alerts = checker.check(["metformin"], clinical_flags=["AKI"], labs=[])
    assert len(alerts) == 1
    assert alerts[0].action == "HOLD"
    assert alerts[0].drug_inn == "metformin"


def test_no_alert_when_no_trigger() -> None:
    checker = make_checker()
    alerts = checker.check(["metformin"], clinical_flags=[], labs=[])
    assert alerts == []


def test_lab_trigger_cr_rise() -> None:
    checker = make_checker()
    labs = [{"name": "creatinine", "value": 2.0, "baseline": 1.0}]
    alerts = checker.check(["metformin"], clinical_flags=[], labs=labs)
    assert len(alerts) == 1


def test_lab_trigger_hyperkalemia() -> None:
    checker = make_checker()
    labs = [{"name": "potassium", "value": 5.8}]
    alerts = checker.check(["spironolactone"], clinical_flags=[], labs=labs)
    assert len(alerts) == 1


def test_no_duplicate_alert() -> None:
    checker = make_checker()
    labs = [{"name": "creatinine", "value": 2.0, "baseline": 1.0}]
    alerts = checker.check(["metformin"], clinical_flags=["AKI"], labs=labs)
    assert len(alerts) == 1


def test_case_insensitive_flag() -> None:
    checker = make_checker()
    alerts = checker.check(["metformin"], clinical_flags=["aki"], labs=[])
    assert len(alerts) == 1


def test_unknown_drug_no_alert() -> None:
    checker = make_checker()
    alerts = checker.check(["unknowndrug"], clinical_flags=["AKI"], labs=[])
    assert alerts == []


def test_action_priority_sorting() -> None:
    checker = make_checker()
    alerts = checker.check(
        ["glimepiride", "rivaroxaban", "metformin"],
        clinical_flags=["AKI"],
        labs=[],
    )
    assert len(alerts) == 3
    assert alerts[0].action == "HOLD"
    assert alerts[1].action == "REDUCE"
    assert alerts[2].action == "MONITOR"
