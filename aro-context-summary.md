# aro 프로젝트 — 대화 컨텍스트 압축본
> 생성일: 2026-03-31 | 대화 범위: PRD v1.0 작성 → Phase 1~4 수정 논의 → PRD v1.1 통합

---

## 프로젝트 정의

- **프로젝트명**: aro (순우리말 '아로새기다')
- **목적**: 충청북도 보건소/보건지소 전용 AI 어시스턴트. 의사 1인 체제에서 진료 문서화, 약물 안전성 검토, 검진 추적, 환자 교육을 AI로 보조
- **사용자**: 공중보건의(의사), 간호사, 보건소장
- **기술 스택**: React+TS+Tailwind+Vite (프론트) / Python+FastAPI (백엔드) / SQLite→PostgreSQL (DB) / Claude API (AI) / python-docx+WeasyPrint (문서)
- **PRD v1.1 완성**: `/mnt/user-data/outputs/aro-PRD-v1.1.md` (1,039줄, 12개 섹션 + 부록 5개)

---

## 4개 모듈 요약

### Module 1: SOAP Writer
- 의사 속기 입력 → Claude Sonnet 4.6으로 SOAP 변환
- **3-Layer 약어 코드북**: built-in(공통 ~200개) + kyunghee(경희대 관례) + personal(또비 개인, 백령도 174개 기반). 미인식 약어 자동 학습 모드
- **환자 임상 대시보드**: 메트릭 카드(BP/HbA1c/eGFR/BMI + delta), F/U Required 자동 감지(7개 룰), 바이탈/Lab 트렌드 차트
- **API 비용**: Sonnet 캐싱 적용 시 월 $5.94 (₩8,600). 일 20건 × 22일
- **오프라인 fallback**: EXAONE 3.5 7.8B (Ollama) — 네트워크 불안정 시 로컬 실행
- **Sick Day Alert 크로스모듈 연동**: SOAP 입력 시 약물검토 모듈의 Sick Day 감지 엔진 자동 호출

### Module 2: Document Automation Agent
- 진단서, 소견서, 의뢰서, 확인서, 건강진단서, 검사결과 안내서, 교육문서 자동 생성
- **4중 검증 파이프라인 (Grounded Generation)**:
  1. Source Data Assembly: 진료 데이터를 JSON으로 구조화하여 LLM에 전달
  2. Constrained Generation: 입력에 없는 사실 생성 절대 금지
  3. Fact-check Layer (Code-based): 수치/진단/검사명 역검증 + 주관적 표현 필터 + 용어 정규화
  4. Human-in-the-loop: 의사 검토 필수, 경고 미해결 시 발급 버튼 비활성화
- **주관적 표현 배제 규칙**: 가치 판단형("양호한 수준"), 정도 판단형("상당히 호전"), 추측/감정형("다행히") 금지. 대신 수치+측정일, 이전 대비 변화량, 가이드라인 분류만 사용. 의사 판단 필요 부분은 `[의사 소견: ___]` 플레이스홀더
- **의학 용어 정규화**: "고혈압"→"본태성 고혈압", "당뇨"→"제2형 당뇨병" 등. 문서 유형별 용어 수준 차등 (의뢰서: 영어 혼용 가능 / 안내서: 어르신 대상 쉬운 말)
- **API 비용**: Sonnet 캐싱 적용 시 월 $3.94. 일 5건 × 22일

### Module 3: Polypharmacy Review Agent
- **신기능 용량 조절 DB (3-Tier)**: Tier 1(수작업, 보건소 고빈도 ~40종, PI+KDIGO 기반), Tier 2(반자동, DrugBank+LLM 추출, ~200종), Tier 3(미등록 약물 LLM 플래깅). JSON 구조로 eGFR 구간별 용량 권고
- **Sick Day Rules**: 급성 상황(AKI, 탈수, 중증감염, 심부전, 고칼륨) 시 약물 중단/감량 자동 알림. 대상: Metformin(Hold), SGLT2i(Hold), ACEi/ARB(Hold), 이뇨제(Hold), Spironolactone(Hold), NSAIDs(Hold), DOACs(Reduce), Digoxin(Reduce), SU(Monitor). SOAP 입력 시 키워드+Lab으로 자동 트리거
- **DDI DB 구축 전략**: 3개 소스 결합 — 심평원 DUR 공공데이터 + 식약처 e약은요 API + DrugBank Open. 파이프라인: 성분 정규화(상품명→INN→ATC→DrugBank ID) → DDI pair 추출 → 보건소 약물 기준 필터링(~500쌍) → 의사 검수. clinic_note 필드로 보건소 맥락 지침 추가
- **Hallucination Guard**: DDI는 반드시 DB 조회 결과만 사용, LLM 생성 금지

