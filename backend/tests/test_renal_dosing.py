from modules.polypharmacy.renal_dosing import RenalDosingChecker

SAMPLE_DB = {
    "metformin": {
        "generic_name_kr": "메트포르민",
        "atc_code": "A10BA02",
        "dose_adjustments": [
            {
                "egfr_min": 60,
                "egfr_max": None,
                "recommendation": "FULL_DOSE",
                "max_daily_dose": "2550mg",
                "detail": "정상",
            },
            {
                "egfr_min": 45,
                "egfr_max": 60,
                "recommendation": "REDUCE",
                "max_daily_dose": "1500mg",
                "detail": "감량",
            },
            {
                "egfr_min": None,
                "egfr_max": 45,
                "recommendation": "CONTRAINDICATED",
                "max_daily_dose": None,
                "detail": "금기",
            },
        ],
        "monitoring": ["Cr 3개월"],
        "source": "KDIGO 2024",
    }
}


def make_checker() -> RenalDosingChecker:
    return RenalDosingChecker(SAMPLE_DB)


def test_full_dose_high_egfr() -> None:
    checker = make_checker()
    result = checker.check("metformin", 75.0)
    assert result.recommendation == "FULL_DOSE"
    assert result.max_daily_dose == "2550mg"


def test_reduce_moderate_egfr() -> None:
    checker = make_checker()
    result = checker.check("metformin", 50.0)
    assert result.recommendation == "REDUCE"
    assert result.max_daily_dose == "1500mg"


def test_contraindicated_low_egfr() -> None:
    checker = make_checker()
    result = checker.check("metformin", 30.0)
    assert result.recommendation == "CONTRAINDICATED"
    assert result.max_daily_dose is None


def test_not_in_db() -> None:
    checker = make_checker()
    result = checker.check("unknowndrug", 60.0)
    assert result.recommendation == "NOT_IN_DB"


def test_case_insensitive_lookup() -> None:
    checker = make_checker()
    result = checker.check("Metformin", 80.0)
    assert result.recommendation == "FULL_DOSE"


def test_check_all() -> None:
    checker = make_checker()
    results = checker.check_all(["metformin", "unknowndrug"], 70.0)
    assert len(results) == 2
    assert results[0].recommendation == "FULL_DOSE"
    assert results[1].recommendation == "NOT_IN_DB"
