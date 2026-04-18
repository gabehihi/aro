import uuid

from pydantic import BaseModel

from core.models.enums import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    name: str
    role: UserRole
    is_active: bool
    clinic_name: str | None = None
    clinic_address: str | None = None
    clinic_phone: str | None = None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    name: str | None = None
    clinic_name: str | None = None
    clinic_address: str | None = None
    clinic_phone: str | None = None
