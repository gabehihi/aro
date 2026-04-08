"""Tests for DocumentFactChecker."""

import pytest

from core.models.enums import DocType
from modules.documents.guards import DocumentFactChecker, document_fact_checker

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

BASIC_SOURCE: dict = {
    "patient": {"chronic_diseases": ["I10", "E11"]},
    "encounter": {
        "vitals": {"sbp": 140, "dbp": 90},
        "kcd_codes": [{"code": "I10", "description": "본태성 고혈압"}],
        "labs": [{"name": "HbA1c", "value": 7.2, "unit": "%"}],
        "objective": "BP 140/90",
    },
}


@pytest.fixture
def checker() -> DocumentFactChecker:
    return DocumentFactChecker()


# ---------------------------------------------------------------------------
# 1. Clean pass
# ---------------------------------------------------------------------------


def test_clean_pass_no_warnings(checker: DocumentFactChecker) -> None:
    """All numbers and codes are grounded — no warnings expected."""
    text = "혈압 140/90 mmHg, HbA1c 7.2%, 진단: I10 [의사 소견: ___]"
    result = checker.check(text, BASIC_SOURCE, DocType.진단서)
    assert result.warnings == []


# ---------------------------------------------------------------------------
# 2. Numeric consistency
# ---------------------------------------------------------------------------


def test_numeric_fabrication_detected(checker: DocumentFactChecker) -> None:
    """A number absent from source_data should be flagged as error."""
    text = "혈압 999/90 mmHg [의사 소견: ___]"
    result = checker.check(text, BASIC_SOURCE, DocType.소견서)
    types = [w.type for w in result.warnings]
    assert "numeric_fabrication" in types
    assert result.has_errors


def test_numeric_match_with_tolerance(checker: DocumentFactChecker) -> None:
    """A value within ±0.1 of a source number should not be flagged."""
    source = {
        "encounter": {
            "labs": [{"name": "Na", "value": 138.0}],
            "kcd_codes": [],
            "objective": "",
        },
        "patient": {"chronic_diseases": []},
    }
    # 138.05 is within 0.1 of 138.0
    text = "나트륨 138.05 mEq/L [의사 소견: ___]"
    result = checker.check(text, source, DocType.소견서)
    numeric_warnings = [w for w in result.warnings if w.type == "numeric_fabrication"]
    assert numeric_warnings == []


def test_numeric_dates_ignored(checker: DocumentFactChecker) -> None:
    """4-digit years like 2026 should not be flagged as fabricated numbers."""
    text = "2026년 진료 기록 [의사 소견: ___]"
    result = checker.check(text, BASIC_SOURCE, DocType.소견서)
    numeric_warnings = [w for w in result.warnings if w.type == "numeric_fabrication"]
    assert numeric_warnings == []


# ---------------------------------------------------------------------------
# 3. Diagnosis grounding
# ---------------------------------------------------------------------------


def test_diagnosis_grounded_passes(checker: DocumentFactChecker) -> None:
    """KCD code that matches encounter kcd_codes should not produce a warning."""
    text = "진단: I10 고혈압 [의사 소견: ___]"
    result = checker.check(text, BASIC_SOURCE, DocType.진단서)
    diag_warnings = [w for w in result.warnings if w.type == "ungrounded_diagnosis"]
    assert diag_warnings == []


def test_ungrounded_diagnosis_flagged(checker: DocumentFactChecker) -> None:
    """Unknown KCD code in generated text should be flagged as warning."""
    text = "진단: J45 천식 의심 [의사 소견: ___]"
    result = checker.check(text, BASIC_SOURCE, DocType.진단서)
    types = [w.type for w in result.warnings]
    assert "ungrounded_diagnosis" in types
    # Diagnosis issues are warnings, not errors
    diag_warnings = [w for w in result.warnings if w.type == "ungrounded_diagnosis"]
    assert all(w.severity == "warning" for w in diag_warnings)


def test_diagnosis_in_chronic_diseases_passes(checker: DocumentFactChecker) -> None:
    """Code present only in chronic_diseases (not kcd_codes) should pass."""
    # E11 is in chronic_diseases but not in kcd_codes of this encounter
    source = {
        "patient": {"chronic_diseases": ["E11"]},
        "encounter": {
            "kcd_codes": [],
            "labs": [],
            "objective": "",
        },
    }
    text = "당뇨병 E11 지속 관찰 중 [의사 소견: ___]"
    result = checker.check(text, source, DocType.소견서)
    diag_warnings = [w for w in result.warnings if w.type == "ungrounded_diagnosis"]
    assert diag_warnings == []


