# Codex Update

작성일: 2026-04-17
최종 업데이트: 2026-04-19

## 개요

`aro`의 최근 보완 작업은 운영 가능한 내부 베타 수준으로 끌어올리는 데 집중했다. 핵심 범위는 다음과 같다.

- 인증과 역할 기반 접근 제어 강화
- 설정의 서버 저장 전환
- 검진 추적 정합성 수정
- 처방 CRUD 및 약물검토 연계
- 문서 발급 워크플로와 아카이브 보강
- 홈 대시보드 실데이터화
- 대시보드 집계 로직 공용화
- 프론트 인증 부트스트랩 정리와 코드 스플리팅 적용
- SOAP 백령병원 기능 이식과 encounter 기반 템플릿 확장
- SOAP 프리필, 저장, 라운드트립 정합성 보강
- SOAP 입력 UX 단순화와 복붙 전용 창 분리

이번 Codex 작업에서는 `env` 파일은 수정하지 않았고, 사용자 작업 상태를 유지한 채 코드와 테스트만 보완했다.

## 반영된 주요 변경

### 1. 인증, 설정, 기본 보안 보강

- `screening` 전 엔드포인트에 인증을 적용했다.
- 검진 저장, F/U 해결, 일괄 업로드에 감사 로그를 추가했다.
- 사용자 프로필에 `clinic_name`, `clinic_address`, `clinic_phone` 필드를 추가했다.
- 설정 화면이 `localStorage`가 아니라 서버 저장(`PATCH /api/v1/auth/me`)을 사용하도록 변경했다.
- 기존 개발 DB가 바로 깨지지 않도록 앱 시작 시 `users` 테이블의 누락 컬럼을 자동 보강하는 호환 처리도 추가했다.
- Alembic 마이그레이션을 추가했다.

관련 파일:

- `backend/api/screening.py`
- `backend/api/v1.py`
- `backend/core/models/user.py`
- `backend/core/schemas/auth.py`
- `backend/main.py`
- `backend/alembic/versions/2fb0d0e63a1c_add_clinic_fields_to_users.py`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/api/auth.ts`
- `frontend/src/hooks/useAuth.ts`

### 2. 검진 추적 정합성 수정

- 검진 저장 시 `patient_has_dm`를 실제 저장 로직에 반영하도록 수정했다.
- 당뇨 판정 fallback이 `E10`, `E11` 코드도 인식하도록 보완했다.
- `noshow_patients` 응답 계약을 프론트와 맞췄다.
- 환자 보험 enum, 메시징 enum의 프론트/백엔드 불일치를 정리했다.

관련 파일:

- `backend/modules/screening/service.py`
- `backend/core/schemas/screening.py`
- `frontend/src/components/screening/FollowUpDashboard.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/pages/PatientsPage.tsx`

### 3. 처방 CRUD 및 약물검토 연계

- 환자별 처방 조회/등록/수정/중단 API를 추가했다.
- 처방 스키마와 테스트를 추가했다.
- 환자 상세 화면에서 처방을 직접 관리할 수 있는 패널을 붙였다.
- 약물검토 화면에서 선택한 환자의 활성 처방을 불러와 `ingredient_inn` 기준으로 자동 반영하도록 연결했다.

관련 파일:

- `backend/api/prescriptions.py`
- `backend/core/schemas/prescription.py`
- `backend/tests/test_prescriptions_api.py`
- `frontend/src/api/prescriptions.ts`
- `frontend/src/components/patients/PrescriptionPanel.tsx`
- `frontend/src/pages/PatientsPage.tsx`
- `frontend/src/pages/PolypharmacyReview.tsx`
- `frontend/src/hooks/usePolypharmacyStore.ts`

### 4. 문서 발급 워크플로 보강

- 문서 다운로드가 임시 텍스트 blob 생성이 아니라 실제 백엔드 다운로드 API를 사용하도록 변경했다.
- 문서 워크플로를 `draft -> reviewed -> issued` 흐름으로 보완했다.
- 검토 완료 처리, 발급 처리, 이력 갱신을 프론트에서 직접 수행할 수 있게 했다.
- 문서 유형 UI를 백엔드 계약과 맞춰 7종으로 정리했다.

현재 지원 문서 유형:

- `진단서`
- `소견서`
- `확인서`
- `의뢰서`
- `건강진단서`
- `검사결과안내서`
- `교육문서`

관련 파일:

- `frontend/src/pages/DocumentWriter.tsx`
- `frontend/src/components/documents/DocumentActions.tsx`
- `frontend/src/components/documents/DocumentTypeSelector.tsx`
- `frontend/src/api/documents.ts`
- `backend/api/documents.py`

### 5. 문서 이력과 아카이브 분리

- 문서 목록 API에 `status`, `doc_type`, `date_from`, `date_to` 필터를 추가했다.
- 기간 역전 입력은 `400`으로 명확히 처리한다.
- 문서 화면 오른쪽 패널을 `발급 이력`과 `문서 아카이브`로 분리했다.
- `발급 이력`은 `issued`만 보여주고, `문서 아카이브`는 상태/유형/기간 필터로 전체 문서를 조회할 수 있다.
- 선택 환자가 있으면 환자 기준, 없으면 전체 기준으로 아카이브를 조회한다.

관련 파일:

- `backend/api/documents.py`
- `backend/tests/test_documents_api.py`
- `frontend/src/api/documents.ts`
- `frontend/src/components/documents/DocumentHistory.tsx`

### 6. 역할 기반 접근 제어 강화

- 프론트 라우트에 역할 가드를 적용했다.
- 권한이 없는 경로에 접근하면 홈으로 돌려보내는 대신 명시적인 접근 거부 화면을 보여주도록 변경했다.
- 백엔드 API에도 실제 역할 제한을 적용했다.

권한 정책:

- `doctor`: `SOAP`, `encounters`, `polypharmacy`
- `doctor`, `nurse`: `documents`, `prescriptions`
- `admin`: `settings`

관련 파일:

- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/ForbiddenPage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/Layout/Sidebar.tsx`
- `backend/api/encounters.py`
- `backend/api/documents.py`
- `backend/api/polypharmacy.py`
- `backend/api/prescriptions.py`

