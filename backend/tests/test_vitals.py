from modules.soap.vitals import extract_vitals


def test_bp_standard() -> None:
    v = extract_vitals("BP 130/80 HR 72")
    assert v.sbp == 130
    assert v.dbp == 80
    assert v.hr == 72


def test_bp_korean() -> None:
    v = extract_vitals("혈압 140/90")
    assert v.sbp == 140
    assert v.dbp == 90


def test_bp_with_unit() -> None:
    v = extract_vitals("130/85mmHg")
    assert v.sbp == 130
    assert v.dbp == 85


def test_hr_bpm() -> None:
    v = extract_vitals("80bpm")
    assert v.hr == 80


def test_hr_korean() -> None:
    v = extract_vitals("맥박 68")
    assert v.hr == 68


def test_bt_standard() -> None:
    v = extract_vitals("BT 36.5")
    assert v.bt == 36.5


def test_bt_korean() -> None:
    v = extract_vitals("체온 38.2도")
    assert v.bt == 38.2


def test_spo2() -> None:
    v = extract_vitals("SpO2 97%")
    assert v.spo2 == 97


def test_spo2_korean() -> None:
    v = extract_vitals("산소포화도 98")
    assert v.spo2 == 98


def test_rr() -> None:
    v = extract_vitals("RR 18")
    assert v.rr == 18


def test_bw() -> None:
    v = extract_vitals("BW 72.5")
    assert v.bw == 72.5


def test_bw_kg() -> None:
    v = extract_vitals("체중 68kg")
    assert v.bw == 68


def test_bh() -> None:
    v = extract_vitals("신장 170cm")
    assert v.bh == 170


def test_bmi() -> None:
    v = extract_vitals("BMI 24.5")
    assert v.bmi == 24.5


def test_complex_input() -> None:
    text = "BP 120/75 HR 66 BT 36.7 SpO2 99% RR 16 BW 65kg 신장 168cm"
    v = extract_vitals(text)
    assert v.sbp == 120
    assert v.dbp == 75
    assert v.hr == 66
    assert v.bt == 36.7
    assert v.spo2 == 99
    assert v.rr == 16
    assert v.bw == 65
    assert v.bh == 168


def test_no_vitals() -> None:
    v = extract_vitals("고혈압 약 조절 경과 관찰")
    assert v.sbp is None
    assert v.dbp is None
    assert v.hr is None


def test_non_null_dict() -> None:
    v = extract_vitals("BP 130/80")
    d = v.non_null_dict()
    assert d == {"sbp": 130, "dbp": 80}


def test_to_dict_includes_nulls() -> None:
    v = extract_vitals("BP 130/80")
    d = v.to_dict()
    assert d["sbp"] == 130
    assert d["hr"] is None
