from modules.polypharmacy.ddi_checker import DDIChecker, DDIFinding

SAMPLE_PAIRS = [
    {
        "ddi_id": "DDI_T001",
        "drug_a_inn": "warfarin",
        "drug_b_inn": "ibuprofen",
        "severity": "MAJOR",
        "mechanism": "출혈 위험",
        "management": "병용 금지",
        "clinic_note": "주의",
    },
    {
        "ddi_id": "DDI_T002",
        "drug_a_inn": "clopidogrel",
        "drug_b_inn": "omeprazole",
        "severity": "MAJOR",
        "mechanism": "CYP2C19 억제",
        "management": "Pantoprazole로 교체",
        "clinic_note": None,
    },
]


def make_checker() -> DDIChecker:
    return DDIChecker(SAMPLE_PAIRS)


def test_ddi_detected_ordered() -> None:
    checker = make_checker()
    results = checker.check(["warfarin", "ibuprofen", "clopidogrel", "omeprazole"])
    assert len(results) == 2
    assert all(isinstance(r, DDIFinding) for r in results)
    assert results[0].severity == "MAJOR"
    assert results[1].severity == "MAJOR"


def test_ddi_bidirectional() -> None:
    checker = make_checker()
    r1 = checker.check(["warfarin", "ibuprofen"])
    r2 = checker.check(["ibuprofen", "warfarin"])
    assert len(r1) == 1
    assert len(r2) == 1
    assert r1[0].drug_a == r2[0].drug_a


def test_no_ddi_for_safe_drugs() -> None:
    checker = make_checker()
    results = checker.check(["metformin", "lisinopril"])
    assert results == []


def test_single_drug_no_ddi() -> None:
    checker = make_checker()
    assert checker.check(["warfarin"]) == []


def test_no_duplicate_findings() -> None:
    checker = make_checker()
    results = checker.check(["warfarin", "ibuprofen", "warfarin"])
    assert len(results) == 1


def test_case_insensitive() -> None:
    checker = make_checker()
    results = checker.check(["Warfarin", "IBUPROFEN"])
    assert len(results) == 1
