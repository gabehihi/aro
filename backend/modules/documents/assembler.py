"""Source Data Assembly for Document Generation.

Layer 1 of the 4-layer Grounded Generation pipeline.
Gathers patient data, encounters, prescriptions, and screening results
into a structured dict that constrains what the LLM can reference.
"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.encounter import Encounter
from core.models.enums import DocType
from core.models.patient import Patient
from core.models.prescription import Prescription
from core.models.screening import ScreeningResult


class SourceDataAssembler:
    """Assembles structured source data for grounded document generation.

    Fetches all relevant patient data from the database and returns a
    constrained dict that the LLM must reference — preventing hallucination
    by bounding what facts are available during generation.
    """

    async def assemble(
        self,
        patient_id: uuid.UUID,
        encounter_id: uuid.UUID | None,
        doc_type: DocType,
        db: AsyncSession,
    ) -> dict:
        """Gather all relevant data for the given patient and document type.

        Args:
            patient_id: UUID of the target patient.
            encounter_id: UUID of the primary encounter, or None.
            doc_type: Type of document being generated.
            db: Async SQLAlchemy session.

        Returns:
            Structured dict with patient, encounter, recent_encounters,
            active_prescriptions, screening_results, and metadata keys.

        Raises:
            ValueError: If the patient is not found.
        """
        patient = await self._load_patient(patient_id, db)
        encounter = await self._load_encounter(encounter_id, db)
        recent_encounters = await self._load_recent_encounters(patient_id, db)
        prescriptions = await self._load_prescriptions(patient_id, db)

        # 건강진단서에서만 검진 결과 포함
        screening: ScreeningResult | None = None
        if doc_type == DocType.건강진단서:
            screening = await self._load_screening(patient_id, db)

        return {
            "patient": {
                "chart_no": patient.chart_no,
                "name": patient.name,
                "birth_date": patient.birth_date.isoformat(),
                "sex": patient.sex,
                "insurance_type": patient.insurance_type,
                "chronic_diseases": patient.chronic_diseases,
                "allergies": patient.allergies,
            },
            "encounter": (
                {
                    "encounter_date": encounter.encounter_date.isoformat(),
                    "subjective": encounter.subjective,
                    "objective": encounter.objective,
                    "assessment": encounter.assessment,
                    "plan": encounter.plan,
                    "vitals": encounter.vitals,
                    "kcd_codes": encounter.kcd_codes,
                    "labs": encounter.labs,
                    "visit_type": encounter.visit_type,
                }
                if encounter is not None
                else None
            ),
            "recent_encounters": [
                {
                    "encounter_date": e.encounter_date.isoformat(),
                    "assessment": e.assessment,
                    "kcd_codes": e.kcd_codes,
                    "visit_type": e.visit_type,
                }
                for e in recent_encounters
            ],
            "active_prescriptions": [
                {
                    "drug_name": rx.drug_name,
                    "ingredient_inn": rx.ingredient_inn,
                    "dose": rx.dose,
                    "frequency": rx.frequency,
                    "route": rx.route,
                }
                for rx in prescriptions
            ],
            "screening_results": (
                {
                    "screening_type": screening.screening_type,
                    "screening_date": screening.screening_date.isoformat(),
                    "results": screening.results,
                    "abnormal_findings": screening.abnormal_findings,
                    "follow_up_required": screening.follow_up_required,
                }
                if screening is not None
                else None
            ),
            "metadata": {
                "doc_type": doc_type,
                "generation_date": date.today().isoformat(),
                "clinic_name": "보건소",
            },
        }

    async def _load_patient(
        self,
        patient_id: uuid.UUID,
        db: AsyncSession,
    ) -> Patient:
        """Fetch patient by ID, raising ValueError if not found.

        Args:
            patient_id: UUID of the patient.
            db: Async SQLAlchemy session.

        Returns:
            Patient ORM instance.

        Raises:
            ValueError: If no patient matches the given ID.
        """
        result = await db.execute(select(Patient).where(Patient.id == patient_id))
        patient = result.scalar_one_or_none()
        if patient is None:
            raise ValueError(f"환자를 찾을 수 없습니다: {patient_id}")
        return patient

    async def _load_encounter(
        self,
        encounter_id: uuid.UUID | None,
        db: AsyncSession,
    ) -> Encounter | None:
        """Fetch encounter by ID, returning None if ID is None or not found.

        Args:
            encounter_id: UUID of the encounter, or None.
            db: Async SQLAlchemy session.

        Returns:
            Encounter ORM instance or None.
        """
        if encounter_id is None:
            return None
        result = await db.execute(select(Encounter).where(Encounter.id == encounter_id))
        return result.scalar_one_or_none()

    async def _load_recent_encounters(
        self,
        patient_id: uuid.UUID,
        db: AsyncSession,
        limit: int = 5,
    ) -> list[Encounter]:
        """Fetch the most recent encounters for a patient.

        Args:
            patient_id: UUID of the patient.
            db: Async SQLAlchemy session.
            limit: Maximum number of encounters to return.

        Returns:
            List of Encounter ORM instances, newest first.
        """
        result = await db.execute(
            select(Encounter)
            .where(Encounter.patient_id == patient_id)
            .order_by(Encounter.encounter_date.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def _load_prescriptions(
        self,
        patient_id: uuid.UUID,
        db: AsyncSession,
    ) -> list[Prescription]:
        """Fetch all active prescriptions for a patient.

        Args:
            patient_id: UUID of the patient.
            db: Async SQLAlchemy session.

        Returns:
            List of active Prescription ORM instances.
        """
        result = await db.execute(
            select(Prescription).where(
                Prescription.patient_id == patient_id,
                Prescription.is_active == True,  # noqa: E712
            )
        )
        return list(result.scalars().all())

    async def _load_screening(
        self,
        patient_id: uuid.UUID,
        db: AsyncSession,
    ) -> ScreeningResult | None:
        """Fetch the most recent screening result for a patient.

        Args:
            patient_id: UUID of the patient.
            db: Async SQLAlchemy session.

        Returns:
            Most recent ScreeningResult or None if none exist.
        """
        result = await db.execute(
            select(ScreeningResult)
            .where(ScreeningResult.patient_id == patient_id)
            .order_by(ScreeningResult.screening_date.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()


source_assembler = SourceDataAssembler()
