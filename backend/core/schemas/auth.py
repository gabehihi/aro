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

    model_config = {"from_attributes": True}
