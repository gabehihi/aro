"""Document generation prompts with per-type constraints.

Layer 2 of the 4-layer Grounded Generation pipeline.
Each document type has specific style guides, constraints, and output schemas.
The cached system prompt (~3000 tokens) enables prompt caching for cost savings.
"""

import json

from core.models.enums import DocType

# ---------------------------------------------------------------------------
# Shared constraints — all document types
# ---------------------------------------------------------------------------

DOCUMENT_CONSTRAINTS = """
# 절대 제약 (모든 문서 유형 공통)
1. source_data JSON에 없는 검사/소견/진단을 생성하지 마세요.
2. 수치를 변조하지 마세요 — 원본 값 그대로 사용하세요.
3. 시행하지 않은 검사 결과를 기술하지 마세요.
4. 소견 작성이 어려운 경우 → [의사 소견: ___] 플레이스홀더를 사용하세요.
5. 주관적/가치 판단 표현을 사용하지 마세요 (양호, 심각한, 다행히, 호전 등).
6. 수치는 사실로, 판단은 의사가 — AI는 객관적 사실만 기술합니다.
""".strip()

# ---------------------------------------------------------------------------
# Per-type style guides
# ---------------------------------------------------------------------------

STYLE_GUIDES: dict[DocType, str] = {
    DocType.진단서: (
        "정식 한국어 + KCD 코드 병기. 예: '본태성 고혈압(I10)'. 진단일, 진단 근거 수치 포함."
    ),
    DocType.소견서: (
        "정식 한국어, 상세 기술. 측정값은 단위 포함. 예: '추정 사구체여과율 52 mL/min/1.73m²'"
    ),
    DocType.확인서: ("사실 기반 최소 기술. 내원일, 방문 횟수, 진단명만 기술. LLM 해석 최소화."),
    DocType.의뢰서: (
        "의학 영어 혼용 가능. 예: 'eGFR 52로 CKD G3a stage'. 의뢰 사유와 요청 검사/시술 명시."
    ),
    DocType.건강진단서: (
        "일반인 대상 쉬운 한국어. 의학용어는 한글 정식명칭 + 영문 병기: '사구체여과율(eGFR)'"
    ),
    DocType.검사결과안내서: (
        "검사 결과 안내문 작성을 위한 보조 요약을 제공합니다. "
        "환자가 이해하기 쉬운 한국어로 각 수치의 의미를 간단히 설명하세요. "
        "의학적 판단 표현(좋습니다/나쁩니다) 없이 사실만 기술하세요. "
        "문장은 14pt 이상 인쇄를 고려하여 짧고 명확하게 작성하세요."
    ),
    DocType.교육문서: (
        "만성질환 교육 안내문에 환자 맞춤형 메모를 추가합니다. "
        "제공된 환자 정보(진단명, 최근 검사값, 처방 약물)를 바탕으로 "
        "2~3문장의 개인화된 안내를 작성하세요. "
        "의학적 판단이나 예후 언급 금지. 사실 기술만 허용."
    ),
}

# ---------------------------------------------------------------------------
# Per-type JSON output schemas
# ---------------------------------------------------------------------------

