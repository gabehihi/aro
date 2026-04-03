# aro — 보건소 AI 어시스턴트 PRD v1.1

> **aro** (아로) : 순우리말 '아로새기다'에서 착안. 환자의 기록을 정성껏 새기고, 의사의 의사결정을 돕는 보건소 전용 AI 어시스턴트.

---

## 1. 프로젝트 개요

### 1.1 배경 및 문제 정의

충청북도 보건소/보건지소는 다음과 같은 구조적 문제를 안고 있다:

- **의사 1인 체제**: 공중보건의 1명이 진료·행정·보고·건강증진 업무를 동시에 수행
- **고령 만성질환 집중**: 환자의 60~70%가 고혈압·당뇨·이상지질혈증 등 만성질환자
- **다약제 복용(Polypharmacy)**: 고령 환자 평균 5~7개 약물 복용, 타원 처방과 중복·상호작용 위험 상존
- **수작업 문서화**: SOAP 노트, 진단서, 의뢰서 등 의료 문서를 수기 또는 반수기로 작성
- **검진 추적 누락**: 국가건강검진 이상 소견자의 추적관리를 간호사가 수작업으로 진행, 누락 빈번
- **환자 교육 부재**: 만성질환 관리 교육을 구두로만 전달, 어르신의 이해도·기억 유지 낮음
- **제한된 IT 인프라**: 공공보건의료정보시스템(G-Health) 중심, 외부 시스템 연동 제약

### 1.2 프로젝트 목표

**aro**는 보건소 의사 1인의 업무 부담을 줄이고 진료 품질을 높이는 AI 어시스턴트다.

**핵심 목표:**
1. 진료 문서화 시간을 환자 1인당 2~3분 → 30초 이하로 단축
2. 다약제 복용 환자의 약물 안전성을 체계적으로 검토 (DDI, Sick Day, 신기능 용량 조절)
3. 건강검진 이상 소견자의 추적관리 자동화로 누락률 최소화
4. 의료 문서(진단서, 의뢰서 등) 발급 시간을 10분 → 2분 이하로 단축
5. 환자에게 검사 결과 해석 + 만성질환 교육 문서를 맞춤 제공
6. 추적 환자 대시보드로 전체 환자 현황을 한눈에 파악

**비목표 (Non-goals):**
- EMR(G-Health) 자체를 대체하는 것이 아님 — 보조 시스템
- 진단 AI(영상 판독, 병리 분석 등)는 v1 범위에 포함하지 않음
- 환자 직접 대면 챗봇(예: 증상 자가진단)은 v1 범위 외

### 1.3 사용자 정의

| 사용자 | 역할 | 주요 사용 모듈 |
|--------|------|---------------|
| 공중보건의(의사) | 진료, 처방, 문서 발급, 최종 의사결정 | 전 모듈 |
| 간호사/간호조무사 | 환자 접수, 검진 관리, 방문건강관리 | 검진 추적, 문서 자동화 |
| 보건소장 | 현황 보고, 통계 확인 | 대시보드, 월간 보고서 |

---

## 2. 기술 Architecture

### 2.1 기술 스택

| Layer | Technology | 선택 근거 |
|-------|-----------|----------|
| Frontend | React 18+ / TypeScript / Tailwind CSS / Vite | 컴포넌트 재사용, 타입 안전성, 빠른 빌드 |
| Backend | Python 3.12+ / FastAPI | 의료 데이터 처리(pandas), Claude API 호출 최적 |
| Database | SQLite (v1) → PostgreSQL (확장 시) | 보건소 단일 PC 환경에서 무설치 시작 |
| ORM | SQLAlchemy 2.0 | async 지원, 마이그레이션(Alembic) |
| AI Engine | Claude API (Anthropic) | 아래 모델 선택 정책 참조 |
| Offline Fallback | EXAONE 3.5 7.8B (Ollama) | 네트워크 불안정 시 로컬 LLM fallback |
| Package Mgmt | pnpm (frontend) / uv (backend) | 속도, 디스크 효율 |
| Document Engine | python-docx + WeasyPrint | docx 생성 + PDF 변환 |
| Task Queue | APScheduler (v1) → Celery (확장 시) | 리마인더 등 스케줄링 |
| Messaging | 카카오 알림톡 API + SMS fallback | 환자 리마인더 발송 |

### 2.2 LLM 모델 선택 정책

**v1.1 추가: 모듈별 모델 선택 + 비용 최적화 + 오프라인 전략**

| 모듈 | Primary Model | 근거 | Fallback |
|------|--------------|------|----------|
| SOAP Writer | Sonnet 4.6 | 구조화 변환, 속도 중요 | EXAONE 3.5 7.8B (Ollama) |
| 문서 자동화 | Sonnet 4.6 | 문체 품질 중요, Haiku 부적합 | - (오프라인 시 문서 발급 불가) |
| 약물검토 | Sonnet 4.6 (기본) / Opus 4.6 (복합 판단) | 대부분 룰 기반, LLM은 해석만 | - |
| 검진 추적 메시지 | Haiku 4.5 | 단순 메시지 다듬기, 비용 절감 | - |
| 교육 문서 | Sonnet 4.6 | 환자 맞춤 개인화 | - |

**프롬프트 캐싱 필수 적용 항목:**
- 시스템 프롬프트 (~1,500~2,500 tokens) — 모듈마다 고정
- 의료 약어 코드북 (~2,000 tokens) — SOAP 모듈
- 문체 가이드 + Few-shot 예시 (~1,000 tokens) — 문서 모듈

**월 API 비용 예산: $15 이하 (약 ₩22,000)**
- SOAP (Sonnet, 캐싱): ~$5.94/월 (일 20건 × 22일)
- 문서자동화 (Sonnet, 캐싱): ~$3.94/월 (일 5건 × 22일)
- 기타 모듈: ~$3/월
- 합산: ~$13/월 (예산 내 여유)

**오프라인 전략 (하이브리드):**
보건소 네트워크 불안정 시, EXAONE 3.5 7.8B (LG AI Research 한국어 특화 모델)를 Ollama로 로컬 실행하여 SOAP 변환의 최소 품질을 유지한다. 온라인 복구 시 Cloud API로 재처리하는 큐잉 시스템을 구현한다.

### 2.3 시스템 구성도

```
┌──────────────────────────────────────────────────────────┐
│                    aro Web Application                    │
│                                                          │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  SOAP   │ │ 약물검토  │ │ 검진추적  │ │  문서자동화  │  │
│  │ Writer  │ │  Agent   │ │  Agent   │ │   Agent     │  │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘  │
│       │           │            │               │         │
│  ┌────┴───────────┴────────────┴───────────────┴──────┐  │
│  │              Core Layer (공통 기반)                  │  │
│  │  ┌──────────┐ ┌───────────┐ ┌───────────────────┐  │  │
│  │  │ LLM      │ │ External  │ │ Document Engine   │  │  │
│  │  │ Service  │ │ APIs      │ │ (docx/pdf)        │  │  │
│  │  └──────────┘ └───────────┘ └───────────────────┘  │  │
│  │  ┌──────────┐ ┌───────────┐ ┌───────────────────┐  │  │
│  │  │ Patient  │ │ Auth &    │ │ Scheduler         │  │  │
│  │  │ Model    │ │ Security  │ │ (APScheduler)     │  │  │
│  │  └──────────┘ └───────────┘ └───────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                               │
│  ┌───────────────────────┴────────────────────────────┐  │
│  │              Database (SQLite/PostgreSQL)           │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
          │                │                │
    ┌─────┴─────┐  ┌──────┴──────┐  ┌──────┴──────┐
    │ Claude API│  │ 식약처 API  │  │ 카카오      │
    │ (Anthropic)│ │ 심평원 API  │  │ 알림톡 API  │
    └───────────┘  └─────────────┘  └─────────────┘
```

