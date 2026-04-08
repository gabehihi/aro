from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.models.user import User
from core.schemas.codebook import (
    CodebookEntry,
    CodebookResolveResult,
    CodebookResponse,
    PersonalCodebookAdd,
)
from core.security import get_current_user
from modules.soap.codebook import codebook_service

router = APIRouter(prefix="/codebook", tags=["codebook"])


@router.get("", response_model=CodebookResponse, summary="병합 코드북 조회")
async def get_codebook(
    current_user: User = Depends(get_current_user),
) -> CodebookResponse:
    merged = codebook_service.get_merged_codebook(current_user.personal_codebook)
    return CodebookResponse(
        categories={
            cat: {k: CodebookEntry(**v) for k, v in entries.items()}
            for cat, entries in merged.items()
        }
    )


@router.get(
    "/resolve/{abbreviation}",
    response_model=CodebookResolveResult,
    summary="약어 해석",
)
async def resolve_abbreviation(
    abbreviation: str,
    current_user: User = Depends(get_current_user),
) -> CodebookResolveResult:
    return codebook_service.resolve(abbreviation, current_user.personal_codebook)


@router.post(
    "/personal",
    response_model=CodebookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="개인 약어 추가 (Layer 3)",
)
async def add_personal_abbreviation(
    body: PersonalCodebookAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CodebookResponse:
    new_cb = codebook_service.add_personal_entry(
        current_user.personal_codebook,
        body.category,
        body.abbreviation,
        body.entry.model_dump(exclude_none=True),
    )
    current_user.personal_codebook = new_cb
    await db.commit()
    await db.refresh(current_user)

    merged = codebook_service.get_merged_codebook(current_user.personal_codebook)
    return CodebookResponse(
        categories={
            cat: {k: CodebookEntry(**v) for k, v in entries.items()}
            for cat, entries in merged.items()
        }
    )


@router.delete(
    "/personal/{category}/{abbreviation}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="개인 약어 삭제 (Layer 3)",
)
async def delete_personal_abbreviation(
    category: str,
    abbreviation: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if not current_user.personal_codebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="개인 코드북이 비어있습니다",
        )
    cat_entries = current_user.personal_codebook.get(category, {})
    if abbreviation not in cat_entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"약어 '{abbreviation}'을(를) 찾을 수 없습니다",
        )

    new_cb = codebook_service.remove_personal_entry(
        current_user.personal_codebook, category, abbreviation
    )
    current_user.personal_codebook = new_cb
    await db.commit()
