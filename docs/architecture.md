# aro 아키텍처

## 4 Modules + Core Layer

```
aro Web Application
├── Module 1: SOAP Writer         — 만성 9종/급성 증상 기반 템플릿 (AI 미사용)
├── Module 2: Polypharmacy Review — DDI 검출, 신기능 용량 조절, Sick Day Rules
├── Module 3: Document Automation — 진단서/의뢰서 등 4중 검증 자동 생성
├── Module 4: Screening & F/U    — 검진 추적, 리마인더, 교육 문서, 대시보드
└── Core Layer (공통)
    ├── LLMService   — Claude API 래퍼 (모델 선택, 캐싱, hallucination guard)
    ├── Patient Model — SQLAlchemy ORM + AES-256 암호화
    ├── Auth         — JWT + role-based (의사/간호사/관리자)
    ├── External APIs — 식약처, 심평원, 카카오 알림톡
    └── Document Engine — python-docx + WeasyPrint
```

---

## 디렉토리 구조

```
aro/
├── CLAUDE.md                     # Claude Code 가이드 (핵심만)
├── aro-PRD-v1.1.md              # PRD 원본
│
├── backend/
│   ├── main.py                  # FastAPI 앱 엔트리
│   ├── config.py                # 환경 설정 (Settings)
│   ├── .env                     # API 키, 암호화 키 (git 제외)
│   ├── pyproject.toml           # uv 의존성
│   │
│   ├── core/                    # 공통 기반
│   │   ├── database.py          # async SQLAlchemy 세션
│   │   ├── security.py          # JWT, 비밀번호 해싱
│   │   ├── models/              # ORM 모델
│   │   │   ├── base.py          # DeclarativeBase
│   │   │   ├── encryption.py    # AES-256-GCM EncryptedString
│   │   │   ├── user.py          # User + personal_codebook JSON
│   │   │   ├── patient.py       # Patient (이름/연락처 암호화)
│   │   │   ├── encounter.py     # Encounter (SOAP)
│   │   │   ├── visit_schedule.py
│   │   │   ├── screening.py
│   │   │   ├── follow_up_alert.py
│   │   │   ├── document.py
│   │   │   └── audit_log.py
│   │   ├── schemas/             # Pydantic 요청/응답
│   │   │   ├── patient.py
│   │   │   ├── encounter.py     # EncounterCreate/Response + SOAPPrefillResponse
│   │   │   └── codebook.py
│   │   └── llm/                 # LLM 엔진
│   │       ├── service.py       # LLMService (Claude API 래퍼)
│   │       └── guards.py        # HallucinationGuard, SubjectiveFilter
│   │
│   ├── modules/                 # 기능 모듈
│   │   ├── soap/                # ✅ 템플릿 기반 재설계 (2026-04-18)
│   │   │   ├── codebook.py      # 3-Layer 코드북 (polypharmacy/documents 공용)
│   │   │   ├── vitals.py        # 정규식 활력징후 추출 (documents가 참조)
│   │   │   └── sick_day.py      # Sick Day 감지 (polypharmacy가 참조)
│   │   │   # service.py/prompts.py/parser.py 삭제 — /soap-prefill만 제공
│   │   ├── polypharmacy/        # 🔲 Phase 3
│   │   ├── documents/           # 🔲 Phase 2
│   │   └── screening/           # 🔲 Phase 4
│   │
│   ├── api/                     # RESTful 엔드포인트
│   │   ├── v1.py                # 라우터 통합
│   │   ├── patients.py          # Patient CRUD
│   │   ├── encounters.py        # Encounter CRUD + GET /patients/{id}/soap-prefill
│   │   └── codebook.py          # 약어 코드북 API
│   │
│   ├── alembic/                 # DB 마이그레이션
│   ├── scripts/
│   │   └── seed_test_data.py    # 테스트 더미 데이터
│   └── tests/                   # pytest (77개)
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx        # JWT 로그인
│       │   ├── Dashboard.tsx    # 메인 대시보드
│       │   ├── SOAPWriter.tsx   # SOAP 기록 (60/40 2-column)
│       │   └── Placeholder.tsx  # 미구현 페이지
│       ├── components/
│       │   ├── Layout/          # AppLayout, Header, Sidebar
│       │   ├── soap/            # SOAP 전용 컴포넌트 15개
│       │   └── ui/              # shadcn/ui 컴포넌트 9개
│       ├── hooks/
│       │   ├── useAuth.ts       # 인증 상태
│       │   └── useSoapStore.ts  # zustand SOAP 상태
│       ├── api/                 # patients, soap, clinical API 호출
│       ├── types/index.ts       # 전체 TypeScript 타입
│       └── lib/                 # Axios 인스턴스, 유틸
│
└── data/                        # JSON 데이터 소스
    ├── codebook_builtin.json    # 한국 의료 약어 ~200개
    └── codebook_institution.json # 기관별 약어
```