### 7. SOAP 임상 요약 보강

- `clinical-summary` 응답에 환자별 미해결 `follow_up_alerts`를 실제로 포함하도록 수정했다.
- SOAP 우측 패널에서 미해결 F/U 알림을 바로 확인할 수 있게 했다.

관련 파일:

- `backend/core/schemas/encounter.py`
- `backend/api/encounters.py`
- `backend/tests/test_encounters.py`
- `frontend/src/types/index.ts`
- `frontend/src/components/soap/ClinicalDashboard.tsx`

### 8. 홈 대시보드 실데이터화

- 기존 플레이스홀더 대시보드를 운영형 화면으로 교체했다.
- 새 홈 대시보드는 다음 데이터를 한 번에 보여준다.

- 오늘 예약
- F/U 필요
- 미내원(지난주)
- 검진 미수검
- 이번달 활동 요약
- 예정 내원 목록
- 우선 확인 F/U 알림
- 최근 문서
- 월간 보고서 아카이브

- 이를 위해 `GET /api/v1/dashboard/summary` 집계 API를 추가했다.

관련 파일:

- `backend/api/dashboard.py`
- `backend/core/schemas/dashboard.py`
- `frontend/src/api/dashboard.ts`
- `frontend/src/pages/Dashboard.tsx`

### 9. 월간 보고서 아카이브 추가

- 저장된 월간 보고서 파일(`reports/monthly_YYYYMM.pdf`)을 조회하는 API를 추가했다.
- 저장된 특정 월의 PDF를 직접 내려받는 API를 추가했다.
- 홈 대시보드에서 현재월 PDF 생성과 아카이브 다운로드를 할 수 있게 했다.

추가된 API:

- `GET /api/v1/reports/archive`
- `GET /api/v1/reports/archive/{year}/{month}`

관련 파일:

- `backend/api/reports.py`
- `backend/core/schemas/report.py`
- `frontend/src/api/reports.ts`
- `frontend/src/pages/Dashboard.tsx`

### 10. 대시보드 집계 로직 공용화

- 홈 대시보드와 검진 대시보드가 같은 요약 로직을 쓰도록 공용 서비스를 추가했다.
- 중복 계산으로 인한 숫자 drift 가능성을 제거했다.

관련 파일:

- `backend/modules/dashboard/service.py`
- `backend/api/dashboard.py`
- `backend/modules/screening/service.py`

### 11. 프론트 인증 부트스트랩 및 코드 스플리팅

- 인증 체크를 앱 루트에서 한 번만 수행하도록 정리했다.
- `ProtectedRoute`는 상태 확인만 담당하고, 더 이상 중첩 라우트마다 `checkAuth()`를 재호출하지 않는다.
- 페이지와 레이아웃을 `lazy` 로딩으로 전환해 실제 청크 분리를 적용했다.

효과:

- 기존 단일 대형 메인 번들 구조를 해소했다.
- 최신 빌드 기준 메인 엔트리 청크는 `253.69 kB`까지 내려갔다.
- 가장 큰 분리 청크는 `SOAPWriter`로 약 `368.64 kB`다.

