"""Tests for MedicalTermNormalizer."""

from core.models.enums import DocType
from modules.documents.normalizer import MedicalTermNormalizer, term_normalizer

# --- 기본 정규화 (진단서) ---


def test_normalize_htn_to_formal() -> None:
    """'고혈압'은 진단서에서 '본태성 고혈압'으로 변환되어야 한다."""
    n = MedicalTermNormalizer()
    result = n.normalize("고혈압 진단됨", DocType.진단서)
    assert "본태성 고혈압" in result


def test_normalize_dm_to_formal() -> None:
    """'당뇨'는 진단서에서 '제2형 당뇨병'으로 변환되어야 한다."""
    n = MedicalTermNormalizer()
    result = n.normalize("당뇨 조절 중", DocType.진단서)
    assert "제2형 당뇨병" in result


def test_normalize_dld_to_formal() -> None:
    """'고지혈증'은 진단서에서 '이상지질혈증'으로 변환되어야 한다."""
    n = MedicalTermNormalizer()
    result = n.normalize("고지혈증 약 복용 중", DocType.진단서)
    assert "이상지질혈증" in result


def test_normalize_english_abbreviation() -> None:
    """영문 약어 'eGFR'은 진단서에서 '추정 사구체여과율(eGFR)'로 확장되어야 한다."""
    n = MedicalTermNormalizer()
    result = n.normalize("eGFR 45 mL/min", DocType.진단서)
    assert "추정 사구체여과율(eGFR)" in result


# --- 건강진단서: 평이한 한국어 ---


def test_normalize_layperson_for_health_cert() -> None:
    """건강진단서에서는 '고혈압'이 '혈압이 높은 상태'처럼 쉬운 표현으로 바뀌어야 한다."""
    n = MedicalTermNormalizer()
    result = n.normalize("고혈압 당뇨 진단", DocType.건강진단서)
    assert "혈압이 높은 상태" in result
    assert "혈당이 높은 상태" in result


# --- 의뢰서: 영문 약어 유지 ---


def test_normalize_referral_keeps_english() -> None:
    """의뢰서에서는 영문 약어(HTN, DM)가 원본 그대로 유지되어야 한다."""
    n = MedicalTermNormalizer()
    result = n.normalize("HTN DM 조절 목적 의뢰", DocType.의뢰서)
    assert "HTN" in result
    assert "DM" in result
    # 영문 약어를 한국어로 치환하면 안 됨
    assert "본태성 고혈압(HTN)" not in result


# --- 이중 정규화 방지 ---


def test_no_double_normalization() -> None:
    """'본태성 고혈압'이 이미 있으면 '본태성 본태성 고혈압'이 되어서는 안 된다."""
    n = MedicalTermNormalizer()
    result = n.normalize("본태성 고혈압 진단됨", DocType.진단서)
    assert "본태성 본태성 고혈압" not in result
    assert result.count("본태성 고혈압") == 1


# --- 부분 매칭 방지 ---


def test_no_partial_match() -> None:
    """'폐고혈압'에서 '고혈압' 부분이 바뀌어 '폐본태성 고혈압'이 되면 안 된다."""
    n = MedicalTermNormalizer()
    result = n.normalize("폐고혈압 의심", DocType.진단서)
    assert "폐본태성 고혈압" not in result
    assert "폐고혈압" in result


# --- normalize_diagnosis 단독 사용 ---


def test_normalize_diagnosis_single() -> None:
    """normalize_diagnosis는 단일 진단명을 정식 명칭으로 변환한다."""
    n = MedicalTermNormalizer()
    assert n.normalize_diagnosis("고혈압") == "본태성 고혈압"
    assert n.normalize_diagnosis("당뇨") == "제2형 당뇨병"
    assert n.normalize_diagnosis("고지혈증") == "이상지질혈증"


def test_normalize_diagnosis_unknown() -> None:
    """매핑이 없는 진단명은 원본 그대로 반환한다."""
    n = MedicalTermNormalizer()
    result = n.normalize_diagnosis("알수없는진단명")
    assert result == "알수없는진단명"


# --- 복수 용어 동시 처리 ---


def test_normalize_multiple_terms() -> None:
    """텍스트 내 여러 용어가 동시에 정규화되어야 한다."""
    n = MedicalTermNormalizer()
    result = n.normalize("고혈압, 당뇨, 고지혈증 복합 조절", DocType.진단서)
    assert "본태성 고혈압" in result
    assert "제2형 당뇨병" in result
    assert "이상지질혈증" in result


# --- 싱글턴 인스턴스 확인 ---


def test_singleton_instance() -> None:
    """모듈 레벨 term_normalizer는 MedicalTermNormalizer 인스턴스여야 한다."""
    assert isinstance(term_normalizer, MedicalTermNormalizer)