### 2.4 디렉토리 구조

```
aro/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── PRD.md
│   ├── DATA_MODEL.md
│   └── API_SPEC.md
│
├── backend/
│   ├── pyproject.toml
│   ├── main.py
│   ├── config.py
│   │
│   ├── core/
│   │   ├── database.py
│   │   ├── security.py
│   │   ├── models/
│   │   │   ├── patient.py
│   │   │   ├── encounter.py
│   │   │   ├── prescription.py
│   │   │   ├── screening.py
│   │   │   ├── document.py
│   │   │   └── user.py
│   │   ├── llm/
│   │   │   ├── service.py
│   │   │   ├── guards.py            # Hallucination guard + 주관적 표현 필터
│   │   │   ├── terminology.py       # 의학 용어 정규화
│   │   │   └── prompts/
│   │   │       ├── soap.py
│   │   │       ├── drug_review.py
│   │   │       ├── screening.py
│   │   │       ├── document.py
│   │   │       └── education.py     # v1.1 추가
│   │   ├── external/
│   │   │   ├── druginfo.py
│   │   │   ├── dur.py
│   │   │   ├── kcd.py
│   │   │   ├── kakao.py
│   │   │   └── hospital.py
│   │   └── document/
│   │       ├── generator.py
│   │       ├── pdf_converter.py
│   │       ├── seal.py
│   │       └── templates/
│   │
│   ├── modules/
│   │   ├── soap/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   └── abbreviations.py
│   │   ├── polypharmacy/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   ├── ddi_engine.py
│   │   │   ├── dose_checker.py
│   │   │   ├── deprescribing.py
│   │   │   └── sick_day.py          # v1.1 추가
│   │   ├── screening/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   ├── classifier.py
│   │   │   ├── messenger.py
│   │   │   ├── scheduler.py
│   │   │   ├── lab_sheet.py         # v1.1 추가: 검사결과 안내서
│   │   │   ├── education.py         # v1.1 추가: 만성질환 교육문서
│   │   │   └── dashboard.py         # v1.1 추가: 추적 대시보드
│   │   └── documents/
│   │       ├── router.py
│   │       ├── service.py
│   │       ├── schemas.py
│   │       └── doc_types/
│   │
│   └── api/
│       └── v1.py
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout/
│       │   ├── PatientSearch/
│       │   ├── PatientCard/
│       │   ├── ClinicalDashboard/   # v1.1 추가
│       │   ├── RiskBadge/
│       │   └── ui/
│       ├── pages/
│       │   ├── Dashboard/           # v1.1: 추적 환자 대시보드
│       │   ├── SOAP/
│       │   ├── DrugReview/
│       │   ├── Screening/
│       │   └── Documents/
│       ├── hooks/
│       ├── api/
│       └── types/
│
└── data/
    ├── kcd_codes.json
    ├── drug_interactions.json
    ├── renal_dose_adjustments.json   # v1.1 추가
    ├── sick_day_rules.json           # v1.1 추가
    ├── stopp_start_v3.json
    ├── beers_2023.json
    ├── screening_rules.json
    ├── medical_abbreviations.json
    ├── banned_expressions.json       # v1.1 추가
    ├── terminology_map.json          # v1.1 추가
    └── education_modules/            # v1.1 추가
        ├── hypertension.json
        ├── diabetes.json
        ├── dyslipidemia.json
        ├── ckd.json
        └── common_lifestyle.json
```

---

## 3. 핵심 데이터 모델

### 3.1 Patient (환자)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | 시스템 내부 식별자 |
| chart_no | String | 차트 번호 (보건소 EMR 연동용) |
| name | String (encrypted) | 환자 이름 |
| birth_date | Date | 생년월일 |
| sex | Enum(M/F) | 성별 |
| phone | String (encrypted) | 연락처 (알림톡 발송용) |
| address | String | 주소 |
| insurance_type | Enum | 건강보험 / 의료급여 1종 / 의료급여 2종 |
| chronic_diseases | JSON Array | 등록 만성질환 목록 (KCD 코드) |
| allergies | JSON Array | 알러지 정보 |
| memo | Text | 의사 메모 |
| messaging_consent | Boolean | 알림톡/문자 수신 동의 여부 |
| messaging_method | Enum | kakao / sms / both | 
| created_at | DateTime | 등록일 |
| updated_at | DateTime | 최종 수정일 |

### 3.2 Encounter (진료 기록 — SOAP)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| patient_id | UUID (FK → Patient) | |
| encounter_date | DateTime | 진료 일시 |
| raw_input | Text | 의사 원본 입력 (속기/음성 텍스트) |
| subjective | Text | S — 주관적 소견 |
| objective | Text | O — 객관적 소견 |
| assessment | Text | A — 평가 |
| plan | Text | P — 계획 |
| kcd_codes | JSON Array | 진단 코드 목록 |
| vitals | JSON | 활력징후 |
| labs | JSON Array | 검사 결과 |
| health_promotion | JSON | 건강증진 상담 내용 |
| referral_flag | Boolean | 전원 필요 여부 |
| external_referral_note | Text | 타원 검사/의뢰 관련 메모 |
| next_visit_date | Date | 다음 방문 예정일 |
| next_visit_tests | JSON Array | 다음 방문 시 예정 검사 |
| next_visit_fasting | Boolean | 금식 필요 여부 |
| visit_type | Enum | 초진 / 재진 / 건강상담 |
| created_by | UUID (FK → User) | 작성 의사 |

### 3.3 Prescription (처방)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| patient_id | UUID (FK) | |
| encounter_id | UUID (FK) | |
| drug_name | String | 약품명 (상품명) |
| drug_code | String | 약품 코드 |
| ingredient_inn | String | 성분명 (INN) |
| atc_code | String | ATC 코드 |
| drugbank_id | String | DrugBank ID (DDI 매핑용) |
| dose | String | 1회 투여량 |
| frequency | String | 투여 빈도 |
| duration_days | Integer | 처방 일수 |
| route | Enum | 경구 / 주사 / 외용 / 흡입 |
| is_active | Boolean | 현재 복용 중 여부 |
| prescribed_by | Enum | 보건소 / 타원 |
| source_hospital | String | 타원 처방 시 병원명 |
| start_date | Date | 처방 시작일 |
| end_date | Date | 처방 종료일 |

### 3.4 ScreeningResult (검진 결과)

v1.0과 동일 — 생략.

### 3.5 MedicalDocument (발급 문서)

v1.0과 동일 — 생략.