OUTPUT_SCHEMAS: dict[DocType, str] = {
    DocType.진단서: json.dumps(
        {
            "title": "진단서",
            "patient_info": "환자 기본정보 요약",
            "diagnosis": "진단명 + KCD 코드",
            "diagnosis_date": "진단일",
            "clinical_findings": "임상 소견 (수치 기반)",
            "doctor_opinion": "[의사 소견: ___]",
            "purpose": "용도",
        },
        ensure_ascii=False,
        indent=2,
    ),
    DocType.소견서: json.dumps(
        {
            "title": "소견서",
            "patient_info": "환자 기본정보 요약",
            "chief_complaint": "주요 증상",
            "clinical_course": "경과 기술 (수치 기반, 시간순)",
            "current_status": "현재 상태 (최근 검사 결과)",
            "doctor_opinion": "[의사 소견: ___]",
            "recommendation": "권고사항",
        },
        ensure_ascii=False,
        indent=2,
    ),
    DocType.확인서: json.dumps(
        {
            "title": "진료확인서",
            "patient_info": "환자 기본정보 요약",
            "visit_dates": "내원일 목록",
            "visit_count": "총 내원 횟수",
            "diagnosis": "진단명",
            "purpose": "용도",
        },
        ensure_ascii=False,
        indent=2,
    ),
    DocType.의뢰서: json.dumps(
        {
            "title": "진료의뢰서",
            "patient_info": "환자 기본정보 요약",
            "referral_reason": "[의뢰 사유: ___]",
            "clinical_summary": "임상 요약 (진단, 투약, 최근 검사)",
            "requested_evaluation": "요청 검사/시술",
            "current_medications": "현재 투약 목록",
        },
        ensure_ascii=False,
        indent=2,
    ),
    DocType.건강진단서: json.dumps(
        {
            "title": "건강진단서",
            "patient_info": "환자 기본정보 요약",
            "exam_date": "검진일",
            "exam_results": "검진 항목별 결과",
            "overall_assessment": "[의사 소견: ___]",
            "restrictions": "업무 제한 사항 (해당 시)",
        },
        ensure_ascii=False,
        indent=2,
    ),
    DocType.검사결과안내서: json.dumps(
        {
            "title": "검사결과안내서",
            "patient_info": "환자 기본정보 요약",
            "exam_date": "검사일",
            "results_table": "검사 항목별 결과 및 참고치",
            "abnormal_items": "비정상 항목 목록",
            "doctor_opinion": "[의사 소견: ___]",
        },
        ensure_ascii=False,
        indent=2,
    ),
    DocType.교육문서: json.dumps(
        {
            "title": "교육문서",
            "patient_info": "환자 기본정보 요약",
            "topic": "교육 주제",
            "key_points": "핵심 교육 내용 (목록)",
            "action_items": "환자 실천 사항",
            "next_visit": "다음 방문 안내",
        },
        ensure_ascii=False,
        indent=2,
    ),
}

# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

_ROLE_DESCRIPTION = (
    "당신은 충청북도 보건소/보건지소 의료 문서 작성 AI입니다. "
    "source_data에 기반하여 의료 문서를 작성합니다."
)


def build_document_cached_system(doc_type: DocType) -> str:
    """Build the cacheable system prompt for a given document type.

    Combines role description, shared constraints, type-specific style guide,
    and output schema. This ~3000-token prompt is stable per doc_type and
    suitable for Anthropic prompt caching.

    Args:
        doc_type: Type of document to generate.

    Returns:
        Full system prompt string for the LLM.
    """
    style = STYLE_GUIDES.get(doc_type, "")
    schema = OUTPUT_SCHEMAS.get(doc_type, "{}")

    return "\n\n".join(
        [
            _ROLE_DESCRIPTION,
            f"# 절대 제약\n{DOCUMENT_CONSTRAINTS}",
            f"# 문체 가이드 ({doc_type})\n{style}",
            f"# 출력 스키마 (JSON)\n아래 구조로 JSON을 반환하세요:\n{schema}",
        ]
    )


def build_document_dynamic_system(source_data: dict) -> str:
    """Build the dynamic user-turn prompt containing serialized source data.

    The LLM is instructed to reference only this data, preventing hallucination
    by providing a bounded set of facts.

    Args:
        source_data: Assembled source dict from SourceDataAssembler.assemble().

    Returns:
        Formatted prompt string with embedded JSON source data.
    """
    serialized = json.dumps(source_data, ensure_ascii=False, indent=2)
    return (
        "# Source Data (참조 데이터)\n"
        "아래 데이터만 참조하여 문서를 작성하세요. "
        "이 데이터에 없는 내용은 절대 생성하지 마세요.\n\n"
        f"{serialized}"
    )
