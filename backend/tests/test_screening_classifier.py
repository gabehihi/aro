import pytest

from modules.screening.classifier import AbnormalClassifier


@pytest.fixture
def clf() -> AbnormalClassifier:
    return AbnormalClassifier()


def test_egfr_urgent(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"eGFR": 25})
    assert len(findings) == 1
    assert findings[0]["tier"] == "urgent"
    assert findings[0]["name"] == "eGFR"


def test_egfr_caution(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"eGFR": 50})
    assert findings[0]["tier"] == "caution"


def test_egfr_normal(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"eGFR": 75})
    assert findings[0]["tier"] == "normal"


def test_hba1c_urgent(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"HbA1c": 10.5})
    assert findings[0]["tier"] == "urgent"


def test_ua_protein_ordinal_caution(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"UA_protein": "1+"})
    assert findings[0]["tier"] == "caution"


def test_ua_protein_ordinal_urgent(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"UA_protein": "3+"})
    assert findings[0]["tier"] == "urgent"


def test_ua_protein_negative_normal(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"UA_protein": "negative"})
    assert findings[0]["tier"] == "normal"


def test_tsh_high_urgent(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"TSH": 12.0})
    assert findings[0]["tier"] == "urgent"


def test_tsh_low_urgent(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"TSH": 0.05})
    assert findings[0]["tier"] == "urgent"


def test_tsh_normal_range(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"TSH": 2.5})
    assert findings[0]["tier"] == "normal"


def test_creatinine_sex_male(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"Creatinine": 1.5}, sex="M")
    assert findings[0]["tier"] == "caution"


def test_creatinine_sex_female(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"Creatinine": 1.1}, sex="F")
    assert findings[0]["tier"] == "caution"


def test_multiple_labs(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"eGFR": 25, "HbA1c": 9.5, "LDL": 85})
    tiers = {f["name"]: f["tier"] for f in findings}
    assert tiers["eGFR"] == "urgent"
    assert tiers["HbA1c"] == "urgent"
    assert tiers["LDL"] == "normal"


def test_unknown_lab_ignored(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"unknown_lab_xyz": 999})
    assert findings == []


def test_summary_counts(clf: AbnormalClassifier) -> None:
    findings = clf.classify({"eGFR": 25, "HbA1c": 7.5, "LDL": 80})
    urgent = sum(1 for f in findings if f["tier"] == "urgent")
    caution = sum(1 for f in findings if f["tier"] == "caution")
    normal = sum(1 for f in findings if f["tier"] == "normal")
    assert urgent == 1
    assert caution == 1
    assert normal == 1
