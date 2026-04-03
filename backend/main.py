import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from api.v1 import router as v1_router
from config import get_settings
from core import database as db_module
from core.models import Base, User
from core.models.enums import UserRole
from core.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


async def _seed_admin() -> None:
    """users 테이블이 비어있으면 기본 admin 계정을 생성한다."""
    if not settings.INITIAL_ADMIN_PASSWORD:
        logger.warning("INITIAL_ADMIN_PASSWORD 미설정 — admin 시딩 건너뜀")
        return

    async with db_module.async_session() as session:
        result = await session.execute(select(User).limit(1))
        if result.scalar_one_or_none() is not None:
            return  # 이미 사용자 존재

        admin = User(
            username="admin",
            hashed_password=hash_password(settings.INITIAL_ADMIN_PASSWORD),
            name="관리자",
            role=UserRole.admin,
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        logger.info("기본 admin 계정 생성 완료 (username: admin)")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("DB 테이블 생성 시작...")
    async with db_module.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("DB 테이블 생성 완료")

    await _seed_admin()

    yield

    # Shutdown
    await db_module.engine.dispose()
    logger.info("DB 연결 종료")


app = FastAPI(
    title="aro API",
    description="충청북도 보건소/보건지소 전용 AI 어시스턴트",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    return {"status": "ok", "app": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )
