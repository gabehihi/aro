---
name: API Endpoints
description: Phase 0에서 구현된 FastAPI 엔드포인트 목록과 인증 패턴
type: project
---

Phase 0 구현 완료 기준 엔드포인트.

**Why:** Phase별 확장 시 기존 경로와 충돌 방지.
**How to apply:** 모든 신규 라우터는 `api/v1.py`에 include하거나 별도 APIRouter를 만들어 v1 라우터에 포함시킨다. prefix는 항상 `/api/v1`.

## 구현된 엔드포인트

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | /health | 서버 상태 확인 | 불필요 |
| POST | /api/v1/auth/login | JWT 발급 (form-data) | 불필요 |
| GET | /api/v1/auth/me | 현재 사용자 정보 | Bearer Token |

## 인증 의존성
- `get_current_user`: Bearer 토큰 검증 → User 반환
- `require_role(*roles)`: 역할 기반 접근 제한, 팩토리 함수 패턴

## 파일 위치
- `backend/api/v1.py` — 메인 라우터
- `backend/core/security.py` — JWT 유틸, 의존성 함수
- `backend/core/schemas/auth.py` — 요청/응답 Pydantic 모델
