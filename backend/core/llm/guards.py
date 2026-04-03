from dataclasses import dataclass


@dataclass
class GuardWarning:
    type: str  # "hallucination", "subjective_expression", etc.
    message: str
    location: str  # 텍스트 내 위치
    severity: str  # "error", "warning"


class HallucinationGuard:
    """입력 데이터에 없는 사실이 생성되었는지 검증 (Phase 2-3에서 구현)"""

    async def check(self, input_data: dict, generated_text: str) -> list[GuardWarning]:
        return []


class SubjectiveExpressionFilter:
    """주관적 표현 감지 (Phase 2에서 구현)"""

    async def scan(self, text: str) -> list[GuardWarning]:
        return []
