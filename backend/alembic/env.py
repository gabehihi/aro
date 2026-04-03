"""
Alembic env.py 템플릿.
`uv run alembic init --template async alembic` 실행 후
alembic/env.py 를 이 파일 내용으로 교체하세요.
"""

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# backend/ 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_settings  # noqa: E402
from core.models import Base  # noqa: E402  (모든 모델 임포트 포함)
from core.models.encryption import EncryptedString  # noqa: E402


def render_item(type_, obj, autogen_context):
    """EncryptedString을 마이그레이션에서 sa.String(512)로 렌더링"""
    if isinstance(obj, EncryptedString):
        return "sa.String(length=512)"
    return False


# Alembic Config 객체
config = context.config

# logging 설정
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return get_settings().DATABASE_URL


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # SQLite ALTER TABLE 지원
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,  # SQLite ALTER TABLE 지원
        render_item=render_item,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(get_url())
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
