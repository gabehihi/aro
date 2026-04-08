from core.llm.guards import HallucinationGuard, SubjectiveExpressionFilter

# --- HallucinationGuard ---


def test_vitals_match_ok() -> None:
    guard = HallucinationGuard()
    result = guard.check(
        raw_input="BP 130/80 HR 72",
        soap_result={
            "vitals": {"sbp": 130, "dbp": 80, "hr": 72},
        },
        pre_extracted_vitals={"sbp": 130, "dbp": 80, "hr": 72},
    )
    assert not result.has_errors
    assert len(result.warnings) == 0


def test_vitals_mismatch_error() -> None:
    guard = HallucinationGuard()
    result = guard.check(
        raw_input="BP 130/80",
        soap_result={
            "vitals": {"sbp": 150, "dbp": 80},
        },
        pre_extracted_vitals={"sbp": 130, "dbp": 80},
    )
    assert result.has_errors
    errors = [w for w in result.warnings if w.type == "vital_mismatch"]
    assert len(errors) == 1
    assert "sbp" in errors[0].message


def test_vitals_out_of_range() -> None:
    guard = HallucinationGuard()
    result = guard.check(
        raw_input="BP 350/80",
        soap_result={
            "vitals": {"sbp": 350, "dbp": 80},
        },
    )
    errors = [w for w in result.warnings if w.type == "vital_out_of_range"]
    assert len(errors) == 1
    assert "sbp" in errors[0].message


def test_unmentioned_diagnosis_warning() -> None:
    guard = HallucinationGuard()
    result = guard.check(
        raw_input="HTN 약 조절",
        soap_result={
            "kcd_codes": [
                {"code": "I10", "description": "본태성 고혈압"},
                {"code": "E11", "description": "2형 당뇨병"},
            ],
        },
        patient_chronic_diseases=["I10"],
    )
    # I10 is in chronic diseases, E11 is not in input or chronic → warning
    warnings = [w for w in result.warnings if w.type == "unmentioned_diagnosis"]
    assert len(warnings) == 1
    assert "E11" in warnings[0].message


def test_diagnosis_in_chronic_ok() -> None:
    guard = HallucinationGuard()
    result = guard.check(
        raw_input="경과 관찰",
        soap_result={
            "kcd_codes": [
                {"code": "I10", "description": "본태성 고혈압"},
            ],
        },
        patient_chronic_diseases=["I10"],
    )
    assert len([w for w in result.warnings if w.type == "unmentioned_diagnosis"]) == 0


def test_unmentioned_lab_error() -> None:
    guard = HallucinationGuard()
    result = guard.check(
        raw_input="Cr 1.2 BUN 18",
        soap_result={
            "labs": [
                {"name": "Cr", "value": 1.2, "unit": "mg/dL"},
                {"name": "HbA1c", "value": 7.2, "unit": "%"},
            ],
        },
    )
    errors = [w for w in result.warnings if w.type == "unmentioned_lab"]
    assert len(errors) == 1
    assert "HbA1c" in errors[0].message


def test_lab_mentioned_ok() -> None:
    guard = HallucinationGuard()
    result = guard.check(
        raw_input="Cr 1.2 HbA1c 7.2",
        soap_result={
            "labs": [
                {"name": "Cr", "value": 1.2, "unit": "mg/dL"},
                {"name": "HbA1c", "value": 7.2, "unit": "%"},
            ],
        },
    )
    assert len([w for w in result.warnings if w.type == "unmentioned_lab"]) == 0


def test_guard_result_no_errors() -> None:
    guard = HallucinationGuard()
    result = guard.check(raw_input="일반 진료", soap_result={})
    assert not result.has_errors


# --- SubjectiveExpressionFilter ---


def test_subjective_detects_expressions() -> None:
    filt = SubjectiveExpressionFilter()
    text = "환자 상태가 양호하며 다행히 호전되었습니다."
    warnings = filt.scan(text)
    labels = {w.message for w in warnings}
    assert any("양호" in msg for msg in labels)
    assert any("다행히" in msg for msg in labels)
    assert any("호전" in msg for msg in labels)


def test_subjective_clean_text() -> None:
    filt = SubjectiveExpressionFilter()
    text = "BP 130/80, HR 72, Cr 1.1 mg/dL. I10 고혈압 경과 관찰."
    warnings = filt.scan(text)
    assert len(warnings) == 0


def test_subjective_detects_compound() -> None:
    filt = SubjectiveExpressionFilter()
    text = "잘 조절되고 있으며 조절 불량 소견 없음"
    warnings = filt.scan(text)
    labels = [w.message for w in warnings]
    assert any("잘 조절" in msg for msg in labels)
    assert any("조절 불량" in msg for msg in labels)


def test_subjective_severity_is_warning() -> None:
    filt = SubjectiveExpressionFilter()
    warnings = filt.scan("심각한 상태")
    assert all(w.severity == "warning" for w in warnings)
