# CLAUDE.md

> **aro** (아로새기다) — 충청북도 보건소/보건지소 전용 AI 어시스턴트
> 의사 1인 체제에서 진료 문서화, 약물 안전성 검토, 검진 추적, 환자 교육을 AI로 보조한다.

아키텍처: `docs/architecture.md` | 개발 로드맵: `docs/development-phases.md`

---

## 현재 진행 상태

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 0 — 프로젝트 기반 | ✅ 완료 | 2026-04-04 |
| Phase 1 — SOAP Writer | ✅ 완료 | 2026-04-06 |
| Phase 2 — Document Automation | ✅ 완료 | 2026-04-13 |
| Phase 3 — Polypharmacy Review | ✅ 완료 | 2026-04-14 |
| Phase 4 — Screening & F/U (Core) | ✅ 완료 | 2026-04-16 |
| Phase 5 — 잔여 기능 완성 | ✅ 완료 | 2026-04-16 |
| Codex 보강 — 보안/설정/처방/대시보드 | ✅ 완료 | 2026-04-17 |
| SOAP Writer 재설계 — AI 제거 + 템플릿 기반 | ✅ 완료 | 2026-04-18 |
| F4-4 카카오 알림톡 + SMS | 🔲 미착수 | 외부 API 계약 필요 |

### Phase별 완료 산출물

| Phase | 핵심 산출물 | 테스트 |
|-------|------------|--------|
| Phase 1 | (구) SOAP 변환 엔진, Hallucination Guard, ClinicalDashboard | 77개 |
| Phase 2 | 5종 문서 자동생성, 4중 검증 파이프라인, DOCX/PDF 렌더러 | +78개 |
| Phase 3 | DDI 체커(15쌍), 신기능 용량조절(16약물), SickDay Advanced(14군) | +30개 |
| Phase 4 Core | 이상소견 분류기(11종), F/U 알림 엔진(7규칙), 검진 대시보드 UI | +27개 |
| Phase 5 | 환자관리 페이지, 내원예약 API, 월간보고서, 교육문서 4종, 설정 페이지 | +9개 |
| Codex 보강 | 처방 CRUD, 홈 대시보드 실데이터화, 역할 기반 접근 제어, 보고서 아카이브, 검진 정합성 수정, 설정 서버 저장 | +28개 |
| SOAP 재설계 | 만성 9종/급성 증상 기반 템플릿 + `/soap-prefill` + Vitest 55 | backend −12 / frontend +55 |

**전체 테스트**: backend 256개 + frontend 55개 passing

### 미구현 항목 (잔여)

| 항목 | 분류 | 비고 |
|------|------|------|
| 카카오 알림톡 + SMS | 핵심 | 외부 API (카카오 bizm, NHN) 계약 필요 |
| 월간 보고서 자동 스케줄링 | 부가 | APScheduler 연동 (현재 수동 트리거) |
| 프론트 번들 크기 최적화 | 부가 | 현재 ~822 kB, 라우트 단위 코드 스플리팅 필요 |
| 문서/보고서 아카이브 전용 화면 | 부가 | 검색/상태/기간 필터 포함 전용 페이지 |
| 대시보드 시각화 고도화 | 부가 | 환자 증가 추이, 발급 유형 분포, 월별 이상소견 추이 |
| 임상 요약 follow-up 연계 보완 | 부가 | SOAP 임상 요약의 follow_up_alerts 확장 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 / TypeScript / Tailwind CSS v4 / Vite / shadcn/ui / Recharts / zustand |
| Backend | Python 3.12 / FastAPI / SQLAlchemy 2.0 async / Alembic |
| Database | SQLite (v1) → PostgreSQL (확장 시) |
| AI Engine | Claude Sonnet 4.6 (기본) / Haiku 4.5 (경량) / Opus 4.6 (예외) |
| Offline | EXAONE 3.5 7.8B (Ollama) |
| Package | pnpm (frontend) / uv (backend) |
| Document | python-docx + WeasyPrint |

---

## Commands

