# CLAUDE.md

> **aro** (아로새기다) — 충청북도 보건소/보건지소 전용 AI 어시스턴트
> 의사 1인 체제에서 진료 문서화, 약물 안전성 검토, 검진 추적, 환자 교육을 AI로 보조한다.

PRD: `docs/PRD.md` | 아키텍처: `docs/architecture.md` | 개발 로드맵: `docs/development-phases.md`

---

## 현재 진행 상태

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 0 — 프로젝트 기반 | ✅ 완료 | 2026-04-04 |
| Phase 1 — SOAP Writer | ✅ 완료 | 2026-04-06 |
| Phase 2 — Document Automation | ✅ 완료 | 2026-04-13 |
| Phase 3 — Polypharmacy Review | ✅ 완료 | 2026-04-14 |
| Phase 4 — Screening & F/U | 🔲 미착수 | — |

**Phase 3 완료 산출물**: DDI 체커 (15쌍 룰엔진), 신기능 용량 조절 (16약물), Sick Day Advanced (14군), PolypharmacyService 오케스트레이터, REST API, PolypharmacyReview 프론트엔드 (2패널 UI)

**다음 단계**: Phase 4 — Screening & F/U (검진 추적, 만성질환 관리)

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
uv run pytest tests/ -v                      # 테스트 전체 (185 tests)
uv run pytest tests/ -k "test_name"          # 특정 테스트
uv run ruff check . && uv run ruff format .  # lint + format

# Frontend
cd frontend
pnpm dev                           # 개발 서버 (port 5173)
pnpm build                         # 프로덕션 빌드 (tsc + vite)

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

---

## LLM 모델 선택

| 용도 | 모델 | 비용 참고 |
|------|------|----------|
| SOAP 변환, 문서 생성, 약물 해석 | Sonnet 4.6 | 월 ~$6 (캐싱 적용) |
| 리마인더 메시지 다듬기 | Haiku 4.5 | 최저 비용 |
| 복합 약물 판단 (예외적) | Opus 4.6 | 필요 시만 |
| 오프라인 fallback (SOAP only) | EXAONE 3.5 7.8B | 로컬 무료 |

월 API 예산: $15 이하 (₩22,000)

---

## 보안

- 환자 이름/연락처: AES-256-GCM 컬럼 암호화 (`EncryptedString` TypeDecorator)
- 진료기록 10년 보존 (의료법), DB 삭제 방지
- 감사 로그: 환자 정보 조회/수정 이력 전수 기록
- `.env` 파일 git commit 금지

---

## 현재 구현된 모듈 구조

```
backend/
├── api/
│   ├── v1.py              # 라우터 등록 (auth/patients/encounters/soap/documents/codebook/polypharmacy)
│   ├── patients.py        # CRUD + 암호화 검색
│   ├── encounters.py      # 진료 기록 CRUD + 임상 요약
│   ├── documents.py       # 문서 생성/저장/발급/다운로드 (8 endpoints)
│   ├── codebook.py        # 약어 코드북 관리
│   └── polypharmacy.py    # 약물검토 API (POST /polypharmacy/review)
├── core/
│   ├── models/            # SQLAlchemy ORM (User/Patient/Encounter/Prescription/Document...)
│   ├── schemas/           # Pydantic schemas (patient/encounter/document/codebook/auth/polypharmacy)
│   └── llm/               # LLMService + HallucinationGuard + SubjectiveFilter
├── modules/
│   ├── soap/              # SOAP 변환 (codebook/vitals/sick_day/prompts/parser/service)
│   ├── documents/         # 문서 자동화 (assembler/guards/normalizer/prompts/parser/renderer/service)
│   │   └── templates/     # Jinja2 HTML (진단서/소견서/확인서/의뢰서/건강진단서/base/default)
│   ├── polypharmacy/      # Phase 3 ✅
│   │   ├── data/          # ddi_pairs.json (15쌍) / renal_dosing.json (16약물) / sick_day_rules.json (14군)
│   │   ├── ddi_checker.py       # DDIChecker — 양방향 인덱싱, severity 정렬
│   │   ├── renal_dosing.py      # RenalDosingChecker — eGFR [min,max) 구간 매칭
│   │   ├── sick_day_advanced.py # SickDayAdvancedChecker — 임상 플래그 + 검사치 트리거
│   │   └── service.py           # PolypharmacyService — 3체커 오케스트레이션 + LLM 요약
│   └── screening/         # Phase 4 — 미착수
└── tests/                 # 185 tests (23개 파일)

frontend/src/
├── api/                   # axios 클라이언트 (auth/patients/soap/documents/clinical/polypharmacy)
├── components/
│   ├── soap/              # SOAP 관련 15개 컴포넌트
│   ├── documents/         # Document 관련 8개 컴포넌트
│   ├── polypharmacy/      # Phase 3 ✅ (DrugListPanel/DDIFindings/RenalDosingPanel/SickDayAlertsPanel)
│   ├── Layout/            # AppLayout/Header/Sidebar
│   └── ui/                # shadcn/ui 컴포넌트
├── hooks/                 # useAuth / useSoapStore / useDocumentStore / usePolypharmacyStore
├── pages/                 # Login / Dashboard / SOAPWriter / DocumentWriter / PolypharmacyReview
└── types/index.ts         # 전체 타입 정의 (Phase 1~3 포함)
```

---

## 핵심 API 엔드포인트 (현재)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/soap/convert` | 속기 → SOAP 변환 |
| POST | `/api/v1/encounters` | 진료 기록 저장 |
| GET | `/api/v1/patients/{id}/clinical-summary` | 임상 요약 |
| POST | `/api/v1/documents/generate` | 문서 생성 (4중 검증 파이프라인) |
| POST | `/api/v1/documents/{id}/issue` | 문서 발급 |
| GET | `/api/v1/documents/{id}/download` | DOCX/PDF 다운로드 |
| POST | `/api/v1/polypharmacy/review` | 약물검토 리포트 (DDI+신기능+SickDay+LLM 요약) |

---

## 상세 문서 안내

| 문서 | 경로 | 내용 |
|------|------|------|
| PRD v1.1 | `docs/PRD.md` | 전체 요구사항 |
| 아키텍처 | `docs/architecture.md` | 모듈 구조, 데이터 모델, 모듈 간 연동 |
| 개발 로드맵 | `docs/development-phases.md` | Phase 0~4 상세 계획 + 구현 상태 |