### 3.6 User (시스템 사용자)

v1.0과 동일 — 생략.

### 3.7 VisitSchedule (내원 예약 — v1.1 신규)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| patient_id | UUID (FK) | |
| scheduled_date | Date | 예약일 |
| planned_tests | JSON Array | 예정 검사 목록 |
| needs_fasting | Boolean | 금식 필요 여부 |
| special_instructions | JSON Array | 특별 안내 (약물 중단, 지참물 등) |
| reminder_status | JSON | 알림 발송 이력 |
| visit_completed | Boolean | 내원 완료 여부 |
| created_from | UUID (FK → Encounter) | 생성 근거 진료 기록 |

### 3.8 FollowUpAlert (추적 알림 — v1.1 신규)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| patient_id | UUID (FK) | |
| alert_type | Enum | lab_recheck / screening_fu / no_show / education |
| item | String | 추적 대상 (eGFR, HbA1c, U/A protein 등) |
| last_value | String | 마지막 측정값 |
| last_date | Date | 마지막 측정일 |
| due_date | Date | 재검 기한 |
| days_overdue | Integer | 기한 초과 일수 |
| priority | Enum | 🔴 urgent / 🟡 due / 🟢 upcoming |
| resolved | Boolean | 해결 여부 |
| resolved_date | Date | 해결일 |

---

## 4. Module 1 — SOAP Writer

### 4.1 기능 요구사항

**F1-1. 텍스트 속기 입력 → SOAP 변환** — Claude Sonnet 4.6 기반. 의사가 약어·속기로 입력한 텍스트를 구조화된 SOAP으로 변환.

**F1-2. 의료 약어 코드북 (3-Layer 구조)**
- **Layer 1 (Built-in)**: 한국 의료계 공통 약어 (~200개). HTN, DM, aCCB, ARB 등.
- **Layer 2 (Institution)**: 경희대병원 내과 관례 약어. 사용자가 초기 세팅 시 입력.
- **Layer 3 (Personal)**: 또비 개인 약어 (백령도 코드북 174개 기반). met1000, sita_h 등.
- **약어 학습 모드**: SOAP 변환 시 LLM이 인식 못한 약어를 [미인식: XXX]로 표시 → 의사가 정의 입력 → 코드북 자동 추가.

```json
{
  "abbreviations": {
    "diagnosis": {
      "HTN": {"full": "Hypertension", "kcd": "I10", "korean": "고혈압", "layer": "built-in"},
      "DCMP": {"full": "Dilated Cardiomyopathy", "kcd": "I42.0", "layer": "kyunghee"}
    },
    "medication": {
      "aCCB": {"full": "Amlodipine-type CCB", "layer": "built-in"},
      "met1000": {"full": "Metformin 1000mg/day", "rule": "met+숫자=총일일용량(mg)", "layer": "personal"},
      "sita_h": {"full": "Sitagliptin 50mg (half dose)", "rule": "_h=half dose", "layer": "personal"}
    }
  }
}
```

**F1-3. KCD 코드 자동 제안** — Assessment에서 진단명 추출 → KCD-8 코드 후보 제시.

**F1-4. 활력징후 구조화** — BP, HR, BT, RR, SpO2, BMI 자동 추출.

**F1-5. 건강증진 상담 태깅** — 금연/절주/운동/식이 자동 태깅.

**F1-6. 환자 임상 대시보드 (v1.1 강화)**

환자 선택 시 즉시 표시되는 임상 데이터 대시보드:

- **환자 요약 카드**: 기본정보 + 만성질환 뱃지 + 복용약 수 + 최근 방문일
- **메트릭 카드 4개**: BP(최근), HbA1c, eGFR, BMI — 이전 대비 변화량(delta) 색상 표시
- **F/U Required 섹션**: 이전 검사에서 추적 필요 항목 자동 감지

| 조건 | 플래그 | 추천 조치 |
|------|--------|----------|
| eGFR <60 + 하락 추세 | 🔴 | Cr/eGFR 재검 |
| 소변 단백 2회 연속 양성 | 🔴 | ACR 정량 |
| AST/ALT 정상 상한 2배 이상 + 이전 정상 | 🟡 | 간기능 재검 4주 |
| Hb <12(남) 또는 <11(여) + 이전 정상 | 🟡 | 철분/페리틴/TIBC |
| UA occult blood 양성 2회 | 🟡 | 요세포검사/비뇨의학과 |
| FBS >126 2회 or HbA1c >6.5 | 🔴 | DM 확진 평가 |
| LDL >100 (DM 환자) | 🟡 | 스타틴 용량 조정 검토 |

- **바이탈 트렌드 차트**: 최근 6회 방문 SBP/DBP/HR 추세
- **Lab 트렌드 차트**: 이축(dual-axis) eGFR + HbA1c 추세
- **검사 결과 테이블**: 정상 범위 이탈 값 색상 강조
- **과거 진료 이력 타임라인**: 최근 SOAP 기록 목록

**F1-7. 진료 이력 조회** — 과거 SOAP 기록 타임라인 + 최근 N건 요약.

**F1-8. 음성 입력 (v2)** — Whisper API 기반 STT. v1에서는 아키텍처만 확장 가능하도록 설계.

### 4.2 System Prompt 설계

```
역할: 한국 보건소 내과 진료 SOAP 기록 전문 AI 어시스턴트

입력 처리 규칙:
  - 3-Layer 의료 약어 코드북을 참조하여 약어를 정식 명칭으로 확장
  - 입력에 명시되지 않은 소견은 절대 추론하지 않음 (hallucination 금지)
  - 불확실한 항목은 [확인필요]로 표시
  - 미인식 약어는 [미인식: XXX]로 표시

출력 구조:
  S: 주소, 현병력, 과거력 요약
  O: 활력징후, 이학적 소견, 검사 결과
  A: 진단명 + KCD 코드 (최대 8개)
  P: 처방, 검사 계획, 환자 교육, 다음 방문 일정

보건소 특화:
  - 건강증진 상담 내용(금연/절주/운동/식이)은 P 하위에 별도 태깅
  - 방문건강관리 연계 필요 시 [방문관리필요] 플래그 추가
  - 전원 필요 시 [전원필요: 진료과] 플래그 추가
```

### 4.3 크로스모듈 연동 — Sick Day Alert

SOAP 입력 시, 약물검토 모듈의 Sick Day 감지 엔진이 자동 호출된다. "폐렴", "탈수", "Cr 급상승" 등의 키워드가 감지되면, 현재 처방 중인 약물에 대한 중단/감량 권고를 SOAP 작성 화면 상단에 빨간 배너로 표시한다. (상세: 섹션 5.3 참조)

---

## 5. Module 2 — Polypharmacy Review Agent (약물검토)

### 5.1 기능 요구사항

**F2-1. 복용약 목록 입력** — 수동 입력/처방 DB 자동 로딩/타원 처방 추가

**F2-2. 약물 상호작용(DDI) 검출** — 심각도 분류: Contraindicated / Major / Moderate / Minor

**F2-3. 중복 처방 검출** — 동일 성분, 동일 계열, 치료적 중복

**F2-4. 신기능 기반 용량 적절성 검토 (v1.1 강화)**