```bash
# Backend
cd backend
uv run python main.py                        # 서버 실행 (port 8000)
uv run pytest tests/ -v                      # 테스트 전체 (256 tests)
uv run pytest tests/ -k "test_name"          # 특정 테스트
uv run ruff check . && uv run ruff format .  # lint + format

# Frontend
cd frontend
pnpm dev                           # 개발 서버 (port 5173)
pnpm build                         # 프로덕션 빌드 (tsc + vite)
pnpm test --run                    # Vitest 단위 테스트 (55 tests)

# DB
cd backend
uv run alembic upgrade head        # 마이그레이션 적용
uv run python scripts/seed_test_data.py  # 테스트 데이터 투입
```

---

## 핵심 설계 원칙

1. **Rule-based first** — DDI, 용량 조절, 검사 분류는 룰 엔진. LLM은 해석/다듬기만
2. **Hallucination 방지 4중 레이어** — 입력 구조화 → 프롬프트 제약 → 코드 검증 → 의사 확인
3. **주관적 표현 배제** — AI는 사실 기술만, 판단은 의사. 수치+변화량+가이드라인 분류만 사용
4. **의사 판단 플레이스홀더** — LLM 판단 영역은 `[의사 소견: ___]`로 빈칸 처리
5. **프롬프트 캐싱** — 시스템 프롬프트+코드북+문체가이드 캐싱 → 90% 비용 절감
6. **약물검토 Hallucination Guard** — DDI/용량 판단은 JSON DB 조회 결과만 사용, LLM 생성 절대 금지
7. **SOAP Writer = 템플릿** — SOAP 작성은 AI 호출 없이 버튼 토글 → 순수 함수 selector가 한국어 상용문구 생성. `manualOverrides`로 수기 편집 보존

---

## LLM 모델 선택

| 용도 | 모델 | 비용 참고 |
|------|------|----------|
| 문서 생성, 약물 해석 | Sonnet 4.6 | 월 ~$3 (캐싱 적용, SOAP 제거 후) |
| 리마인더 메시지 다듬기 | Haiku 4.5 | 최저 비용 |
| 복합 약물 판단 (예외적) | Opus 4.6 | 필요 시만 |

> SOAP Writer는 템플릿 기반으로 전환되어 LLM을 호출하지 않는다.

월 API 예산: $10 이하 (₩15,000)

---

## 보안

- 환자 이름/연락처: AES-256-GCM 컬럼 암호화 (`EncryptedString` TypeDecorator)
- 진료기록 10년 보존 (의료법), DB 삭제 방지
- 감사 로그: 환자 정보 조회/수정 이력 + 검진 저장/F/U 해결/일괄 업로드 이력 전수 기록
- `.env` 파일 git commit 금지
- 역할 기반 접근 제어: `doctor`(SOAP/약물검토), `doctor+nurse`(문서발급), `admin`(설정) — 권한 없는 경로는 ForbiddenPage 표시
- 사용자 프로필 필드: `clinic_name`, `clinic_address`, `clinic_phone` (서버 저장, localStorage 사용 금지)

---

## 현재 구현된 모듈 구조

