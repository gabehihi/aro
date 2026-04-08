# aro 아키텍처

## 4 Modules + Core Layer

```
aro Web Application
├── Module 1: SOAP Writer         — 속기 입력 → SOAP 변환 (Claude Sonnet)
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
│   │   │   ├── encounter.py     # SOAPRequest/Response
│   │   │   └── codebook.py
│   │   └── llm/                 # LLM 엔진
│   │       ├── service.py       # LLMService (Claude API 래퍼)
│   │       └── guards.py        # HallucinationGuard, SubjectiveFilter
│   │
│   ├── modules/                 # 기능 모듈
│   │   ├── soap/                # ✅ Phase 1 구현 완료
│   │   │   ├── service.py       # SOAPService.convert()
│   │   │   ├── codebook.py      # 3-Layer 코드북 (builtin>institution>personal)
│   │   │   ├── vitals.py        # 정규식 활력징후 추출
│   │   │   ├── parser.py        # LLM 응답 파싱
│   │   │   ├── sick_day.py      # Sick Day 감지
│   │   │   └── prompts.py       # 시스템/동적 프롬프트
│   │   ├── polypharmacy/        # 🔲 Phase 3
│   │   ├── documents/           # 🔲 Phase 2
│   │   └── screening/           # 🔲 Phase 4
│   │
│   ├── api/                     # RESTful 엔드포인트
│   │   ├── v1.py                # 라우터 통합
│   │   ├── patients.py          # Patient CRUD
│   │   ├── encounters.py        # SOAP convert + Encounter CRUD
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

- **SOAP → Sick Day Alert**: SOAP 입력 시 sick_day.py가 키워드+활성 처방 교차 확인 → 자동 알림
- **SOAP → 의뢰서**: SOAP 기록 → 문서자동화 모듈에서 내용 자동 참조
- **검사 결과 → F/U 대시보드**: 검사 이상값 → 추적 알림 자동 감지

---

## SOAP 변환 플로우 (Phase 1 구현)

```
의사 속기 입력
    ↓
[1] 정규식 활력징후 추출 (vitals.py)
    ↓
[2] 3-Layer 코드북으로 약어 해석 컨텍스트 구성 (codebook.py)
    ↓
[3] 프롬프트 빌드: cached_system (시스템+코드북) + dynamic_system (환자 컨텍스트)
    ↓
[4] Claude Sonnet 4.6 → SOAP JSON (prompts.py → service.py)
    ↓
[5] LLM 응답 파싱 + JSON 복구 (parser.py)
    ↓
[6] Hallucination Guard: vitals 교차검증, 범위 검증, 미언급 진단/검사 감지 (guards.py)
    ↓
[7] 주관적 표현 필터: ~30개 한국어 패턴 스캔 (guards.py)
    ↓
[8] Sick Day 감지: 키워드 → 활성 처방 교차 → HOLD/REDUCE/MONITOR (sick_day.py)
    ↓
[9] SOAPResult 반환 → 의사 미리보기/편집 (Human-in-the-loop)
    ↓
[10] 의사 확인 → POST /encounters → DB 저장
```

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
