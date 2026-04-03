---
name: DB Schema Overview
description: Phase 0에서 구현한 10개 테이블 전체 구조, 관계, 암호화 컬럼
type: project
---

Phase 0에서 구현한 SQLAlchemy 2.0 모델 전체 목록.

**Why:** 의료 데이터 보안 + 법적 보존 의무 (의료법 10년). 삭제 대신 soft-delete 패턴 권고.
**How to apply:** 새 모델 추가 시 UUIDPrimaryKeyMixin + TimestampMixin 적용. 환자 식별정보(이름, 전화번호)는 반드시 EncryptedString 타입 사용.

## 테이블 목록

| 모델 | 테이블 | 핵심 특징 |
|------|--------|-----------|
| User | users | role(doctor/nurse/admin), bcrypt 해시 |
| Patient | patients | 이름/전화번호 AES-256-GCM 암호화 |
| Encounter | encounters | SOAP 4분할, vitals/labs JSON |
| Prescription | prescriptions | DrugBank ID 매핑, 보건소/타원 구분 |
| ScreeningResult | screening_results | 검진 결과, abnormal_findings JSON |
| MedicalDocument | medical_documents | 진단서 등 7종, draft→reviewed→issued |
| VisitSchedule | visit_schedules | 예약, reminder_status JSON |
| FollowUpAlert | follow_up_alerts | 3단계 우선순위(urgent/due/upcoming) |
| AuditLog | audit_logs | 모든 환자정보 접근 기록 |

## 암호화 컬럼
- `Patient.name`, `Patient.phone` — `EncryptedString` TypeDecorator
- 키: `ENCRYPTION_KEY` (base64-encoded 32 bytes AES-256-GCM)
- 저장 형식: `base64(nonce[12] + ciphertext)`

## 파일 위치
- `backend/core/models/` — 각 모델 파일
- `backend/core/models/__init__.py` — Alembic autogenerate용 전체 import
- `backend/core/models/encryption.py` — EncryptedString TypeDecorator