관련 파일:

- `frontend/src/App.tsx`
- `frontend/src/components/ProtectedRoute.tsx`

### 12. 백령병원 SOAP 기능 이식 방향 정리

- 기존 `github.com/gabehihi/aro_baekryoung`의 SOAP 자동 작성 기능을 읽고, `aro`에 어떤 기능을 parity로 옮겨야 하는지 분석 문서를 남겼다.
- 이식 방향은 기존 서버측 문자열 생성 복원이 아니라, 현재 `aro`의 `frontend template engine + backend Encounter contract`를 확장하는 쪽으로 정리했다.
- 우선순위는 `급성 O/A/P 복원 -> 만성 검사 확장 -> 프리필/저장 round-trip 보강 -> UX 정리` 순으로 잡았다.

관련 파일:

- `docs/soap-baekryoung-migration.md`

### 13. SOAP 템플릿 기능 확장

- 급성 SOAP에 `Objective`, `Assessment`, `Plan` 입력 카드를 추가했다.
- 최종 SOAP 조합 로직이 급성 `O/A/P`까지 실제 출력에 반영되도록 바꿨다.
- 저장 시 급성 탭의 활력징후도 `Encounter.vitals`에 같이 들어가도록 정리했다.
- 만성 SOAP에는 `waist`, `ACR`, `Vit D`, `Hb`, 자유 검사값(`other labs`) 입력과 출력, 저장, 프리필을 추가했다.
- 백엔드 `soap-prefill` 응답은 `fbs`, `tc`, `acr`, `vitd`, `hb` alias와 `other_labs`, `bt/rr/spo2/waist`를 실제로 다루도록 확장했다.
- `raw_input` 저장 포맷을 `TEMPLATE_V2`로 올려 이후 encounter 재해석과 디버깅이 가능하게 했다.

관련 파일:

- `frontend/src/pages/SOAPWriter.tsx`
- `frontend/src/components/soap/acute/`
- `frontend/src/components/soap/chronic/`
- `frontend/src/components/soap/SaveEncounterButton.tsx`
- `frontend/src/utils/soap/soapFormatter.ts`
- `frontend/src/utils/soap/rawInput.ts`
- `frontend/src/api/encounters.ts`
- `backend/api/encounters.py`
- `backend/core/schemas/encounter.py`

### 14. SOAP 프리필, 저장, 라운드트립 정합성 보강

- 환자 선택 시 자동 프리필, 수동 `최근값 다시 채우기`, 덮어쓰기 확인 흐름을 추가했다.
- 사용자가 이미 입력을 시작한 뒤 늦게 도착한 자동 프리필이 값을 덮어쓰지 않도록 race를 막았다.
- `applyPrefill()`는 이제 prefill 대상 필드를 부분 병합하지 않고 전체 치환해 stale 값이 남지 않는다.
- 환자 전환 시 `lastEncounterDate`와 프리필 메타데이터가 함께 정리되도록 했다.
- `POST /encounters -> GET /encounters/{id} -> GET /patients/{id}/soap-prefill` 경로에 대한 round-trip 테스트를 추가했다.
- 저장된 `TEMPLATE_V2 raw_input`을 다시 해석해 프론트 상태로 복원하는 테스트도 추가했다.

관련 파일:

- `frontend/src/hooks/useSoapStore.ts`
- `frontend/src/utils/soap/prefill.ts`
- `frontend/src/utils/soap/rawInput.ts`
- `frontend/src/components/soap/PatientSearchBar.tsx`
- `frontend/src/hooks/useSoapStore.test.ts`
- `frontend/src/utils/soap/__tests__/prefill.test.ts`
- `backend/tests/test_encounters.py`

### 15. SOAP 안정성 및 출력 규칙 정리

- `CKD` 선택 시 하얀 화면이 뜨던 문제를 stable selector 기반으로 수정했다.
- `Assessment`의 만성질환 진단명은 모두 영어 의학용어로 통일했다.
- `CKD Assessment`는 `CKD stage ... (eGFR ..., YYYY-MM-DD)` 형식으로 출력되도록 바꿨고, 이를 위해 CKD 검사일 입력과 프리필을 추가했다.
- `Plan`에서는 자동으로 진단명 prefix가 붙지 않도록 정리했다.
- 자동 생성되던 약제 조정 문구, `Statin/RAAS inhibitor/Levothyroxine` 유지·조정 문구, `[의사 소견: __]` 같은 boilerplate를 제거했다.

관련 파일:

- `frontend/src/hooks/useSoapSelectors.ts`
- `frontend/src/components/soap/chronic/CKDSection.tsx`
- `frontend/src/utils/soap/templates/assessment.ts`
- `frontend/src/utils/soap/templates/plan.ts`
- `frontend/src/utils/soap/__tests__/templates.test.ts`

