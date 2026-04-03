import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.models.enums import UserRole
from core.models.user import User
from core.security import hash_password


async def _create_test_user(db: AsyncSession) -> User:
    user = User(
        username="testdoc",
        hashed_password=hash_password("testpass123"),
        name="테스트의사",
        role=UserRole.doctor,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_test_user(db_session)
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "testdoc", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_test_user(db_session)
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "testdoc", "password": "wrongpass"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_test_user(db_session)
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "testdoc", "password": "testpass123"},
    )
    token = login_resp.json()["access_token"]

    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    data = me_resp.json()
    assert data["username"] == "testdoc"
    assert data["role"] == "doctor"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