```
backend/
├── api/
│   ├── v1.py              # 라우터 등록 (auth/patients/encounters/documents/codebook/polypharmacy/screening/visits/reports/dashboard/prescriptions)
│   ├── patients.py        # CRUD + 암호화 검색
│   ├── encounters.py      # 진료 기록 CRUD + 임상 요약 + `/patients/{id}/soap-prefill` (템플릿 프리필)
│   ├── documents.py       # 문서 생성/저장/발급/다운로드 (8 endpoints, draft→reviewed→issued 흐름)
│   ├── codebook.py        # 약어 코드북 관리
│   ├── polypharmacy.py    # 약물검토 API (POST /polypharmacy/review)
│   ├── screening.py       # 검진 API (classify-preview/results/dashboard/alerts/upload-bulk) ✅ + 인증/감사로그
│   ├── visits.py          # 내원예약 CRUD API (4 endpoints) ✅ Phase 5
│   ├── reports.py         # 월간 보고서 PDF/JSON/아카이브 API ✅ Codex 보강
│   ├── dashboard.py       # 홈 대시보드 집계 API (GET /dashboard/summary) ✅ Codex 보강
│   └── prescriptions.py   # 처방 CRUD API (환자별 조회/등록/수정/중단) ✅ Codex 보강
├── core/
│   ├── models/            # SQLAlchemy ORM (User/Patient/Encounter/Prescription/Document/ScreeningResult/FollowUpAlert/VisitSchedule)
│   │                      # User 모델: clinic_name/clinic_address/clinic_phone 필드 추가 (Codex 보강)
│   ├── schemas/           # Pydantic schemas (patient/encounter/document/codebook/auth/polypharmacy/screening/visit/prescription/dashboard/report)
│   └── llm/               # LLMService + HallucinationGuard + SubjectiveFilter
├── modules/
│   ├── soap/              # codebook/vitals/sick_day (polypharmacy/documents가 참조) — 변환 엔진은 제거됨
│   ├── documents/         # 문서 자동화 (assembler/guards/normalizer/prompts/parser/renderer/service)
│   │   └── templates/     # Jinja2 HTML (진단서/소견서/확인서/의뢰서/건강진단서/lab_guidance/education_htn/education_dm/education_dld/education_ckd/monthly_report/base)
│   ├── polypharmacy/      # Phase 3 ✅
│   │   ├── data/          # ddi_pairs.json (15쌍) / renal_dosing.json (16약물) / sick_day_rules.json (14군)
│   │   ├── ddi_checker.py       # DDIChecker — 양방향 인덱싱, severity 정렬
│   │   ├── renal_dosing.py      # RenalDosingChecker — eGFR [min,max) 구간 매칭
│   │   ├── sick_day_advanced.py # SickDayAdvancedChecker — 임상 플래그 + 검사치 트리거
│   │   └── service.py           # PolypharmacyService — 3체커 오케스트레이션 + LLM 요약
│   └── screening/         # Phase 4 ✅
│       ├── data/          # lab_normal_ranges.json (11종) / followup_rules.json (7규칙)
│       ├── classifier.py        # AbnormalClassifier — 3단계 tiering (urgent/caution/normal)
│       ├── follow_up.py         # FollowUpEngine — F/U 알림 후보 생성
│       └── service.py           # ScreeningService — 분류+저장+대시보드 오케스트레이터
└── tests/                 # 256 tests (SOAP 변환 테스트 12개 삭제 + /soap-prefill 5개 추가)
                           # 추가: test_prescriptions_api.py / test_dashboard_api.py
                           # 보강: test_reports_api.py / test_screening_api.py / test_screening_bulk_upload.py

frontend/src/
├── api/                   # axios 클라이언트 (auth/patients/encounters/documents/clinical/polypharmacy/screening/visits/prescriptions/dashboard/reports)
├── components/
│   ├── soap/              # 템플릿 SOAP Writer
│   │   ├── chronic/       # DiseasePicker/VitalsInputCard/EducationChecklist/DiseaseSections + 9 질환별 섹션
│   │   ├── acute/         # SymptomSelector/OnsetInput/HPIBuilder
│   │   ├── preview/       # SOAPPreviewPane(4 textarea + 수기 편집) / CopyButton
│   │   ├── ClinicalDashboard/VitalTrendsChart/PastVisitTimeline/MetricCards
│   │   └── PatientSearchBar/PatientSummaryCard/VisitTypeSelector/SaveEncounterButton
│   ├── documents/         # Document 관련 8개 컴포넌트 (실제 백엔드 다운로드 API 사용, draft→reviewed→issued 흐름)
│   ├── polypharmacy/      # Phase 3 ✅ (DrugListPanel/DDIFindings/RenalDosingPanel/SickDayAlertsPanel)
│   ├── screening/         # Phase 4~5 ✅ (DashboardMetricCard/LabResultsTable/FollowUpDashboard/ScreeningEntryForm/UpcomingVisitsCard)
│   ├── patients/          # PrescriptionPanel ✅ Codex 보강
│   ├── Layout/            # AppLayout/Header/Sidebar (역할별 메뉴 분리)
│   └── ui/                # shadcn/ui 컴포넌트 (card/badge/tabs/... )
├── utils/soap/            # SOAP 순수 함수 (diseases/symptoms 레지스트리 + 임상 계산 BMI/eGFR/ASCVD/CKD/KDIGO + 템플릿)
├── hooks/                 # useAuth / useSoapStore(raw) + useSoapSelectors(derived) / useDocumentStore / usePolypharmacyStore / useScreeningStore / useDebounce
├── pages/                 # Login / Dashboard(실데이터) / SOAPWriter(템플릿) / DocumentWriter / PolypharmacyReview / ScreeningPage / PatientsPage / SettingsPage(서버저장) / ForbiddenPage
└── types/index.ts         # 전체 타입 정의 (Phase 1~5 + Codex 보강 포함)
```

