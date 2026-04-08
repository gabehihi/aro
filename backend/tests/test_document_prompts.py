"""Tests for document generation prompt builders."""

import json

from core.models.enums import DocType
from modules.documents.prompts import (
    OUTPUT_SCHEMAS,
    build_document_cached_system,
    build_document_dynamic_system,
)


def test_cached_system_contains_constraints():
    """All doc types include the shared constraint text."""
    for doc_type in DocType:
        if doc_type not in (DocType.검사결과안내서, DocType.교육문서):
            # 스키마/스타일이 정의된 타입만 검사
            pass
        prompt = build_document_cached_system(doc_type)
        assert "절대 제약" in prompt, f"{doc_type}: 절대 제약 미포함"
        # 6개 항목 중 대표 두 가지 확인
        assert "수치를 변조하지 마세요" in prompt, f"{doc_type}: 수치 제약 미포함"
        assert "플레이스홀더" in prompt, f"{doc_type}: 플레이스홀더 제약 미포함"


def test_cached_system_contains_style_guide():
    """Each doc type's cached system prompt includes its style guide."""
    for doc_type, expected_fragment in [
        (DocType.진단서, "KCD 코드"),
        (DocType.소견서, "상세 기술"),
        (DocType.확인서, "사실 기반 최소 기술"),
        (DocType.의뢰서, "의뢰 사유"),
        (DocType.건강진단서, "일반인 대상"),
    ]:
        prompt = build_document_cached_system(doc_type)
        assert expected_fragment in prompt, (
            f"{doc_type}: 스타일 가이드 '{expected_fragment}' 미포함"
        )


def test_cached_system_diagnosis_cert_has_kcd_mention():
    """진단서 prompt explicitly mentions KCD codes."""
    prompt = build_document_cached_system(DocType.진단서)
    assert "KCD" in prompt


def test_cached_system_referral_allows_english():
    """의뢰서 prompt mentions English usage."""
    prompt = build_document_cached_system(DocType.의뢰서)
    assert "영어" in prompt or "English" in prompt or "영문" in prompt


def test_cached_system_health_cert_easy_korean():
    """건강진단서 prompt mentions easy Korean for general public."""
    prompt = build_document_cached_system(DocType.건강진단서)
    assert "일반인" in prompt or "쉬운 한국어" in prompt


def test_dynamic_system_contains_source_data():
    """Source data JSON is embedded in dynamic system prompt."""
    source = {
        "patient": {"name": "홍길동", "chart_no": "T001"},
        "metadata": {"doc_type": "진단서"},
    }
    prompt = build_document_dynamic_system(source)

    assert "홍길동" in prompt
    assert "T001" in prompt
    assert "Source Data" in prompt
    assert "참조 데이터" in prompt


def test_dynamic_system_korean_preserved():
    """Korean characters are not Unicode-escaped in the dynamic prompt."""
    source = {"patient": {"name": "홍길동", "insurance_type": "건강보험"}}
    prompt = build_document_dynamic_system(source)

    # ensure_ascii=False → 한글이 그대로 출력되어야 함
    assert "홍길동" in prompt
    assert "건강보험" in prompt
    # Unicode escape 형태로 들어가면 안 됨
    assert "\\ud64d" not in prompt  # 홍 유니코드 이스케이프


def test_all_doc_types_have_output_schema():
    """Every DocType defined in OUTPUT_SCHEMAS has a valid JSON schema."""
    for doc_type in [
        DocType.진단서,
        DocType.소견서,
        DocType.확인서,
        DocType.의뢰서,
        DocType.건강진단서,
        DocType.검사결과안내서,
        DocType.교육문서,
    ]:
        assert doc_type in OUTPUT_SCHEMAS, f"{doc_type}: OUTPUT_SCHEMAS에 없음"
        # 유효한 JSON인지 확인
        parsed = json.loads(OUTPUT_SCHEMAS[doc_type])
        assert isinstance(parsed, dict), f"{doc_type}: 스키마가 dict가 아님"
        assert "title" in parsed, f"{doc_type}: 스키마에 title 키 없음"
