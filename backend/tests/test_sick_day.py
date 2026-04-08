from modules.soap.sick_day import SickDayDetector


def _make_rx(drug_name: str, ingredient: str = "") -> dict:
    return {"drug_name": drug_name, "ingredient_inn": ingredient, "atc_code": ""}


def test_pneumonia_metformin_hold() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="S: 기침, 가래, 발열 3일. O: BT 38.5, CXR 폐렴 소견",
        active_prescriptions=[
            _make_rx("Metformin 500mg", "metformin"),
            _make_rx("Amlodipine 5mg", "amlodipine"),
        ],
    )
    # Metformin should be HOLD, Amlodipine should not trigger
    assert len(alerts) == 1
    assert alerts[0].action == "HOLD"
    assert "metformin" in alerts[0].ingredient.lower()
    assert alerts[0].triggering_keyword == "폐렴"


def test_dehydration_multiple_drugs() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="구토, 설사 2일째, 탈수 소견",
        active_prescriptions=[
            _make_rx("Metformin 1000mg", "metformin"),
            _make_rx("Losartan 50mg", "losartan"),
            _make_rx("Furosemide 20mg", "furosemide"),
            _make_rx("Rivaroxaban 20mg", "rivaroxaban"),
        ],
    )
    actions = {a.ingredient.lower(): a.action for a in alerts}
    assert actions["metformin"] == "HOLD"
    assert actions["losartan"] == "HOLD"
    assert actions["furosemide"] == "HOLD"
    assert actions["rivaroxaban"] == "REDUCE"


def test_no_trigger_no_alerts() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="혈압 조절 경과 관찰. BP 130/80",
        active_prescriptions=[
            _make_rx("Metformin 500mg", "metformin"),
        ],
    )
    assert len(alerts) == 0


def test_fever_trigger() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="발열 38.8도, 오한 동반",
        active_prescriptions=[
            _make_rx("Empagliflozin 10mg", "empagliflozin"),
        ],
    )
    assert len(alerts) == 1
    assert alerts[0].action == "HOLD"
    assert "DKA" in alerts[0].reason


def test_sulfonylurea_monitor() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="감염 소견, 식욕 감소",
        active_prescriptions=[
            _make_rx("Glimepiride 2mg", "glimepiride"),
        ],
    )
    assert len(alerts) == 1
    assert alerts[0].action == "MONITOR"


def test_nsaid_hold_on_aki() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="Cr 상승, AKI 의심",
        active_prescriptions=[
            _make_rx("Ibuprofen 400mg", "ibuprofen"),
        ],
    )
    assert len(alerts) == 1
    assert alerts[0].action == "HOLD"
    assert "신관류" in alerts[0].reason


def test_digoxin_reduce() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="설사, 탈수 소견",
        active_prescriptions=[
            _make_rx("Digoxin 0.125mg", "digoxin"),
        ],
    )
    assert len(alerts) == 1
    assert alerts[0].action == "REDUCE"


def test_empty_prescriptions() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="폐렴 치료 중",
        active_prescriptions=[],
    )
    assert len(alerts) == 0


def test_korean_drug_names() -> None:
    detector = SickDayDetector()
    alerts = detector.scan(
        soap_text="구토, 탈수",
        active_prescriptions=[
            _make_rx("메트포르민 500mg", ""),
        ],
    )
    assert len(alerts) == 1
    assert alerts[0].action == "HOLD"