**F2-5. Deprescribing 제안** — STOPP/START v3 + Beers 2023

**F2-6. 검토 리포트 생성** — 위험도별 색상 코딩, PDF 출력

### 5.2 신기능 기반 용량 조절 DB (v1.1 신규)

**3-Tier 구조:**

| Tier | 범위 | 구축 방법 | 커버리지 |
|------|------|----------|---------|
| Tier 1: Core | 보건소 고빈도 약물 30~50종 | 수작업 (PI + KDIGO + 대한신장학회) | 환자의 80~90% |
| Tier 2: Extended | 신배설 비율 높은 약물 100~200종 | DrugBank + LLM 보조 추출 + 사람 검수 | 95%+ |
| Tier 3: Fallback | DB 미등록 약물 | LLM이 "미등록" 플래깅 + PI 확인 권고 | 100% |

**Tier 1 데이터 구조:**

```json
{
  "drug_id": "metformin",
  "generic_name": "Metformin",
  "generic_name_kr": "메트포르민",
  "atc_code": "A10BA02",
  "renal_excretion_pct": 90,
  "dose_adjustments": [
    {"egfr_range": [60, null], "recommendation": "FULL_DOSE", "max_daily_dose": "2550mg"},
    {"egfr_range": [45, 59], "recommendation": "REDUCE", "max_daily_dose": "1500mg"},
    {"egfr_range": [30, 44], "recommendation": "REDUCE", "max_daily_dose": "1000mg"},
    {"egfr_range": [null, 29], "recommendation": "CONTRAINDICATED", "max_daily_dose": null}
  ],
  "monitoring": ["Cr/eGFR 3~6개월", "Vitamin B12 연 1회"],
  "sources": [{"ref": "KDIGO DM guideline 2024", "section": "5.2"}]
}
```

**Tier 1 우선 구축 대상 (~40종):** Metformin, Sitagliptin, Linagliptin, Empagliflozin, Dapagliflozin, Allopurinol, Febuxostat, Rivaroxaban, Apixaban, Edoxaban, Warfarin, Gabapentin, Pregabalin, Digoxin, Spironolactone, Ciprofloxacin, Levofloxacin, Famotidine 등.

### 5.3 Sick Day Rules — 급성 상황 약물 안전 알림 (v1.1 신규)

급성 질환(중증 감염, AKI, 탈수, 심부전 악화 등) 시 기존 만성질환 약물 중 일시 중단/감량해야 하는 약물을 자동 감지하여 알린다.

**대상 약물 + 트리거 + 조치:**

| 약물 | 조치 | 트리거 | 사유 |
|------|------|--------|------|
| Metformin | Hold | AKI, 탈수, 중증 감염, 조영제, 수술 전 | 유산산증 위험 |
| SGLT2i | Hold | AKI, 탈수, 중증 감염, 수술 전, 경구 섭취 불량 | DKA + AKI 위험 |
| ACEi/ARB | Hold | AKI, 탈수, 고칼륨혈증, 저혈압 | 사구체 여과압 저하 → AKI 악화 |
| 이뇨제 | Hold | AKI, 탈수, 저혈압, 전해질 이상 | 탈수 악화 |
| Spironolactone | Hold | AKI, 고칼륨혈증, K ≥5.5 | 고칼륨혈증 위험 |
| NSAIDs | Hold | AKI, 탈수, 심부전, CKD G3+ | 신혈류 감소 → AKI |
| DOACs | Reduce | AKI, Cr 급상승 | 혈중 농도 상승 → 출혈 |
| Digoxin | Reduce | AKI, 탈수, 저칼륨혈증 | 독성 위험 |
| SU | Monitor | 경구 섭취 불량, AKI | 저혈당 위험 |

**감지 엔진:** SOAP 입력 시 키워드("폐렴", "탈수", "Cr 상승" 등) + Lab 수치(Cr 기저 대비 1.5배 이상) → 현재 처방과 Sick Day Rules DB 대조 → 해당 약물 경고 표시.

### 5.4 DDI 데이터베이스 구축 전략 (v1.1 신규)

**3개 소스 결합 파이프라인:**

1. **Source A — 심평원 DUR 공공데이터**: 병용금기 항목 (data.go.kr 무료)
2. **Source B — 식약처 e약은요 API**: 개별 약품 상호작용 텍스트 → LLM 보조 구조화 추출
3. **Source C — DrugBank Open**: ~1.4M DDI pairs (학술 라이선스 무료)

**파이프라인:**
```
Source A,B,C → Step 1: 성분 정규화 (상품명→INN→ATC→DrugBank ID)
            → Step 2: DDI pair 추출 (성분 쌍 + 심각도 + 기전 + 관리법)
            → Step 3: 보건소 고빈도 약물 기준 필터링 (1차 ~500쌍)
            → Step 4: 의사 검수 (심각도 재분류 + 보건소 맥락 관리 지침 추가)
            → aro DDI Database (JSON)
```

**DDI 데이터 구조:**
```json
{
  "ddi_id": "DDI_0001",
  "drug_a": {"inn": "Metformin", "atc": "A10BA02", "drugbank": "DB00331"},
  "drug_b": {"inn": "Iodinated contrast", "atc": "V08A"},
  "severity": "MAJOR",
  "mechanism": "조영제 유발 신손상 시 Metformin 축적 → 유산산증",
  "management": {
    "action": "HOLD_BEFORE",
    "detail": "조영제 48시간 전 중단, 48시간 후 Cr 확인 후 재개"
  },
  "sources": ["ACR Manual on Contrast Media 2024"],
  "clinic_note": "보건소에서 CT 의뢰 시 반드시 Metformin 복용 여부 확인"
}
```

**임상적으로 중요한 보건소 DDI 우선 구축 대상:** Warfarin+NSAIDs, ACEi/ARB+K-sparing, ACEi/ARB+NSAIDs+이뇨제 (Triple Whammy), Statin+Macrolide, Clopidogrel+Omeprazole, Levothyroxine+Ca/Fe/PPI 등.

### 5.5 Hallucination Guard (약물검토 특화)

