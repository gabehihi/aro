from __future__ import annotations

from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models.document import MedicalDocument
from core.models.encounter import Encounter
from core.models.follow_up_alert import FollowUpAlert
from core.models.patient import Patient
from core.models.screening import ScreeningResult
from core.models.user import User
from core.security import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get(
    "/monthly",
    summary="월간 보고서 PDF 다운로드",
    response_class=Response,
)
async def monthly_report(
    year: int = date.today().year,
    month: int = date.today().month,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="month는 1~12 사이여야 합니다")

    stats = await _collect_stats(db, year, month)

    try:
        pdf_bytes = _render_pdf(year, month, stats, current_user)
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail="PDF 렌더링 라이브러리 미설치. brew install pango 필요.",
        ) from e

    filename = f"monthly_report_{year}{month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get(
    "/monthly/stats",
    summary="월간 통계 JSON (PDF 없이 확인용)",
)
async def monthly_report_stats(
    year: int = date.today().year,
    month: int = date.today().month,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="month는 1~12 사이여야 합니다")
    return await _collect_stats(db, year, month)


async def _collect_stats(db: AsyncSession, year: int, month: int) -> dict:
    last_day = monthrange(year, month)[1]
    start = date(year, month, 1)
    end = date(year, month, last_day)

    total_patients = (await db.execute(select(func.count(Patient.id)))).scalar_one()

    new_patients = (
        await db.execute(
            select(func.count(Patient.id)).where(
                extract("year", Patient.created_at) == year,
                extract("month", Patient.created_at) == month,
            )
        )
    ).scalar_one()

    active_q = select(func.count(func.distinct(Encounter.patient_id))).where(
        Encounter.encounter_date >= start,
        Encounter.encounter_date <= end,
    )
    active_patients = (await db.execute(active_q)).scalar_one()

    total_encounters = (await db.execute(select(func.count(Encounter.id)))).scalar_one()

    encounters_month = (
        await db.execute(
            select(func.count(Encounter.id)).where(
                Encounter.encounter_date >= start,
                Encounter.encounter_date <= end,
            )
        )
    ).scalar_one()

    docs_month = (
        await db.execute(
            select(func.count(MedicalDocument.id)).where(
                extract("year", MedicalDocument.created_at) == year,
                extract("month", MedicalDocument.created_at) == month,
                MedicalDocument.issued_at.isnot(None),
            )
        )
    ).scalar_one()

    fu_month = (
        await db.execute(
            select(func.count(FollowUpAlert.id)).where(
                extract("year", FollowUpAlert.created_at) == year,
                extract("month", FollowUpAlert.created_at) == month,
            )
        )
    ).scalar_one()

    fu_resolved = (
        await db.execute(
            select(func.count(FollowUpAlert.id)).where(
                extract("year", FollowUpAlert.created_at) == year,
                extract("month", FollowUpAlert.created_at) == month,
                FollowUpAlert.resolved.is_(True),
            )
        )
    ).scalar_one()

    fu_rate = round(fu_resolved / fu_month * 100, 1) if fu_month else 0.0

    screenings_month = (
        await db.execute(
            select(func.count(ScreeningResult.id)).where(
                ScreeningResult.screening_date >= start,
                ScreeningResult.screening_date <= end,
            )
        )
    ).scalar_one()

    abnormal = (
        await db.execute(
            select(func.count(ScreeningResult.id)).where(
                ScreeningResult.screening_date >= start,
                ScreeningResult.screening_date <= end,
                ScreeningResult.follow_up_required.is_(True),
            )
        )
    ).scalar_one()

    abnormal_rate = round(abnormal / screenings_month * 100, 1) if screenings_month else 0.0

    return {
        "year": year,
        "month": month,
        "total_patients": total_patients,
        "new_patients_this_month": new_patients,
        "active_patients_this_month": active_patients,
        "total_encounters": total_encounters,
        "encounters_this_month": encounters_month,
        "documents_issued_this_month": docs_month,
        "followup_alerts_this_month": fu_month,
        "followup_resolved_this_month": fu_resolved,
        "followup_resolution_rate": fu_rate,
        "screenings_this_month": screenings_month,
        "abnormal_screenings": abnormal,
        "abnormal_rate": abnormal_rate,
    }


def _render_pdf(year: int, month: int, stats: dict, user: User) -> bytes:
    from pathlib import Path

    import weasyprint
    from jinja2 import Environment, FileSystemLoader

    template_dir = Path(__file__).parent.parent / "modules" / "documents" / "templates"
    jinja = Environment(loader=FileSystemLoader(str(template_dir)), autoescape=True)
    template = jinja.get_template("monthly_report.html")
    html_str = template.render(
        year=year,
        month=month,
        stats=stats,
        clinic_name=getattr(user, "clinic_name", "보건소"),
        generated_date=date.today().isoformat(),
    )
    return weasyprint.HTML(string=html_str).write_pdf()
