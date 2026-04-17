"""APScheduler 잡 함수 테스트."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import pytest


# ── backup_database ───────────────────────────────────────────────────────────

def test_backup_creates_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """aro.db가 있으면 backups/aro_YYYY-MM-DD.db 생성."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "aro.db").write_bytes(b"fake-db")

    from core.scheduler import backup_database

    backup_database()

    backup_dir = tmp_path / "backups"
    assert backup_dir.exists()
    files = list(backup_dir.glob("aro_*.db"))
    assert len(files) == 1
    assert files[0].read_bytes() == b"fake-db"


def test_backup_no_source_skips_silently(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """aro.db가 없으면 예외 없이 건너뛴다."""
    monkeypatch.chdir(tmp_path)

    from core.scheduler import backup_database

    backup_database()  # should not raise

    assert not (tmp_path / "backups").exists()


def test_backup_removes_old_files(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """31일 이전 백업 파일은 삭제된다."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "aro.db").write_bytes(b"db")

    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()

    old_date = (date.today() - timedelta(days=31)).isoformat()
    old_file = backup_dir / f"aro_{old_date}.db"
    old_file.write_bytes(b"old")

    from core.scheduler import backup_database

    backup_database()

    assert not old_file.exists(), "31일 이전 파일은 삭제되어야 한다"
    today_files = list(backup_dir.glob(f"aro_{date.today().isoformat()}.db"))
    assert len(today_files) == 1, "오늘 백업은 생성되어야 한다"


def test_backup_keeps_recent_files(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """29일 이내 백업은 삭제하지 않는다."""
    monkeypatch.chdir(tmp_path)
    (tmp_path / "aro.db").write_bytes(b"db")

    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()

    recent_date = (date.today() - timedelta(days=29)).isoformat()
    recent_file = backup_dir / f"aro_{recent_date}.db"
    recent_file.write_bytes(b"recent")

    from core.scheduler import backup_database

    backup_database()

    assert recent_file.exists(), "29일 이내 파일은 유지되어야 한다"


# ── setup_scheduler ───────────────────────────────────────────────────────────

def test_setup_scheduler_registers_jobs() -> None:
    """setup_scheduler()가 두 잡을 등록한다."""
    from core.scheduler import setup_scheduler

    scheduler = setup_scheduler()
    job_ids = {job.id for job in scheduler.get_jobs()}
    assert "daily_db_backup" in job_ids
    assert "monthly_report_archive" in job_ids
