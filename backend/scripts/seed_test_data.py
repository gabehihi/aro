"""Seed test data for development: 1 doctor, 2 patients, encounters with vitals/labs."""

import asyncio
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.database import async_session, engine
from core.models import Base
from core.models.encounter import Encounter
from core.models.enums import InsuranceType, PrescribedBy, Sex, UserRole, VisitType
from core.models.patient import Patient
from core.models.prescription import Prescription
from core.models.user import User
from core.security import hash_password


async def seed() -> None:
    # Create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Doctor
        doctor = User(
            username="doctor",
            hashed_password=hash_password("doctor1234"),
            name="김내과",
            role=UserRole.doctor,
            is_active=True,
        )
        db.add(doctor)
        await db.flush()

        # Patient 1: HTN + DM
        p1 = Patient(
            chart_no="P-2024-001",
            name="박영수",
            birth_date=date(1955, 3, 10),
            sex=Sex.M,
            insurance_type=InsuranceType.건강보험,
            chronic_diseases=["I10", "E11"],
            allergies=["페니실린"],
            memo="고혈압/당뇨 보건소 등록관리 환자",
        )
        db.add(p1)
        await db.flush()

        # Patient 1 prescriptions
        rxs_p1 = [
            Prescription(
                patient_id=p1.id,
                drug_name="Amlodipine 5mg",
                ingredient_inn="amlodipine",
                atc_code="C08CA01",
                dose="5mg",
                frequency="QD",
                is_active=True,
                prescribed_by=PrescribedBy.보건소,
                start_date=date(2024, 1, 1),
            ),
            Prescription(
                patient_id=p1.id,
                drug_name="Losartan 50mg",
                ingredient_inn="losartan",
                atc_code="C09CA01",
                dose="50mg",
                frequency="QD",
                is_active=True,
                prescribed_by=PrescribedBy.보건소,
                start_date=date(2024, 1, 1),
            ),
            Prescription(
                patient_id=p1.id,
                drug_name="Metformin 500mg",
                ingredient_inn="metformin",
                atc_code="A10BA02",
                dose="500mg",
                frequency="BID",
                is_active=True,
                prescribed_by=PrescribedBy.보건소,
                start_date=date(2024, 1, 1),
            ),
            Prescription(
                patient_id=p1.id,
                drug_name="Rosuvastatin 10mg",
                ingredient_inn="rosuvastatin",
                atc_code="C10AA07",
                dose="10mg",
                frequency="QD",
                is_active=True,
                prescribed_by=PrescribedBy.보건소,
                start_date=date(2024, 3, 1),
            ),
        ]
        db.add_all(rxs_p1)
        await db.flush()

        # Patient 1 encounters (6 visits over past year)
        now = datetime.now()
        encounters_p1 = [
            {
                "offset_months": 10,
                "vitals": {"sbp": 155, "dbp": 95, "hr": 78, "bw": 72, "bh": 170, "bmi": 24.9},
                "labs": [
                    {"name": "HbA1c", "value": 8.1, "unit": "%", "flag": "H"},
                    {"name": "Cr", "value": 1.0, "unit": "mg/dL", "flag": None},
                    {"name": "eGFR", "value": 78, "unit": "mL/min/1.73m2", "flag": None},
                    {"name": "LDL", "value": 145, "unit": "mg/dL", "flag": "H"},
                ],
                "assessment": "I10 고혈압 - 조절 불충분, E11 당뇨 - HbA1c 8.1%",
                "plan": "암로디핀 5mg 시작, 메트포르민 500mg BID 시작, 3개월 후 재평가",
            },
            {
                "offset_months": 8,
                "vitals": {"sbp": 142, "dbp": 88, "hr": 74, "bw": 71.5, "bmi": 24.7},
                "labs": [
                    {"name": "FBS", "value": 135, "unit": "mg/dL", "flag": "H"},
                ],
                "assessment": "I10 고혈압 - 개선 추세, E11 당뇨 - 공복혈당 135",
                "plan": "현 처방 유지, 로사르탄 50mg 추가",
            },
            {
                "offset_months": 6,
                "vitals": {"sbp": 138, "dbp": 85, "hr": 72, "bw": 71, "bmi": 24.6},
                "labs": [
                    {"name": "HbA1c", "value": 7.5, "unit": "%", "flag": "H"},
                    {"name": "Cr", "value": 1.1, "unit": "mg/dL", "flag": None},
                    {"name": "eGFR", "value": 72, "unit": "mL/min/1.73m2", "flag": None},
                    {"name": "LDL", "value": 118, "unit": "mg/dL", "flag": "H"},
                ],
                "assessment": "I10 고혈압, E11 당뇨 - HbA1c 7.5% (전회 8.1%)",
                "plan": "로수바스타틴 10mg 추가, 3개월 후 재평가",
            },
            {
                "offset_months": 4,
                "vitals": {"sbp": 132, "dbp": 82, "hr": 70, "bw": 70.5, "bmi": 24.4},
                "labs": [
                    {"name": "FBS", "value": 122, "unit": "mg/dL", "flag": "H"},
                ],
                "assessment": "I10 고혈압 - BP 132/82 (목표 근접), E11 당뇨 - FBS 122",
                "plan": "현 처방 유지, 운동 식이 교육",
            },
            {
                "offset_months": 2,
                "vitals": {"sbp": 128, "dbp": 78, "hr": 68, "bw": 70, "bmi": 24.2},
                "labs": [
                    {"name": "HbA1c", "value": 7.2, "unit": "%", "flag": None},
                    {"name": "Cr", "value": 1.1, "unit": "mg/dL", "flag": None},
                    {"name": "eGFR", "value": 70, "unit": "mL/min/1.73m2", "flag": None},
                    {"name": "LDL", "value": 95, "unit": "mg/dL", "flag": None},
                    {"name": "TG", "value": 162, "unit": "mg/dL", "flag": "H"},
                ],
                "assessment": "I10 고혈압 - BP 128/78 (목표 달성), E11 당뇨 - HbA1c 7.2%",
                "plan": "현 처방 유지, 2개월 후 재진",
            },
            {
                "offset_months": 0,
                "vitals": {"sbp": 130, "dbp": 80, "hr": 72, "bw": 69.5, "bmi": 24.0},
                "labs": [],
                "assessment": "I10 고혈압, E11 당뇨 - 경과 관찰",
                "plan": "현 처방 유지, 3개월 후 HbA1c/eGFR/지질 재검",
            },
        ]

        for enc_data in encounters_p1:
            enc_date = now - timedelta(days=enc_data["offset_months"] * 30)
            enc = Encounter(
                patient_id=p1.id,
                encounter_date=enc_date,
                raw_input=f"HTN DM f/u {enc_data['assessment']}",
                visit_type=VisitType.재진,
                subjective=(
                    "특이 호소 없음" if enc_data["offset_months"] > 0 else "경과 관찰 위해 내원"
                ),
                objective=(
                    f"BP {enc_data['vitals'].get('sbp', '-')}/{enc_data['vitals'].get('dbp', '-')}"
                ),
                assessment=enc_data["assessment"],
                plan=enc_data["plan"],
                vitals=enc_data["vitals"],
                kcd_codes=[
                    {"code": "I10", "description": "본태성 고혈압"},
                    {"code": "E11", "description": "2형 당뇨병"},
                ],
                labs=enc_data["labs"],
                health_promotion={
                    "smoking_cessation": False,
                    "alcohol_reduction": True,
                    "exercise": True,
                    "diet": True,
                },
                created_by=doctor.id,
            )
            db.add(enc)

        # Patient 2: CKD + HTN
        p2 = Patient(
            chart_no="P-2024-002",
            name="이순자",
            birth_date=date(1948, 11, 22),
            sex=Sex.F,
            insurance_type=InsuranceType.건강보험,
            chronic_diseases=["I10", "N18"],
            allergies=[],
            memo="CKD 3기, eGFR 추적 필요",
        )
        db.add(p2)
        await db.flush()

        rxs_p2 = [
            Prescription(
                patient_id=p2.id,
                drug_name="Losartan 100mg",
                ingredient_inn="losartan",
                atc_code="C09CA01",
                dose="100mg",
                frequency="QD",
                is_active=True,
                prescribed_by=PrescribedBy.보건소,
                start_date=date(2023, 6, 1),
            ),
            Prescription(
                patient_id=p2.id,
                drug_name="Furosemide 20mg",
                ingredient_inn="furosemide",
                atc_code="C03CA01",
                dose="20mg",
                frequency="QD",
                is_active=True,
                prescribed_by=PrescribedBy.보건소,
                start_date=date(2024, 1, 1),
            ),
        ]
        db.add_all(rxs_p2)

        await db.commit()
        print("Seed data created successfully!")
        print("  Doctor: doctor / doctor1234")
        print(f"  Patient 1: {p1.chart_no} - {p1.name} (HTN+DM, 6 encounters)")
        print(f"  Patient 2: {p2.chart_no} - {p2.name} (HTN+CKD)")


if __name__ == "__main__":
    asyncio.run(seed())