# ---------------------------------------------------------------------------
# 4. Test grounding
# ---------------------------------------------------------------------------


def test_ungrounded_test_ct_flagged(checker: DocumentFactChecker) -> None:
    """CT mentioned in text but absent from source_data should be error."""
    text = "CT 촬영 결과 이상 없음 [의사 소견: ___]"
    result = checker.check(text, BASIC_SOURCE, DocType.소견서)
    types = [w.type for w in result.warnings]
    assert "ungrounded_test" in types
    test_warnings = [w for w in result.warnings if w.type == "ungrounded_test"]
    assert all(w.severity == "error" for w in test_warnings)


def test_grounded_test_passes(checker: DocumentFactChecker) -> None:
    """CT mentioned both in text and source_data objective should not be flagged."""
    source = {
        "patient": {"chronic_diseases": []},
        "encounter": {
            "kcd_codes": [],
            "labs": [],
            "objective": "CT 촬영 시행, 결절 없음",
        },
    }
    text = "CT 결과 정상 [의사 소견: ___]"
    result = checker.check(text, source, DocType.소견서)
    test_warnings = [w for w in result.warnings if w.type == "ungrounded_test"]
    assert test_warnings == []


# ---------------------------------------------------------------------------
# 5. Placeholder completeness
# ---------------------------------------------------------------------------


def test_placeholder_present_passes(checker: DocumentFactChecker) -> None:
    """진단서 with [의사 소견: ___] should not trigger placeholder warning."""
    text = "혈압 140/90 mmHg, I10 [의사 소견: ___]"
    result = checker.check(text, BASIC_SOURCE, DocType.진단서)
    ph_warnings = [w for w in result.warnings if w.type == "missing_placeholder"]
    assert ph_warnings == []


def test_placeholder_missing_warned(checker: DocumentFactChecker) -> None:
    """진단서 without any placeholder should produce a warning."""
    text = "혈압 140/90 mmHg, I10"
    result = checker.check(text, BASIC_SOURCE, DocType.진단서)
    types = [w.type for w in result.warnings]
    assert "missing_placeholder" in types
    ph_warnings = [w for w in result.warnings if w.type == "missing_placeholder"]
    assert all(w.severity == "warning" for w in ph_warnings)


def test_placeholder_not_required_for_hwagin_seo(checker: DocumentFactChecker) -> None:
    """확인서 does not require any placeholder — no warning expected."""
    text = "재직 확인서입니다."
    source: dict = {
        "patient": {"chronic_diseases": []},
        "encounter": {"kcd_codes": [], "labs": [], "objective": ""},
    }
    result = checker.check(text, source, DocType.확인서)
    ph_warnings = [w for w in result.warnings if w.type == "missing_placeholder"]
    assert ph_warnings == []


def test_referral_placeholder_accepted(checker: DocumentFactChecker) -> None:
    """의뢰서 with [의뢰 사유: ___] should not trigger placeholder warning."""
    text = "상급병원 의뢰합니다. [의뢰 사유: 고혈압 조절 불량]"
    result = checker.check(text, BASIC_SOURCE, DocType.의뢰서)
    ph_warnings = [w for w in result.warnings if w.type == "missing_placeholder"]
    assert ph_warnings == []


# ---------------------------------------------------------------------------
# 6. Combined and singleton
# ---------------------------------------------------------------------------


def test_multiple_issues_combined(checker: DocumentFactChecker) -> None:
    """Multiple issue types should all be reported in a single check call."""
    # numeric_fabrication: 999 not in source
    # ungrounded_diagnosis: J45 not in source
    # ungrounded_test: MRI not in source
    # missing_placeholder: 진단서 with no [의사 소견:]
    text = "혈압 999/90, 진단 J45, MRI 시행함"
    result = checker.check(text, BASIC_SOURCE, DocType.진단서)
    found_types = {w.type for w in result.warnings}
    assert "numeric_fabrication" in found_types
    assert "ungrounded_diagnosis" in found_types
    assert "ungrounded_test" in found_types
    assert "missing_placeholder" in found_types
    assert len(result.warnings) >= 4


def test_singleton_instance() -> None:
    """document_fact_checker should be a pre-built DocumentFactChecker instance."""
    assert isinstance(document_fact_checker, DocumentFactChecker)
