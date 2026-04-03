---
name: LLM Service
description: LLMService 구조, 3-tier 모델 선택, prompt 캐싱 패턴
type: project
---

Phase 0에서 구현한 LLMService 골격.

**Why:** 월 API 예산 $15 이하 유지. 프롬프트 캐싱으로 90% 절감 목표.
**How to apply:** 모든 LLM 호출은 LLMService를 통해. ANTHROPIC_API_KEY 미설정 시 RuntimeError 발생 → 테스트 환경에서 mock 필요.

## 모델 티어
| Tier | 모델 | 용도 |
|------|------|------|
| SONNET | claude-sonnet-4-20250514 | SOAP, 문서 생성, 약물 해석 |
| HAIKU | claude-haiku-4-5-20251001 | 리마인더 메시지 다듬기 |
| OPUS | claude-opus-4-20250414 | 복합 약물 판단 (예외) |

## 캐싱 패턴
- `generate_with_cache()`: cached_system에 `cache_control: ephemeral` 자동 추가
- 시스템 프롬프트 + 코드북은 cached_system으로 전달
- dynamic_system은 캐싱 없이 매 요청마다 포함

## 파일 위치
- `backend/core/llm/service.py` — LLMService, ModelTier, LLMResponse
- `backend/core/llm/guards.py` — HallucinationGuard, SubjectiveExpressionFilter (스텁)
