"""APScheduler 설정 — 정기 작업 등록 및 생명주기 관리."""

from __future__ import annotations

import logging
import shutil
from datetime import date
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    """모듈 전역 스케줄러 인스턴스를 반환한다 (lazy init)."""
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="Asia/Seoul")
    return _scheduler


# ── Job: DB 백업 ──────────────────────────────────────────────────────────────

def backup_database() -> None:
    """SQLite DB 파일을 backups/ 폴더에 날짜별로 복사한다.

    30일 초과 백업 파일은 자동 삭제한다.
    매일 23:00 실행.
    """
    source = Path("aro.db")
    if not source.exists():
        logger.warning("backup_database: aro.db 파일 없음, 건너뜀")
        return

    backup_dir = Path("backups")
    backup_dir.mkdir(exist_ok=True)

    dest = backup_dir / f"aro_{date.today().isoformat()}.db"
    shutil.copy2(source, dest)
    logger.info("DB 백업 완료: %s", dest)

    # 30일 초과 파일 정리
    cutoff_ordinal = date.today().toordinal() - 30
    for old_file in backup_dir.glob("aro_*.db"):
        try:
            # stem 예시: "aro_2026-01-01" → "2026-01-01"
            file_date = date.fromisoformat(old_file.stem[4:])
            if file_date.toordinal() < cutoff_ordinal:
                old_file.unlink()
                logger.info("오래된 백업 삭제: %s", old_file)
        except ValueError:
            pass  # 예상 외 파일명은 무시


# ── Job: 월간 보고서 자동 저장 ────────────────────────────────────────────────

async def auto_monthly_report() -> None:
    """전달(前達) 보고서 PDF를 reports/ 폴더에 자동 저장한다.

    매월 1일 01:00 실행. 전달 = today.month - 1 (1월이면 전년 12월).
    WeasyPrint 미설치 시 조용히 건너뛴다.
    """
    today = date.today()
    if today.month == 1:
        report_year, report_month = today.year - 1, 12
    else:
        report_year, report_month = today.year, today.month - 1

    try:
        from sqlalchemy import select

        from api.reports import _collect_stats, _render_pdf
        from core import database as db_module
        from core.models.user import User

        async with db_module.async_session() as session:
            user_result = await session.execute(select(User).limit(1))
            user = user_result.scalar_one_or_none()
            if user is None:
                logger.warning("auto_monthly_report: 등록된 사용자 없음, 건너뜀")
                return
            stats = await _collect_stats(session, report_year, report_month)

        pdf_bytes = _render_pdf(report_year, report_month, stats, user)

        reports_dir = Path("reports")
        reports_dir.mkdir(exist_ok=True)
        out_path = reports_dir / f"monthly_{report_year}{report_month:02d}.pdf"
        out_path.write_bytes(pdf_bytes)
        logger.info("월간 보고서 자동 저장: %s", out_path)

    except ImportError as e:
        logger.warning("auto_monthly_report: WeasyPrint 미설치, 건너뜀 (%s)", e)
    except Exception:
        logger.exception("auto_monthly_report 실패 (%d-%02d)", report_year, report_month)


# ── 스케줄러 설정 ─────────────────────────────────────────────────────────────

def setup_scheduler() -> AsyncIOScheduler:
    """두 정기 작업을 등록하고 스케줄러를 반환한다.

    - daily_db_backup: 매일 23:00
    - monthly_report_archive: 매월 1일 01:00
    """
    scheduler = get_scheduler()

    scheduler.add_job(
        backup_database,
        CronTrigger(hour=23, minute=0),
        id="daily_db_backup",
        replace_existing=True,
    )
    scheduler.add_job(
        auto_monthly_report,
        CronTrigger(day=1, hour=1, minute=0),
        id="monthly_report_archive",
        replace_existing=True,
    )

    return scheduler
