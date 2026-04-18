import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from core.models.base import Base
from core.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    personal_codebook: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
    clinic_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    clinic_address: Mapped[str | None] = mapped_column(String(200), nullable=True)
    clinic_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
