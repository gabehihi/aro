from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.codebook import router as codebook_router
from api.documents import router as documents_router
from api.encounters import router as encounters_router
from api.patients import router as patients_router
from api.polypharmacy import router as polypharmacy_router
from api.screening import router as screening_router
from api.visits import router as visits_router
from core.database import get_db
from core.models.user import User
from core.schemas.auth import TokenResponse, UserResponse
from core.security import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/api/v1")
router.include_router(patients_router)
router.include_router(codebook_router)
router.include_router(encounters_router)
router.include_router(documents_router)
router.include_router(polypharmacy_router)
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
