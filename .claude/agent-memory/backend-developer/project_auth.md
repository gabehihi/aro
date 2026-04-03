---
name: Auth Implementation
description: JWT + bcrypt 인증 구현 세부 사항 (알고리즘, 토큰 수명, admin 시딩)
type: project
---

Phase 0 인증 구현.

**Why:** 의료 정보 접근 통제 필수. 역할 3단계(doctor/nurse/admin).
**How to apply:** 보호 엔드포인트는 `Depends(get_current_user)` 또는 `Depends(require_role(UserRole.doctor))` 사용.

## 세부 사항

- 알고리즘: HS256
- 토큰 수명: 480분 (8시간, 진료 교대 주기 고려)
- 로그인: `POST /api/v1/auth/login` — OAuth2PasswordRequestForm (form-data)
- 비밀번호 해시: bcrypt (passlib)
- 초기 admin 계정: `INITIAL_ADMIN_PASSWORD` 환경변수로 시딩, users 테이블 비어있을 때만

## 환경변수
- `SECRET_KEY`: JWT 서명 키
- `ALGORITHM`: HS256
- `ACCESS_TOKEN_EXPIRE_MINUTES`: 480
- `INITIAL_ADMIN_PASSWORD`: 초기 admin 비밀번호 (빈 문자열이면 시딩 건너뜀)