---

## 데이터 모델 (Key Entities)

| 모델 | 설명 | 특이사항 |
|------|------|---------|
| **User** | 의사/간호사/관리자 | personal_codebook JSON 컬럼 |
| **Patient** | 환자 | 이름/연락처 AES-256-GCM 암호화, 만성질환 KCD 코드 |
| **Encounter** | 진료 기록 | raw_input → S/O/A/P, vitals, labs, KCD codes (JSON) |
| **Prescription** | 처방 | 상품명/INN/ATC/DrugBank ID 매핑 |
| **VisitSchedule** | 내원 예약 | 예정 검사, 금식, 리마인더 발송 이력 |
| **FollowUpAlert** | 추적 알림 | lab_recheck/screening_fu/no_show, 우선순위 3단계 |
| **Document** | 생성 문서 | 진단서/의뢰서 등 |
| **AuditLog** | 감사 로그 | 환자 정보 접근 이력 |

---

## 모듈 간 연동

- **이전 방문 → SOAP 프리필**: 환자 선택 시 직전 3 encounter를 스캔, KCD→DiseaseId 매핑·lab dedupe(180일)·health_promotion 복사
- **SOAP → 문서/약물검토**: encounters.kcd_codes / vitals / labs JSON이 의뢰서·월간보고서·polypharmacy 입력으로 재사용됨
- **검사 결과 → F/U 대시보드**: 검사 이상값 → 추적 알림 자동 감지

---

## SOAP 작성 플로우 (템플릿 재설계, 2026-04-18)

```
환자 검색 → 선택
    ↓
[1] GET /patients/{id}/soap-prefill
    → 최근 3 encounter → kcd_codes → DiseaseId 매핑 (I10→HTN, E11.9→DM, …)
    → latest vitals + labs_by_name(180일 컷) + health_promotion 복사
    ↓
[2] useSoapStore.applyPrefill() → raw state 세팅
    ↓
[3] (만성 탭) DiseasePicker 토글 / VitalsInputCard / 질환별 섹션 입력
    (급성 탭) SymptomSelector ± 토글 → CC 지정 + OnsetInput
    ↓
[4] useSoapSelectors — 순수 함수가 raw state → S/O/A/P 한국어 문자열 조립
    → manualOverrides 존재 시 수기 편집 우선 (텍스트 편집 보존)
    ↓
[5] SOAPPreviewPane 4 textarea 즉시 재렌더 → CopyButton으로 EMR 붙여넣기
    ↓
[6] SaveEncounterButton → POST /encounters
    raw_input = "TEMPLATE_V1|{mode,chronic,acute,overrides}" (감사 추적)
    kcd_codes = 선택된 DiseaseId → canonical KCD union
```

AI 호출 없음. 모든 템플릿은 `frontend/src/utils/soap/` 순수 함수 (Vitest 55 tests).

---

## 도메인 규칙

### 약어 코드북 3-Layer (우선순위: personal > institution > builtin)
- **Layer 1 (Built-in)**: 한국 의료계 공통 약어 ~200개 (`data/codebook_builtin.json`)
- **Layer 2 (Institution)**: 경희대병원 내과 관례 (`data/codebook_institution.json`)
- **Layer 3 (Personal)**: 의사 개인 약어 (User.personal_codebook JSON)

### 신기능 용량 조절 DB 3-Tier (Phase 3에서 구현)
- Tier 1: 수작업 고빈도 ~40종 (PI+KDIGO 기반)
- Tier 2: DrugBank+LLM 반자동 ~200종
- Tier 3: 미등록 약물 LLM 플래깅

### 문서 유형별 용어 수준
- 진단서/소견서: 정식 한국어 + KCD 코드
- 의뢰서: 의학 영어 혼용 가능
- 안내서/교육문서: 어르신 대상 쉬운 한국어, 14pt 이상