1. **Rule-based first**: DDI, 중복, 용량은 룰 기반 처리. LLM은 해석 레이어로만 사용
2. **출처 강제**: LLM 응답에 근거(STOPP #XX, Beers p.XX) 태깅 필수
3. **Negative validation**: LLM이 "문제없음"이라 해도 룰 엔진 플래깅 유지
4. **의사 최종 확인**: 모든 제안은 권고(recommendation)

---

## 6. Module 3 — Document Automation Agent (문서 자동화)

### 6.1 지원 문서 유형

| 문서 유형 | 발급 빈도 | 자동화 수준 |
|-----------|----------|-----------|
| 진단서 | 높음 | 80% (소견란 LLM 초안) |
| 소견서 | 중간 | 70% (상세 소견 LLM 초안) |
| 진료확인서 | 높음 | 95% (사실 기반, 단순) |
| 진료의뢰서 | 높음 | 85% (에이전틱: 병원 검색 포함) |
| 건강진단서 (채용용) | 높음 | 90% (검진 결과 자동 매핑) |
| 검사 결과 안내서 | 높음 | 90% (v1.1 추가) |
| 만성질환 교육 문서 | 중간 | 85% (v1.1 추가) |

### 6.2 Grounded Generation — 4중 검증 파이프라인

의료 공식 문서는 법적 효력이 있으므로 4단계 방어 체계를 적용한다.

**Layer 1 — Source Data Assembly:** 진료 데이터를 구조화된 JSON으로 정리하여 LLM에 전달. LLM이 참조할 수 있는 사실의 범위를 제한.

**Layer 2 — Constrained Generation:** 시스템 프롬프트에 명시적 제약:
```
[절대 금지] source_data JSON에 없는 검사/소견/진단 생성 금지
[절대 금지] 수치 변조 금지 — 원본 값 그대로 사용
[절대 금지] 시행하지 않은 검사 결과 기술 금지
[불확실 처리] 소견 작성 어려운 경우 → [의사 확인 필요: ___] 플레이스홀더
```

**Layer 3 — Fact-check Layer (Code-based):**
- 수치 검증: 문서 내 모든 숫자를 source_data와 대조
- 진단 검증: 등록되지 않은 진단명 감지
- 검사명 검증: 시행 기록 없는 검사(CT, MRI 등) 언급 감지
- 주관적 표현 필터: 금지 표현 스캔 (아래 6.3 참조)
- 용어 정규화: 의학 용어를 KCD 기준 정식 명칭으로 통일

**Layer 4 — Human-in-the-loop:** 경고 하이라이트 + 편집 가능 + 승인 필수. 경고 미해결 시 "발급" 버튼 비활성화.

### 6.3 주관적 표현 배제 규칙 (v1.1 신규)

**핵심 원칙: "수치는 사실로, 판단은 의사가"**

AI는 객관적 사실의 기술만 담당하고, 그 사실에 대한 임상적 판단은 의사만 한다.

**금지 표현 3유형:**

| 유형 | 금지 표현 예시 |
|------|-------------|
| 가치 판단형 | 양호한 수준, 괜찮은 상태, 심각한 수준, 우려되는 상황, 위험한 상태, 다행히 |
| 정도 판단형 | 비교적 안정적, 상당히 호전, 다소 높은, 약간의 이상, 크게 문제 없는, 대체로 양호 |
| 추측/감정형 | ~인 것 같습니다, ~일 가능성이 높습니다, ~로 보입니다, 우려스럽게도, 긍정적으로, 불행히도 |

**허용되는 객관적 표현:**
- 수치 + 측정일: "HbA1c 7.2% (2026-03-15 측정)"
- 이전 대비 변화량: "이전 검사 HbA1c 7.5% 대비 0.3%p 감소"
- 가이드라인 분류: "KDIGO 기준 CKD stage G3a에 해당"
- 정상 범위 대비: "정상 상한(40 IU/L)의 약 2배 수준"

**변환 예시:**
| Before (금지) | After (허용) |
|--------------|-------------|
| 당화혈색소 7.2%로 **양호한 수준** | 당화혈색소 7.2% (2026년 3월 15일 측정)로 확인되었으며 |
| 혈압은 148/92로 **다소 높은 편**이나 **크게 문제 없는** 수준 | 혈압 148/92 mmHg (2026년 3월 15일 측정)로 확인되었습니다 |
| eGFR 52로 **우려되는 수준의** 신기능 저하가 **관찰** | eGFR 52 mL/min/1.73m² (CKD stage G3a에 해당)으로 확인 |
| **다행히** 이전 대비 **상당히 호전된** 양상 | 이전 검사(2025-12) HbA1c 7.5% 대비 7.2%로 0.3%p 감소 |

**의사 판단 플레이스홀더:** LLM이 임상 판단이 필요한 부분은 `[의사 소견: 현재 질환 상태에 대한 판단을 입력해 주세요]`로 빈칸을 남긴다.

**코드 기반 후처리 필터:** LLM 출력 후 정규식 기반으로 금지 표현 자동 스캔. 감지 시 주황색 하이라이트 + "주관적 표현 감지 — 수정 권장" 안내. 자동 삭제하지 않음 (의사 의도적 사용 가능성).

### 6.4 문체 가이드 + 의학 용어 정규화

**문서 유형별 용어 수준:**

| 문서 유형 | 용어 수준 | 예시 |
|-----------|----------|------|
| 진단서 | 정식 한국어 + KCD 코드 | "본태성 고혈압(I10)" |
| 소견서 | 정식 한국어, 상세 기술 | "추정 사구체여과율 52 mL/min/1.73m²" |
| 진료의뢰서 | 의학 영어 혼용 가능 | "eGFR 52로 CKD G3a stage" |
| 건강진단서 | 일반인 대상 한국어 | "신장 기능 수치: 경도 저하" |
| 검사결과 안내서 | 어르신 대상 쉬운 한국어 | "콩팥이 걸러내는 기능이 좀 떨어져 있습니다" |

**의학 용어 정규화 사전 (MedicalTermNormalizer):** LLM 출력 후 후처리로 적용. "고혈압"→"본태성 고혈압", "당뇨"→"제2형 당뇨병", "고지혈증"→"이상지질혈증", "eGFR"→"추정 사구체여과율" 등.

---

## 7. Module 4 — Screening & Follow-up Agent (검진 추적 + 환자 관리)

### 7.1 기능 요구사항 (v1.1 전면 재구성)

**F4-1. 검진 결과 일괄 업로드** — 엑셀/CSV → 자동 파싱 + DB 저장

**F4-2. 이상 소견 자동 분류** — 룰 기반 3단계 (🔴 긴급 / 🟡 주의 / 🟢 정상)

**F4-3. 검사 결과 안내서 자동 생성 (v1.1 신규)**

**F4-4. 내원 리마인더 자동 발송 (v1.1 신규)**

**F4-5. 만성질환 교육 문서 자동 생성 (v1.1 신규)**

**F4-6. 추적 환자 대시보드 (v1.1 신규)**

**F4-7. 월간 보고서 자동 생성 (v1.1 신규)**

### 7.2 검사 결과 안내서 (v1.1 신규)

환자(주로 어르신)에게 검사 결과를 A4 1장으로 설명해주는 서류.

**구성:**
- 상단: 환자 기본정보 (성함, 나이, 검사일, 담당의)
- 중단: 검사 항목별 결과 + 쉬운 해석 (항목당 3줄 구조)
- 하단: 다음 내원 안내 박스 (방문일, 금식 여부, 추가 검사, 약물 안내)

**언어 원칙:**
1. 의학용어는 한글 정식 명칭 + 영문 병기: "사구체여과율(eGFR)"
2. 해석은 "이것은 무엇을 보는 검사입니다" + "결과가 어떻습니다" 구조
3. 의학적 판단("양호합니다")은 쓰지 않음 — "정상보다 높습니다", "지난번보다 낮아졌습니다"
4. 비유는 신체 기능 설명에만 사용: "콩팥이 1분에 걸러내는 피의 양"
5. 글씨 크기 14pt 이상, A4 1장 이내

**각 검사 항목 표시 형식:**
```
공복혈당 (Fasting Blood Sugar)
  결과: 138 mg/dL          정상: 100 미만      ⚠ 높음
  → 공복 상태에서 잰 혈당입니다.
    정상보다 높습니다. 식사 조절과 운동이 필요합니다.
```

**생성 파이프라인:** 1차 해석은 룰 기반 (정상 범위 비교 + 이전 값 대비 delta), 2차 다듬기만 LLM (쉬운 말로 번역). Hallucination 위험 최소화.

### 7.3 내원 리마인더 자동 발송 (v1.1 신규)

**3단계 타이밍:**

| 타이밍 | 내용 | 발송 시점 |
|--------|------|----------|
| 예약 확인 | 다음 내원일 안내 + 검사 종류 | 예약 설정 시 즉시 |
| 전일 리마인드 | 금식/약물 중단/준비물 상세 안내 | 내원 전일 오후 6시 |
| 당일 리마인드 | 간단 안내 + 보건소 전화번호 | 당일 오전 8시 |

**메시지 모듈식 조립 시스템:** 환자 상태에 따라 필요한 블록을 자동 조합.

| 블록 | 조건 | 내용 |
|------|------|------|
| 금식 안내 | planned_tests에 FBS/Lipid/LFT 포함 | "전날 저녁 9시 이후 물 이외 금식" |
| 당뇨약 중단 | 금식 필요 + DM 약물 처방 중 | "당뇨약은 검사 당일 아침에 드시지 마세요" |
| 갑상선약 중단 | planned_tests에 TFT 포함 | "갑상선 약을 복용하지 않고 내원하세요" |
| 혈압약 복용 안내 | 금식 필요 + HTN 약물 처방 중 | "혈압약은 적은 양의 물과 함께 드시고 오세요" |
| 타원 결과지 지참 | SOAP에 타원 검사/의뢰 기록 있음 | "타병원 검사 결과지 가져와 주세요" |
| 소변검사 안내 | planned_tests에 UA 포함 | "소변을 참고 오시면 검사가 수월합니다" |

**타원 검사 자동 감지:** 최근 3건의 SOAP Plan에서 "타병원", "상급병원", "전원", "의뢰", "OO병원 예약" 등 키워드를 검색하여 자동으로 "결과지 지참" 블록 추가.

**발송 채널:** 카카오 알림톡 우선 → 미설치/실패 시 LMS 문자 fallback. 월 비용 약 3,500원.

### 7.4 만성질환 교육 문서 자동 생성 (v1.1 신규)

**교육 모듈 체계:**

```
교육 문서
├── 질환별: 고혈압, 당뇨병, 이상지질혈증, CKD, 골다공증, 갑상선
├── 공통: 체중관리(BMI별), 식습관, 운동 방법, 금연/절주
└── 환자 맞춤 통합 문서 ← 핵심: 질환 조합에 따라 자동 조립
```

**질환 간 상충 권고 해소 (Conflict Resolution):**

| 질환 조합 | 주제 | 상충 | 해소 |
|-----------|------|------|------|
| HTN + CKD | 단백질 섭취 | HTN 제한 없음, CKD 제한 필요 | CKD 기준 적용 (kg당 0.6~0.8g/일) |
| DM + CKD | 과일 섭취 | DM 저당 권장, CKD 저칼륨 권장 | 저당+저칼륨 과일 목록 제공 |
| HTN + DM | 운동 | 상충 없음 | 유산소 주 150분 + 저항 운동 주 2~3회 |

**교육 문서 언어:** 어르신 대상 쉬운 한국어, A4 2장 이내, 큰 글씨(14pt). 항목별 ✓ 체크리스트 형식. 약물 주의사항 포함 ("진통제를 함부로 드시지 마세요 — 콩팥에 해로울 수 있습니다").

**생성 방식:** 템플릿 기반(70%) + LLM 개인화(30%). 기본 식사/운동/약물 구조는 가이드라인 기반 고정 템플릿, 환자 특이적 약물/수치 반영만 LLM.

### 7.5 추적 환자 대시보드 (v1.1 신규)

의사가 출근해서 첫 화면으로 보는 대시보드. 4개 섹션 구성.

**섹션 1 — 오늘의 요약 (메트릭 카드 4개):**
오늘 예약 수 | F/U 필요 수 | 미내원(지난주) 수 | 검진 미수검 수

**섹션 2 — 오늘 예약 환자 목록:**
시간순 배치. 환자명, 질환, 예정 검사, 금식 여부, 알림 발송 상태. 알림톡 미확인 환자 강조.

**섹션 3 — F/U 필요 환자 (자동 감지):**

| 검사 항목 | 조건 | F/U 주기 | 감지 로직 |
|-----------|------|---------|----------|
| eGFR <60 | 하락 추세 | 3개월 | 마지막 검사일 + 90일 경과 |
| HbA1c >7% | 목표 미달 | 3개월 | 마지막 검사일 + 90일 경과 |
| U/A protein 양성 | 반복 | 즉시 | ACR 정량 미시행 |
| AST/ALT 상승 | 신규 이상 | 4주 | 마지막 검사일 + 28일 경과 |
| LDL >100 (DM) | 스타틴 시작 후 | 6주 | 처방 시작일 + 42일 경과 |
| TSH 이상 | 용량 조절 후 | 6주 | 용량 변경일 + 42일 경과 |

🔴 urgent: 기한 초과 / 🟡 due: 이번 주 기한 / 🟢 upcoming: 2주 내 도래

**섹션 4 — 미내원 환자:**
예약 후 미내원 환자를 경과 일수순 표시. 7일→재연락, 14일→재연락, 21일+→방문건강관리 편입. [연락하기] [방문관리] 버튼.

### 7.6 월간 보고서 자동 생성 (v1.1 신규)

매월 1일 자동 실행. 보건소장 보고용 PDF.

포함 항목:
1. 등록 환자 현황 (신규, 전출)
2. 내원율 (내원 수 / 등록 수)
3. 혈압 조절률 (BP <140/90 비율)
4. 당화혈색소 조절률 (HbA1c <7.0% 비율)
5. 건강검진 수검률
6. 검진 이상소견 추적완료율
7. 미내원 환자 현황 (리마인더 발송, 방문관리 연계)

---

## 8. 공통 Core Layer

### 8.1 LLMService

```python
class LLMService:
    """
    전 모듈 공통 Claude API 래퍼

    핵심 원칙:
    1. 모듈별 모델 자동 선택 (complexity routing)
       - SOAP/문서/약물: Sonnet 4.6
       - 메시지 다듬기: Haiku 4.5
       - 복합 약물 판단: Opus 4.6
    2. 프롬프트 캐싱 필수 (시스템 프롬프트 + 코드북)
    3. Hallucination guard 내장 (모듈별 가드 레벨)
       - SOAP: 입력에 없는 소견 생성 금지
       - 문서: 4중 검증 (Grounded Generation)
       - 약물: DB 조회 결과만 사용
    4. 주관적 표현 필터 (문서 모듈 전용)
    5. 비용 추적 (모듈별, 일별 token 로깅)
    6. 오프라인 fallback (EXAONE 3.5 via Ollama)
    """
```

### 8.2 외부 API 연동

| API | 용도 | 사용 모듈 |
|-----|------|----------|
| 식약처 e약은요 | 약품 정보 + DDI 텍스트 | 약물검토, SOAP |
| 식약처 DUR | 병용금기 | 약물검토 |
| 심평원 병의원 | 병원 검색 | 문서자동화 (의뢰서) |
| 카카오 알림톡 | 환자 알림 발송 | 검진추적 |
| KCD-8 코드 | 진단 코드 검색 | SOAP, 문서자동화 |

### 8.3 보안 요구사항

| 항목 | 요구사항 | 구현 방안 |
|------|---------|----------|
| 환자 개인정보 암호화 | 이름, 연락처, 주민번호 | AES-256 (SQLAlchemy 컬럼 레벨) |
| 접근 제어 | 역할 기반 (의사/간호사/관리자) | JWT + role-based permission |
| 감사 로그 | 환자 정보 조회/수정 이력 | audit_log 테이블 |
| API 키 관리 | 외부 API 키 보호 | 환경변수 (.env) |
| 데이터 백업 | 일일 자동 백업 | SQLite 일별 복사본 |
| 의료법 준수 | 진료기록 10년 보존 | DB 삭제 방지 + 보존 정책 |
| 알림 수신 동의 | 환자 수신 동의 관리 | 최초 동의 절차 + opt-out |

---

## 9. 개발 로드맵

### Phase 0: 프로젝트 기반 (Week 1~2)

| Task | 산출물 |
|------|--------|
| 프로젝트 초기화 (monorepo, CLAUDE.md) | 프로젝트 디렉토리 |
| 환자 데이터 모델 + Alembic 마이그레이션 | models/*.py |
| FastAPI 보일러플레이트 + React 프로젝트 초기화 | 기본 구조 |
| JWT 인증 시스템 | security.py |
| LLMService 구현 (캐싱, 모델 선택, hallucination guard) | core/llm/ |
| 공통 UI 컴포넌트 (Layout, PatientSearch, PatientCard) | components/ |

### Phase 1: SOAP Writer (Week 3~4)

| Task | 산출물 |
|------|--------|
| 의료 약어 코드북 3-Layer 구축 | medical_abbreviations.json |
| SOAP 변환 파이프라인 (Claude Sonnet 4.6) | modules/soap/service.py |
| KCD 코드 자동 제안 | kcd_codes.json |
| 환자 임상 대시보드 (F/U 플래그 + 바이탈 트렌드 + Lab 트렌드) | ClinicalDashboard/ |
| SOAP 작성 UI + 진료 이력 타임라인 | pages/SOAP/ |

### Phase 2: Document Automation (Week 5~7)

| Task | 산출물 |
|------|--------|
| 문서 템플릿 5종 (진단서, 의뢰서, 소견서, 확인서, 건강진단서) | templates/*.docx |
| Grounded Generation 파이프라인 (4중 검증) | 문서 생성 엔진 |
| 주관적 표현 필터 + 용어 정규화 | guards.py, terminology.py |
| 문체 가이드 + Few-shot 예시 | prompts/document.py |
| 의사 판단 플레이스홀더 기능 | 문서 초안 생성 |
| 발급 대장 자동 관리 | MedicalDocument 모델 |
| 문서 발급 UI | pages/Documents/ |

### Phase 3: Polypharmacy Review (Week 8~11)

| Task | 산출물 |
|------|--------|
| 식약처 API 연동 (e약은요 + DUR) | core/external/ |
| 성분 정규화 매핑 (상품명→INN→ATC→DrugBank ID) | ingredient_map |
| DDI 검출 엔진 (3개 소스 결합) | ddi_engine.py |
| 신기능 용량 조절 DB Tier 1 구축 (~40종) | renal_dose_adjustments.json |
| Sick Day Rules 감지 엔진 + SOAP 연동 | sick_day.py |
| STOPP/START + Beers DB 구축 | stopp_start_v3.json, beers_2023.json |
| 에이전틱 6-step 파이프라인 | service.py |
| 검토 리포트 UI | pages/DrugReview/ |

### Phase 4-A: 검진 추적 기반 (Week 12~14)

| Task | 산출물 |
|------|--------|
| 검사 결과 안내서 자동 생성 (룰 기반 해석 + LLM 다듬기) | lab_sheet.py |
| 내원 리마인더 메시지 블록 조립 시스템 | messenger.py |
| 카카오 알림톡 연동 + SMS fallback | core/external/kakao.py |
| 3단계 자동 발송 스케줄러 (예약확인/전일/당일) | scheduler.py |
| 검진 결과 엑셀 업로드 + 이상소견 자동 분류 | classifier.py |

### Phase 4-B: 환자 관리 고도화 (Week 15~17)

| Task | 산출물 |
|------|--------|
| 만성질환 교육 모듈 DB (질환별 + 공통) | education_modules/ |
| 교육 문서 자동 조립 + 충돌 해소 | education.py |
| 추적 환자 대시보드 (4개 섹션) | pages/Dashboard/ |
| F/U 자동 감지 룰 엔진 | dashboard.py |
| 미내원 환자 추적 + 방문관리 연계 | 미내원 관리 로직 |
| 월간 보고서 자동 생성 | 보고서 생성 |

---

## 10. 성공 지표 (KPI)

| 지표 | 현재 (추정) | 목표 (v1) | 측정 방법 |
|------|-----------|----------|----------|
| SOAP 작성 시간/건 | 2~3분 | 30초 이하 | 시스템 로그 |
| 의뢰서 작성 시간/건 | 10~15분 | 2분 이하 | 시스템 로그 |
| 약물검토 수행률 | 0% | 다약제 환자 100% | 검토 완료 건수 |
| DDI 검출 건수 | 파악 불가 | 정량 추적 | 월별 플래깅 건수 |
| Sick Day 경고 건수 | 0 (미시행) | 정량 추적 | 급성 상황 시 경고 발생 건수 |
| 검사결과 안내서 발급률 | 0% | 검사 시행 환자 80% | 안내서 발급 / 검사 시행 |
| 내원 리마인더 발송률 | 0% | 예약 환자 100% | 발송 건수 / 예약 건수 |
| 예약 내원 이행률 | 추정 70% | 85% 이상 | 내원 / 예약 |
| 교육 문서 제공률 | 0% | 만성질환 신규 등록 100% | 제공 건수 |
| 검진 추적검사 완료율 | 추정 30~40% | 60% 이상 | 이상소견자 대비 완료 |
| 월 API 비용 | - | $15 이하 | Claude API 로그 |

---

## 11. 리스크 및 제약사항

### 11.1 기술적 리스크

| 리스크 | 완화 전략 |
|--------|----------|
| LLM Hallucination | 4중 검증 (Grounded Generation) + 주관적 표현 필터 + 의사 확인 필수 |
| 외부 API 장애 | 로컬 캐시 + graceful degradation + 재시도 로직 |
| 보건소 네트워크 불안정 | 하이브리드 전략: EXAONE 3.5 로컬 fallback + 온라인 복구 시 재처리 큐 |
| EMR(G-Health) 연동 불가 | v1은 독립 운영, 복사/붙여넣기 워크플로우 |

### 11.2 법적/규제 리스크

| 리스크 | 완화 전략 |
|--------|----------|
| 개인정보보호법 | 암호화 저장, 접근 로그, 최소 수집 |
| 의료법 진료기록 보존 | 10년 보존, DB 삭제 방지 |
| AI 의료기기 규제 | v1은 "의사 보조 도구" 포지셔닝, 최종 결정은 의사 |
| 카카오 알림톡 수신 동의 | 최초 동의 절차 + opt-out |

---

## 12. 향후 확장 (v2+)

1. 음성 입력 (STT): Whisper API 통합
2. 약 이미지 OCR: 약 봉투/낱알 사진 → 약물 자동 식별
3. 만성질환 악화 예측: 시계열 ML 모델
4. 방문건강관리 경로 최적화
5. 흉부 X-ray AI 연동 (Lunit/Vuno)
6. 감염병 감시: 일일 진료 데이터 패턴 감지
7. 다기관 연동: 여러 보건소 통합 대시보드
8. EMR 직접 연동: G-Health API 또는 HL7 FHIR

---

## 부록 A: 용어 정의

| 용어 | 정의 |
|------|------|
| SOAP | Subjective, Objective, Assessment, Plan |
| KCD | Korean Standard Classification of Diseases |
| DDI | Drug-Drug Interaction |
| DUR | Drug Utilization Review |
| eGFR | estimated Glomerular Filtration Rate |
| STOPP/START | 고령자 부적절 처방 선별 도구 |
| Beers Criteria | AGS 고령자 부적절 약물 목록 |
| ATC | Anatomical Therapeutic Chemical 분류 |
| G-Health | 공공보건의료정보시스템 (보건소 EMR) |
| SaMD | Software as a Medical Device |
| Sick Day Rules | 급성 질환 시 약물 중단/감량 규칙 |
| Grounded Generation | 원본 데이터에 근거한 제한적 텍스트 생성 |
| INN | International Nonproprietary Name (국제일반명) |

## 부록 B: 참조 문헌 및 가이드라인

1. STOPP/START criteria v3 (2023) — Age and Ageing
2. AGS Beers Criteria (2023) — JAGS
3. KDIGO CKD guideline (2024)
4. KDIGO DM guideline (2024)
5. ADA Standards of Care (2025)
6. ACR Manual on Contrast Media (2024)
7. 식약처 의료기기 소프트웨어(SaMD) 허가심사 가이드라인 (2023)
8. 개인정보보호법 (법률 제19234호)
9. 의료법 제22조 (진료기록부 등)
10. 국민건강보험공단 건강검진 실시기준 (2024)
11. DrugBank 6.0 (Nucleic Acids Res. 2024)

## 부록 C: API 비용 시뮬레이션 (2026년 3월 기준)

**전제: 일 20건 SOAP + 일 5건 문서 + 기타, 월 22일 근무, 프롬프트 캐싱 적용**

| 모듈 | 모델 | Input/건 | Output/건 | 월 건수 | 월 비용 |
|------|------|---------|----------|--------|--------|
| SOAP | Sonnet 4.6 | 4,150 tok | 700 tok | 440 | $5.94 |
| 문서자동화 | Sonnet 4.6 | 7,600 tok | 1,500 tok | 110 | $3.94 |
| 약물검토 | Sonnet 4.6 | ~5,000 tok | ~1,000 tok | ~50 | ~$1.50 |
| 검진/교육 | Haiku 4.5 | ~3,000 tok | ~800 tok | ~60 | ~$0.80 |
| **합계** | | | | | **~$12.18 (₩17,700)** |

예산 $15/월 내 여유 있음.

**모델별 월 비용 비교 (SOAP+문서 합산, 캐싱 적용):**

| 모델 | 월 비용 | 비고 |
|------|--------|------|
| Claude Sonnet 4.6 | $9.88 (₩14,300) | 권장 — 품질/비용 최적 |
| Claude Haiku 4.5 | $3.92 (₩5,700) | 비용 최소 — SOAP은 가능, 문서 문체 불안 |
| Claude Opus 4.6 | $16.08 (₩23,300) | 예산 초과 — 불필요 |
| DeepSeek V3.2 | $0.91 (₩1,300) | 최저가 — 한국어 의료 문서 품질 부족 |
| GPT-5 mini | $1.52 (₩2,200) | 저가 — 한국어 의료 문체 검증 필요 |

## 부록 D: 신기능 용량 조절 약물 목록 (Tier 1)

약 40종. Metformin, Sitagliptin, Linagliptin, Empagliflozin, Dapagliflozin, Canagliflozin, Glimepiride, Allopurinol, Febuxostat, Colchicine, Rivaroxaban, Apixaban, Edoxaban, Dabigatran, Warfarin, Gabapentin, Pregabalin, Digoxin, Bisoprolol, Atenolol, Spironolactone, Eplerenone, Furosemide, HCTZ, Ramipril, Enalapril, Ciprofloxacin, Levofloxacin, Moxifloxacin, Amoxicillin, Co-amoxiclav, Cephalexin, Acyclovir, Valacyclovir, Famotidine, Ranitidine, Lithium, Tramadol, Morphine 등.

## 부록 E: Sick Day Rules 대상 약물 목록

| 약물 | 조치 | 주요 트리거 |
|------|------|-----------|
| Metformin | Hold | AKI, 탈수, 중증 감염, 조영제 |
| SGLT2i (Empa/Dapa/Cana) | Hold | AKI, 탈수, 중증 감염, 수술 전 |
| ACEi/ARB | Hold | AKI, 탈수, 고칼륨혈증 |
| 이뇨제 (HCTZ/Furosemide) | Hold | AKI, 탈수, 전해질 이상 |
| Spironolactone/MRA | Hold | AKI, 고칼륨혈증 |
| NSAIDs | Hold | AKI, 탈수, 심부전, CKD G3+ |
| DOACs | Reduce | AKI, Cr 급상승 |
| Digoxin | Reduce | AKI, 탈수, 저칼륨혈증 |
| SU (Glimepiride 등) | Monitor | 경구 섭취 불량, AKI |
| Allopurinol | Monitor | AKI, Cr 급상승 |

---

> **문서 버전**: v1.1
> **작성일**: 2026-03-30
> **v1.1 업데이트**: 2026-03-31
> **작성자**: 또비 (공중보건의)
> **변경 이력**:
> - v1.0 (2026-03-30): 초기 작성
> - v1.1 (2026-03-31): Phase 1~4 전체 재설계
>   - Phase 1: API 비용 시뮬레이션, 하이브리드 LLM 전략, 임상 대시보드, 3-Layer 약어 코드북
>   - Phase 2: 4중 검증 파이프라인(Grounded Generation), 주관적 표현 배제 규칙, 의학 용어 정규화, 의사 판단 플레이스홀더
>   - Phase 3: 신기능 용량 조절 DB(3-Tier), Sick Day Rules 엔진, DDI DB 구축 전략(3-source pipeline)
>   - Phase 4: 검사 결과 안내서, 내원 리마인더(모듈식 조립), 만성질환 교육 문서(충돌 해소), 추적 환자 대시보드(F/U 자동 감지), 월간 보고서
