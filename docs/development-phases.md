# aro 개발 로드맵

> 최종 업데이트: 2026-04-13

---

## 전체 진행 상태

| Phase | 기간 | 상태 | 완료일 |
|-------|------|------|--------|
| **Phase 0** — 프로젝트 기반 | Week 1~2 | ✅ 완료 | 2026-04-04 |
| **Phase 1** — SOAP Writer | Week 3~4 | ✅ 완료 | 2026-04-06 |
| **Phase 2** — Document Automation | Week 5~7 | ✅ 완료 | 2026-04-13 |
| **Phase 3** — Polypharmacy Review | Week 8~11 | 🔲 미착수 | — |
| **Phase 4-A** — 검진 추적 | Week 12~14 | 🔲 미착수 | — |
| **Phase 4-B** — 환자 관리 고도화 | Week 15~17 | 🔲 미착수 | — |

---

## Phase 0 — 프로젝트 기반 ✅

**목표**: DB 모델, FastAPI/React 초기화, LLMService, JWT 인증

**구현 완료 항목:**
- SQLAlchemy 2.0 async ORM + aiosqlite (8개 모델)
- AES-256-GCM 컬럼 암호화 (EncryptedString TypeDecorator)
- FastAPI 기본 구조 + CORS + lifespan
- JWT 인증 (access token, role-based)
- React 18 + Vite + Tailwind v4 + shadcn/ui 초기 설정
- AppLayout (Header + Sidebar + ProtectedRoute)
- LLMService Claude API 래퍼 (모델 선택, 캐싱)
- Alembic async 마이그레이션 설정

---

## Phase 1 — SOAP Writer ✅

**목표**: 속기 입력 → SOAP 변환 + 임상 대시보드

**구현 완료 항목 (Steps 0~9):**

| Step | 내용 | 테스트 |
|------|------|--------|
| Step 0 | Patient CRUD API (암호화 검색) | 8 tests |
| Step 1 | 약어 코드북 3-Layer (builtin/institution/personal) | 13 tests |
| Step 2 | SOAP 변환 엔진 (vitals 추출 → LLM → parsing) | 23 tests |
| Step 3 | Hallucination Guard + 주관적 표현 필터 | 12 tests |
| Step 4 | Sick Day 감지 (15 trigger keywords, 8 drug classes) | 9 tests |
| Step 5 | Encounter CRUD + `/soap/convert` API | 7 tests |
| Step 6 | Frontend SOAP 컴포넌트 15개 | — |
| Step 7 | zustand 상태 관리 + API 연동 | — |
| Step 8 | ClinicalDashboard (MetricCards, VitalTrends, Timeline) | — |
| Step 9 | Alembic 마이그레이션 + seed 데이터 | — |

**검증**: Backend 77 tests passing, Frontend 빌드 성공

**핵심 API 엔드포인트:**
- `POST /api/v1/soap/convert` — AI 미리보기 (저장 안 함)
- `POST /api/v1/encounters` — 의사 확인 후 저장
- `GET /api/v1/patients/{id}/clinical-summary` — 임상 요약

---

## Phase 2 — Document Automation ✅

**목표**: 진단서/의뢰서/소견서/확인서/건강진단서 자동 생성 + 4중 검증

**구현 완료 항목:**

| 구성요소 | 파일 | 설명 |
|----------|------|------|
| SourceDataAssembler | `modules/documents/assembler.py` | 진료 데이터 → JSON 구조화 |
| DocumentFactChecker | `modules/documents/guards.py` | 수치/진단/검사명 역검증 |
| MedicalTermNormalizer | `modules/documents/normalizer.py` | 한국어 의학용어 정규화 |
| DocumentPrompts | `modules/documents/prompts.py` | 캐시 가능한 시스템 프롬프트 |
| DocumentParser | `modules/documents/parser.py` | LLM JSON 응답 파싱 |
| DocumentService | `modules/documents/service.py` | 4중 파이프라인 오케스트레이터 |
| DocumentRenderer | `modules/documents/renderer.py` | DOCX(python-docx) + PDF(WeasyPrint+Jinja2) |
| Document API | `api/documents.py` | 8개 엔드포인트 |
| DocumentWriter | `frontend/src/pages/DocumentWriter.tsx` | 60/40 레이아웃 UI |

**4중 검증 파이프라인:**
1. Source Data Assembly — 환자/진료/처방/검진 → JSON 구조화
2. Constrained Generation — 입력에 없는 사실 생성 금지 (프롬프트 제약)
3. Fact-check Layer — 수치 일치(±0.1), KCD코드 검증, 주관적 표현 필터, 용어 정규화
4. Human-in-the-loop — 미해결 오류 시 발급 버튼 비활성화

**5종 문서 템플릿:** 진단서 / 소견서 / 확인서 / 의뢰서 / 건강진단서

**검증**: 78개 신규 테스트 (총 155개 통과), Frontend 빌드 성공

**비용**: Sonnet 캐싱 적용 시 월 ~$3.94 (일 5건 × 22일)

---

## Phase 3 — Polypharmacy Review 🔲

**목표**: DDI 검출, 신기능 용량 조절, Sick Day Rules 고도화

