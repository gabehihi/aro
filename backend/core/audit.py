"""감사 로그 헬퍼 — 환자 정보 및 문서 접근 이력을 audit_logs에 저장한다."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.audit_log import AuditLog
from core.models.user import User

logger = logging.getLogger(__name__)


async def log_action(
    db: AsyncSession,
    user: User,
    action: str,
    resource_type: str,
    resource_id: str,
    details: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """audit_logs 테이블에 한 행을 기록하고 커밋한다.

    메인 연산이 성공한 뒤에 호출한다.
    실패해도 예외를 전파하지 않는다 (감사 실패가 주 연산을 망치지 않도록).

    Args:
        action: "read" | "create" | "update" | "delete" | "issue" | "download"
        resource_type: "patient" | "encounter" | "document"
        resource_id: 대상 리소스의 UUID 문자열.
    """
    ip: str | None = None
    if request is not None:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        elif request.client:
            ip = request.client.host

    try:
        db.add(
            AuditLog(
                user_id=user.id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=ip,
            )
        )
        await db.commit()
    except Exception:
        logger.exception(
            "감사 로그 기록 실패 (action=%s, resource=%s/%s)",
            action,
            resource_type,
            resource_id,
        )
        await db.rollback()