### 16. SOAP 입력 UX 개편

- 만성질환은 여전히 복수 선택이 가능하지만, 입력 패널은 현재 선택한 질환 하나만 보이도록 바꿨다.
- 질환 토글 직후 해당 질환이 바로 열리고, 이미 선택된 질환 사이를 작은 전환 버튼으로 오갈 수 있게 했다.
- 메인 화면 하단의 큰 SOAP 복붙 카드는 제거하고, 복붙과 수기 수정은 전용 새 창에서 진행하도록 바꿨다.
- 새 창은 현재 SOAP 상태와 실시간으로 연결되며, 섹션별 복사와 전체 복사가 모두 가능하다.

관련 파일:

- `frontend/src/components/soap/chronic/DiseasePicker.tsx`
- `frontend/src/components/soap/chronic/DiseaseSections.tsx`
- `frontend/src/components/soap/preview/SOAPPreviewPane.tsx`
- `frontend/src/hooks/useSoapStore.ts`

## 검증 결과

최신 검증 기준:

- 백엔드 테스트: `256 passed`
- 프론트 빌드: `pnpm -C frontend build` 통과

SOAP 추가 반영 기준:

- 프론트 테스트: `78 passed`
- 프론트 빌드: `npm run build` 통과
- 백엔드 SOAP/encounter 회귀: `backend/tests/test_encounters.py` 기준 round-trip 포함 검증 반영

주요 검증 추가/보강 범위:

- `backend/tests/test_prescriptions_api.py`
- `backend/tests/test_dashboard_api.py`
- `backend/tests/test_documents_api.py` 보강
- `backend/tests/test_encounters.py` 보강
- `backend/tests/test_polypharmacy_api.py` 보강
- `backend/tests/test_reports_api.py` 보강
- `backend/tests/test_screening_api.py` 보강
- `backend/tests/test_screening_bulk_upload.py` 보강

## 현재 상태 요약

현재 `aro`는 다음이 실제로 연결된 상태다.

- JWT 로그인과 사용자 프로필/보건소 설정 저장
- 환자 관리와 처방 관리
- SOAP 변환과 진료기록 저장
- 급성 SOAP `O/A/P` 작성과 encounter 저장
- 만성 SOAP 확장 검사값(`waist`, `ACR`, `Vit D`, `Hb`, custom labs`) 저장/프리필
- SOAP 우측 임상 요약 및 미해결 F/U 표시
- encounter 기반 SOAP 프리필과 raw_input round-trip 복원
- 만성질환 단일 패널 입력과 SOAP 복붙 전용 새 창
- 약물검토와 환자 활성 처방 연계
- 검진 결과 저장, F/U 대시보드, 일괄 업로드
- 문서 생성, 검토, 발급, 다운로드
- 문서 발급 이력과 문서 아카이브 조회
- 홈 대시보드와 월간 보고서 아카이브 조회

## 남은 리스크 및 다음 개선 후보

### 1. 큰 SOAP 청크 추가 최적화

- 현재는 코드 스플리팅을 적용했지만 `SOAPWriter` 청크가 가장 크다.
- SOAP 관련 그래프/보조 컴포넌트 단위 추가 분리가 가능하다.

### 2. SOAP 복붙 창의 팝업 차단 대응

- 현재 복붙 전용 창은 브라우저 팝업 허용이 필요하다.
- 장기적으로는 팝업 차단 환경을 위한 drawer/modal fallback을 두는 편이 안전하다.

### 3. 운영용 아카이브 화면 고도화

- 현재 문서 아카이브는 문서 화면 내부 탭으로 충분히 동작한다.
- 이후 전용 검색 화면, 정렬, 다운로드 로그가 추가될 수 있다.

### 4. 대시보드 시각화 확대

- 현재는 운영 지표 중심 카드/리스트 화면이다.
- 이후 `월별 추이`, `문서 유형 분포`, `이상소견 변화` 같은 시각화가 추가될 수 있다.

### 5. 사용자/조직 관리 확장

- 현재 계정 관리 범위는 로그인과 현재 사용자 프로필 수정 수준이다.
- 다중 사용자 운영이 커지면 `계정 생성`, `비밀번호 재설정`, `권한 변경` 화면/API가 필요할 수 있다.

## 참고

현재 워크트리에는 사용자 측에서 먼저 업데이트한 `.env` 관련 변경과 기존 수정사항이 함께 존재할 수 있다. 이번 Codex 작업은 그 상태를 유지한 채 기능 보강과 검증에만 집중했다.