---

## 핵심 API 엔드포인트 (현재)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/encounters` | 진료 기록 저장 (템플릿 스냅샷 `raw_input="TEMPLATE_V1|..."` 허용) |
| GET | `/api/v1/patients/{id}/soap-prefill` | 직전 encounter → 만성질환/V/S/랩/교육 프리필 (SOAP Writer 자동 로드) |
| GET | `/api/v1/patients/{id}/clinical-summary` | 임상 요약 |
| POST | `/api/v1/documents/generate` | 문서 생성 (4중 검증 파이프라인) |
| POST | `/api/v1/documents/{id}/issue` | 문서 발급 |
| GET | `/api/v1/documents/{id}/download` | DOCX/PDF 다운로드 |
| POST | `/api/v1/polypharmacy/review` | 약물검토 리포트 (DDI+신기능+SickDay+LLM 요약) |
| POST | `/api/v1/screening/classify-preview` | 검진 결과 이상소견 미리보기 (저장 없음) |
| POST | `/api/v1/screening/results` | 검진 결과 저장 + 분류 + F/U 알림 자동 생성 |
| GET | `/api/v1/screening/dashboard` | F/U 대시보드 (메트릭 + 알림목록 + 미방문) |
| PATCH | `/api/v1/screening/alerts/{id}/resolve` | F/U 알림 완료 처리 |
| POST | `/api/v1/visits` | 내원 예약 생성 |
| GET | `/api/v1/visits` | 내원 예약 목록 (upcoming_only, patient_id 필터) |
| PATCH | `/api/v1/visits/{id}` | 예약 수정/완료 처리 |
| DELETE | `/api/v1/visits/{id}` | 예약 취소 (소프트 삭제) |
| GET | `/api/v1/reports/monthly/stats` | 월간 통계 JSON |
| GET | `/api/v1/reports/monthly` | 월간 보고서 PDF 다운로드 |
| GET | `/api/v1/reports/archive` | 저장된 월간 보고서 목록 |
| GET | `/api/v1/reports/archive/{year}/{month}` | 특정 월 보고서 PDF 다운로드 |
| GET | `/api/v1/dashboard/summary` | 홈 대시보드 집계 (오늘 예약/F/U/미내원/검진 미수검/최근 문서 등) |
| PATCH | `/api/v1/auth/me` | 사용자 프로필/클리닉 정보 서버 저장 |
| GET | `/api/v1/prescriptions` | 환자별 처방 목록 |
| POST | `/api/v1/prescriptions` | 처방 등록 |
| PATCH | `/api/v1/prescriptions/{id}` | 처방 수정 |
| DELETE | `/api/v1/prescriptions/{id}` | 처방 중단 |

---

## 상세 문서 안내

| 문서 | 경로 | 내용 |
|------|------|------|
| 아키텍처 | `docs/architecture.md` | 모듈 구조, 데이터 모델, 모듈 간 연동 |
| 개발 로드맵 | `docs/development-phases.md` | Phase 0~4 상세 계획 + 구현 상태 |