**예정 구현 디렉토리**: `backend/modules/polypharmacy/` (빈 패키지 생성됨)

**Step-by-step 구현 계획:**

### Step 1 — 약물 DB 모델 + 매핑 테이블
- `Drug` 모델: 상품명 → INN → ATC 코드 → DrugBank ID
- `DrugInteraction` 모델: drug_a / drug_b / severity (contraindicated/major/moderate/minor) / mechanism / clinic_note
- `RenalDosing` 모델: drug_id / egfr_threshold / recommendation / reference
- Alembic 마이그레이션 생성

### Step 2 — DDI 룰 DB 구축 (~500쌍)
- 소스: 심평원 DUR JSON + 식약처 e약은요 API + DrugBank Open Data
- 보건소 고빈도 처방 패턴 반영 (HTN/DM/DLD 조합 위주)
- `scripts/build_ddi_db.py` 스크립트로 자동 투입
- **Hallucination Guard**: DDI는 DB 조회 결과만 사용, LLM 추론 절대 금지

### Step 3 — 신기능 용량 조절 DB (3-Tier)
- Tier 1 (수작업, ~40종): PI+KDIGO 기반, eGFR <60/<30/<15 구간별 권고
  - 대상: metformin, SGLT2i, GLP1-RA, RAAS, NSAID, allopurinol 등
- Tier 2 (반자동, ~200종): DrugBank 데이터 + LLM 검토
- Tier 3: 미등록 약물 → LLM 플래그 + `[의사 확인 필요]` 표시

### Step 4 — PolypharmacyService 구현
```
modules/polypharmacy/
├── __init__.py
├── ddi_checker.py      # DDI 검출 룰 엔진 (DB 조회만)
├── renal_dosing.py     # eGFR 기반 용량 조절 제안
├── sick_day_advanced.py # Lab 연동 트리거 (AKI/고칼륨 등) 확장
└── service.py          # 오케스트레이터 → PolypharmacyReport 반환
```

### Step 5 — 약물검토 API
- `POST /api/v1/polypharmacy/review` — 처방 목록 + eGFR → 리포트
- `GET /api/v1/polypharmacy/interactions` — DDI DB 조회
- `GET /api/v1/polypharmacy/renal-dosing/{drug_id}` — 용량 조절 조회

### Step 6 — Frontend 약물검토 UI
- `pages/PolypharmacyReview.tsx` — 2-panel: 처방 목록 좌 / 리포트 우
- DDI 심각도별 색상 뱃지 (금기=red/주요=orange/중등도=yellow/경미=gray)
- eGFR 입력 → 실시간 용량 조절 안내

### Step 7 — SOAP 연동
- SOAP 변환 시 active_prescriptions → 자동 DDI 검토 사이드 패널
- Sick Day 감지 시 Lab 수치(AKI, K+) 연동 트리거

**외부 API:**
- 식약처 e약은요 API (공공데이터포털)
- 심평원 DUR 공공데이터

**예상 테스트**: +60개 (ddi_checker/renal_dosing/sick_day_advanced/service/api)

---

## Phase 4-A — 검진 추적 🔲

**목표**: 검사결과 안내서, 내원 리마인더, 알림톡 연동

**주요 작업:**
1. 검사결과 안내서 생성 (A4 1장, 어르신 눈높이)
   - 룰 기반 1차 해석 → LLM 2차 다듬기
   - 의학용어 한글 정식명칭 + 영문 병기
2. 내원 리마인더 3단계 (예약확인/전일 18시/당일 08시)
   - 모듈식 메시지 블록 (금식, 당뇨약 중단 등)
   - 타원 검사 자동 감지 (SOAP Plan 키워드)
3. 카카오 알림톡 연동 (우선) + SMS fallback
4. F/U 자동 감지 규칙
   - eGFR 3개월, HbA1c 3개월, U/A 즉시, AST/ALT 4주, LDL 6주, TSH 6주

---

## Phase 4-B — 환자 관리 고도화 🔲

**목표**: 교육 문서, 추적 대시보드, 월간 보고서

**주요 작업:**
1. 만성질환 교육 문서
   - 질환별 모듈 (HTN/DM/DLD/CKD/골다공증/갑상선)
   - 공통 모듈 (체중/식습관/운동/금연절주)
   - 질환 간 상충 권고 해소 (예: DM+CKD → 저당+저칼륨)
   - 템플릿 70% + LLM 개인화 30%
2. 추적 환자 대시보드
   - ① 오늘 요약 ② 예약 환자 ③ F/U 필요 ④ 미내원 환자
3. 월간 보고서 자동 생성
   - 등록 현황, 내원율, 조절률, 수검률, 추적완료율

---

## 향후 확장 (v2+)

1. 음성 입력 (STT): Whisper API
2. 약 이미지 OCR: 약봉투/낱알 → 약물 자동 식별
3. 만성질환 악화 예측: 시계열 ML
4. 방문건강관리 경로 최적화
5. 흉부 X-ray AI 연동 (Lunit/Vuno)
6. 감염병 감시: 일일 진료 데이터 패턴 감지
7. 다기관 연동: 여러 보건소 통합 대시보드
8. EMR 직접 연동: G-Health API / HL7 FHIR