### Module 4: Screening & Follow-up Agent
- **검사 결과 안내서**: A4 1장, 어르신 눈높이. 의학용어 한글 정식명칭+영문 병기. 해석은 "무엇을 보는 검사" + "결과가 어떻습니다" 구조. 판단("양호") 미사용. 하단에 다음 내원 안내 박스. 룰 기반 1차 해석 → LLM 2차 다듬기
- **내원 리마인더**: 3단계 타이밍(예약확인/전일 18시/당일 08시). 모듈식 메시지 블록 조립(금식, 당뇨약 중단, 갑상선약 중단, 혈압약 복용 안내, 타원 결과지 지참, 소변검사). 타원 검사 자동 감지(SOAP Plan 키워드 검색). 카카오 알림톡 우선 → SMS fallback
- **만성질환 교육 문서**: 질환별 모듈(HTN/DM/DLD/CKD/골다공증/갑상선) + 공통(체중/식습관/운동/금연절주). 환자 질환 조합에 따라 자동 조립. 질환 간 상충 권고 해소(예: DM+CKD 과일 → 저당+저칼륨). 템플릿 70% + LLM 개인화 30%
- **추적 환자 대시보드**: 4개 섹션 — ①오늘 요약(메트릭 4개) ②오늘 예약 환자(시간순, 금식/알림 상태) ③F/U 필요 환자(자동 감지: eGFR 3개월, HbA1c 3개월, U/A 즉시, AST/ALT 4주, LDL 6주, TSH 6주) ④미내원 환자(7일/14일/21일+ 단계별 조치)
- **월간 보고서 자동 생성**: 등록 현황, 내원율, 조절률, 수검률, 추적완료율

---

## 비용 구조

| 항목 | 월 비용 |
|------|--------|
| Claude API (전 모듈 합산, 캐싱 적용) | ~$12.18 (₩17,700) |
| 카카오 알림톡 + SMS | ~₩3,500 |
| **합계** | **~₩21,200/월** (예산 $15 = ₩21,750 이내) |

---

## 개발 로드맵

| Phase | 기간 | 내용 |
|-------|------|------|
| Phase 0 | Week 1~2 | 프로젝트 기반 (데이터 모델, FastAPI/React 초기화, LLMService, 인증) |
| Phase 1 | Week 3~4 | SOAP Writer (약어 코드북, SOAP 변환, 임상 대시보드) |
| Phase 2 | Week 5~7 | Document Automation (4중 검증, 주관적 표현 필터, 템플릿 5종) |
| Phase 3 | Week 8~11 | Polypharmacy Review (DDI DB, 신기능 용량 DB, Sick Day Rules) |
| Phase 4-A | Week 12~14 | 검진 추적 기반 (안내서, 리마인더, 알림톡 연동) |
| Phase 4-B | Week 15~17 | 환자 관리 고도화 (교육 문서, 대시보드, 월간 보고서) |

---

## 핵심 설계 원칙 (대화에서 확정된 것)

1. **Rule-based first, LLM은 해석/다듬기만**: DDI, 용량 조절, 검사 분류는 룰 엔진. LLM은 사실을 쉬운 말로 번역하거나 문서 문체를 다듬는 역할
2. **Hallucination 방지 = 4중 레이어**: 입력 구조화 → 프롬프트 제약 → 코드 검증 → 의사 확인
3. **주관적 표현 배제**: AI는 사실 기술만, 판단은 의사가. "양호" 등 가치 판단어 금지
4. **비용은 이슈가 아니다**: Sonnet 캐싱 적용 시 전 모듈 합산 월 ₩17,700. 모델 선택은 품질 기준
5. **프롬프트 캐싱이 핵심**: 시스템 프롬프트+코드북+문체가이드 = 매 호출 반복 → 90% 할인
6. **의사 판단 플레이스홀더**: LLM이 판단 영역을 빈칸으로 남기고, 의사가 한 줄만 추가
7. **모듈 간 연동**: SOAP 입력 → Sick Day Alert 자동 / SOAP 기록 → 의뢰서 내용 자동 참조 / 검사 결과 → F/U 대시보드 자동 감지

---

## 다음 단계

PRD v1.1 확정 완료. 다음은 **Phase 0 (프로젝트 초기화)** 진입:
1. 프로젝트 디렉토리 구조 생성 + CLAUDE.md
2. 환자 데이터 모델 (SQLAlchemy) + DB 스키마 확정
3. FastAPI 보일러플레이트 + React 프로젝트 초기화
4. LLMService 공통 래퍼 구현
5. 기본 인증 시스템 (JWT)
