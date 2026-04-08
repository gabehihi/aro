import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import UserRole
from core.models.user import User
from core.security import create_access_token, hash_password
from modules.soap.codebook import CodebookService


async def _create_doctor(db: AsyncSession) -> tuple[User, str]:
    user = User(
        username="doctor_cb",
        hashed_password=hash_password("pass1234"),
        name="코드북의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return user, token


# --- Unit tests for CodebookService ---


def test_resolve_builtin() -> None:
    svc = CodebookService()
    result = svc.resolve("HTN")
    assert result.entry is not None
    assert result.layer == "builtin"
    assert result.entry.kcd == "I10"


def test_resolve_institution_overrides_builtin() -> None:
    svc = CodebookService()
    # hHTN is only in institution layer
    result = svc.resolve("hHTN")
    assert result.entry is not None
    assert result.layer == "institution"


def test_resolve_personal_overrides_all() -> None:
    svc = CodebookService()
    personal = {"diagnosis": {"HTN": {"full": "My Custom HTN", "kcd": "I10.custom"}}}
    result = svc.resolve("HTN", personal_codebook=personal)
    assert result.entry is not None
    assert result.layer == "personal"
    assert result.entry.full == "My Custom HTN"


def test_resolve_unknown() -> None:
    svc = CodebookService()
    result = svc.resolve("XYZNOTFOUND")
    assert result.entry is None
    assert result.layer is None


def test_get_merged_codebook() -> None:
    svc = CodebookService()
    merged = svc.get_merged_codebook()
    assert "diagnosis" in merged
    assert "HTN" in merged["diagnosis"]
    assert "medication" in merged


def test_get_prompt_text() -> None:
    svc = CodebookService()
    text = svc.get_prompt_text()
    assert "## 의료 약어 코드북" in text
    assert "HTN" in text
    assert "KCD:I10" in text


def test_add_personal_entry() -> None:
    new_cb = CodebookService.add_personal_entry(
        None,
        "medication",
        "myDrug",
        {"full": "My Custom Drug"},
    )
    assert new_cb["medication"]["myDrug"]["full"] == "My Custom Drug"


def test_remove_personal_entry() -> None:
    cb = {"medication": {"myDrug": {"full": "My Custom Drug"}}}
    new_cb = CodebookService.remove_personal_entry(cb, "medication", "myDrug")
    assert "medication" not in new_cb  # empty category removed


# --- API integration tests ---


@pytest.mark.asyncio
async def test_get_codebook(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    resp = await client.get(
        "/api/v1/codebook",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "categories" in data
    assert "diagnosis" in data["categories"]


@pytest.mark.asyncio
async def test_resolve_api(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    resp = await client.get(
        "/api/v1/codebook/resolve/DM",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["layer"] == "builtin"
    assert data["entry"]["kcd"] == "E11"


@pytest.mark.asyncio
async def test_add_personal(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.post(
        "/api/v1/codebook/personal",
        json={
            "category": "medication",
            "abbreviation": "myPill",
            "entry": {"full": "My Custom Pill (내 알약)"},
        },
        headers=headers,
    )
    assert resp.status_code == 201

    # Verify it resolves as personal layer
    resp2 = await client.get("/api/v1/codebook/resolve/myPill", headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["layer"] == "personal"


@pytest.mark.asyncio
async def test_delete_personal(client: AsyncClient, db_session: AsyncSession) -> None:
    _, token = await _create_doctor(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    # Add first
    await client.post(
        "/api/v1/codebook/personal",
        json={
            "category": "medication",
            "abbreviation": "tempDrug",
            "entry": {"full": "Temporary Drug"},
        },
        headers=headers,
    )

    # Delete
    resp = await client.delete(
        "/api/v1/codebook/personal/medication/tempDrug",
        headers=headers,
    )
    assert resp.status_code == 204

    # Verify gone from personal
    resp2 = await client.get("/api/v1/codebook/resolve/tempDrug", headers=headers)
    assert resp2.json()["layer"] is None


@pytest.mark.asyncio
async def test_codebook_unauthorized(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/codebook")
    assert resp.status_code == 401
