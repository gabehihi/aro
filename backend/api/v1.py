from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.codebook import router as codebook_router
from api.dashboard import router as dashboard_router
from api.documents import router as documents_router
from api.encounters import router as encounters_router
from api.patients import router as patients_router
from api.polypharmacy import router as polypharmacy_router
from api.prescriptions import router as prescriptions_router
from api.reports import router as reports_router
from api.screening import router as screening_router
from api.visits import router as visits_router
from core.database import get_db
from core.models.user import User
from core.schemas.auth import TokenResponse, UserResponse, UserUpdateRequest
from core.security import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/api/v1")
router.include_router(dashboard_router)
router.include_router(patients_router)
router.include_router(prescriptions_router)
router.include_router(codebook_router)
router.include_router(encounters_router)
router.include_router(documents_router)
router.include_router(polypharmacy_router)
router.include_router(reports_router)
router.include_router(screening_router)
router.include_router(visits_router)


@router.post("/auth/login", response_model=TokenResponse, summary="로그인 (JWT 발급)")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token)


@router.get("/auth/me", response_model=UserResponse, summary="현재 사용자 정보 조회")
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/auth/me", response_model=UserResponse, summary="현재 사용자 정보 수정")
async def update_me(
    body: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    update_data = body.model_dump(exclude_unset=True)

    if "name" in update_data:
        normalized_name = (update_data["name"] or "").strip()
        if not normalized_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이름은 비워둘 수 없습니다",
            )
        update_data["name"] = normalized_name

    for field in ("clinic_name", "clinic_address", "clinic_phone"):
        if field in update_data:
            value = update_data[field]
            update_data[field] = value.strip() or None if isinstance(value, str) else value

    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)
