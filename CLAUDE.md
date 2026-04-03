# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**aro** (아로새기다) — 충청북도 보건소/보건지소 전용 AI 어시스턴트. 의사 1인 체제에서 진료 문서화, 약물 안전성 검토, 검진 추적, 환자 교육을 AI로 보조한다.

PRD: `docs/PRD.md` (원본: `aro-PRD-v1.1.md`)
컨텍스트 압축본: `aro-context-summary.md`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18+ / TypeScript / Tailwind CSS / Vite |
| Backend | Python 3.12+ / FastAPI |
| Database | SQLite (v1) → PostgreSQL (확장 시) |
| ORM | SQLAlchemy 2.0 + Alembic |
| AI Engine | Claude API (Anthropic) — Sonnet 4.6 기본 |
| Offline Fallback | EXAONE 3.5 7.8B (Ollama) |
| Package Mgmt | pnpm (frontend) / uv (backend) |
| Document Engine | python-docx + WeasyPrint |

## Commands

```bash
# Backend
cd backend
uv run python main.py              # 서버 실행
uv run pytest tests/ -v             # 테스트 전체 실행
uv run pytest tests/test_soap.py -v # 단일 테스트
uv run pytest tests/ -k "test_name" # 특정 테스트
ruff check . && ruff format .       # lint + format
ty check                            # type check

# Frontend
cd frontend
pnpm dev                            # 개발 서버
pnpm build                          # 빌드
pnpm test                           # 테스트
pnpm typecheck                      # 타입 체크
```

## Architecture

### 4 Modules + Core Layer

```
aro Web Application
├── Module 1: SOAP Writer         — 속기 입력 → SOAP 변환 (Claude Sonnet)
├── Module 2: Polypharmacy Review — DDI 검출, 신기능 용량 조절, Sick Day Rules
├── Module 3: Document Automation — 진단서/의뢰서 등 4중 검증 자동 생성
├── Module 4: Screening & F/U    — 검진 추적, 리마인더, 교육 문서, 대시보드
└── Core Layer (공통)
    ├── LLMService   — Claude API 래퍼 (모델 선택, 캐싱, hallucination guard)
    ├── Patient Model — SQLAlchemy ORM + 암호화
    ├── Auth         — JWT + role-based (의사/간호사/관리자)
    ├── External APIs — 식약처, 심평원, 카카오 알림톡
    └── Document Engine — python-docx + WeasyPrint
```

### Directory Structure

```
aro/
├── backend/
│   ├── pyproject.toml
│   ├── main.py, config.py
│   ├── core/           # 공통 기반
│   │   ├── database.py, security.py
│   │   ├── models/     # Patient, Encounter, Prescription, Screening, Document, User
│   │   ├── llm/        # service.py, guards.py, terminology.py, prompts/
│   │   ├── external/   # druginfo, dur, kcd, kakao, hospital API 연동
│   │   └── document/   # generator, pdf_converter, seal, templates/
│   ├── modules/        # 4개 모듈 (각각 router/service/schemas 구조)
│   │   ├── soap/
│   │   ├── polypharmacy/
│   │   ├── screening/
│   │   └── documents/
│   └── api/v1.py
├── frontend/src/
│   ├── components/     # Layout, PatientSearch, PatientCard, ClinicalDashboard, ui/
│   ├── pages/          # Dashboard, SOAP, DrugReview, Screening, Documents
│   ├── hooks/, api/, types/
├── data/               # JSON 데이터 (약어, DDI, 용량조절, Sick Day, 교육모듈 등)
└── docs/
```

### Module Interconnections

- **SOAP → Sick Day Alert**: SOAP 입력 시 약물검토 모듈의 Sick Day 감지 엔진 자동 호출
- **SOAP → 의뢰서**: SOAP 기록 → 문서자동화에서 내용 자동 참조
- **검사 결과 → F/U 대시보드**: 검사 이상값 → 추적 알림 자동 감지

## Core Design Principles

1. **Rule-based first, LLM은 해석/다듬기만**: DDI, 용량 조절, 검사 분류는 룰 엔진. LLM은 사실을 쉬운 말로 번역하거나 문체를 다듬는 역할만
2. **Hallucination 방지 = 4중 레이어**: 입력 구조화 → 프롬프트 제약 → 코드 검증 → 의사 확인
3. **주관적 표현 배제**: AI는 사실 기술만, 판단은 의사가. "양호", "심각한", "다행히" 등 가치 판단어 금지. 수치+측정일, 변화량, 가이드라인 분류만 사용
4. **의사 판단 플레이스홀더**: LLM이 판단 영역은 `[의사 소견: ___]`로 빈칸 처리
5. **프롬프트 캐싱 필수**: 시스템 프롬프트+코드북+문체가이드는 매 호출 반복 → 캐싱으로 90% 할인
6. **약물검토 Hallucination Guard**: DDI는 반드시 DB 조회 결과만 사용, LLM 생성 절대 금지

## LLM Model Selection

| 용도 | 모델 |
|------|------|
| SOAP 변환, 문서 생성, 약물 해석 | Sonnet 4.6 |
| 단순 메시지 다듬기 (리마인더 등) | Haiku 4.5 |
| 복합 약물 판단 (예외적) | Opus 4.6 |
| 오프라인 fallback (SOAP only) | EXAONE 3.5 7.8B (Ollama) |

월 API 예산: $15 이하 (약 22,000원)

## Key Data Models

- **Patient**: 환자 (이름/연락처 AES-256 암호화, 만성질환 KCD 코드, 알림톡 동의)
- **Encounter**: 진료 기록 SOAP (raw_input → S/O/A/P 변환, vitals, labs, KCD codes)
- **Prescription**: 처방 (상품명/INN/ATC/DrugBank ID 매핑, 보건소/타원 구분)
- **VisitSchedule**: 내원 예약 (예정 검사, 금식, 리마인더 발송 이력)
- **FollowUpAlert**: 추적 알림 (lab_recheck/screening_fu/no_show, 우선순위 3단계)

## Development Phases

| Phase | 내용 |
|-------|------|
| Phase 0 (Week 1-2) | 프로젝트 기반 — DB 모델, FastAPI/React 초기화, LLMService, JWT 인증 |
| Phase 1 (Week 3-4) | SOAP Writer — 약어 코드북 3-Layer, SOAP 변환, 임상 대시보드 |
| Phase 2 (Week 5-7) | Document Automation — 4중 검증, 주관적 표현 필터, 템플릿 5종 |
| Phase 3 (Week 8-11) | Polypharmacy Review — DDI DB, 신기능 용량 DB, Sick Day Rules |
| Phase 4-A (Week 12-14) | 검진 추적 — 안내서, 리마인더, 알림톡 연동 |
| Phase 4-B (Week 15-17) | 환자 관리 — 교육 문서, 대시보드, 월간 보고서 |

## Domain-Specific Rules

### 의료 약어 코드북 3-Layer
- Layer 1 (Built-in): 한국 의료계 공통 약어 ~200개
- Layer 2 (Institution): 경희대병원 내과 관례
- Layer 3 (Personal): 또비 개인 약어 (예: `met1000` = Metformin 1000mg/day)

### 신기능 용량 조절 DB 3-Tier
- Tier 1: 수작업 고빈도 ~40종 (PI+KDIGO 기반) — 환자 80-90% 커버
- Tier 2: DrugBank+LLM 반자동 ~200종
- Tier 3: 미등록 약물 LLM 플래깅

### 문서 유형별 용어 수준
- 진단서/소견서: 정식 한국어 + KCD 코드
- 의뢰서: 의학 영어 혼용 가능
- 안내서/교육문서: 어르신 대상 쉬운 한국어, 14pt 이상

### 보안
- 환자 이름/연락처: AES-256 컬럼 레벨 암호화
- 진료기록 10년 보존 (의료법 준수), DB 삭제 방지
- 감사 로그: 환자 정보 조회/수정 이력 전수 기록
