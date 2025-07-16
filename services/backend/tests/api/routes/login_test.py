from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Project, ProjectUser
from pytest_mock import MockerFixture
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.api.routes.auth import LoginRequestBody
from services.backend.tests.conftest import TestingClientType


async def test_login_new_user_creates_project(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("services.backend.src.utils.jwt.encode", return_value="jwt_token")
    verify_mock = AsyncMock(return_value={"uid": firebase_uid})
    mocker.patch(
        "services.backend.src.api.routes.auth.verify_id_token",
        verify_mock,
    )

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"

    async with async_session_maker() as session:
        project_user = await session.scalar(select(ProjectUser).where(ProjectUser.firebase_uid == firebase_uid))
        assert project_user is not None
        assert project_user.role == UserRoleEnum.OWNER

        project = await session.scalar(select(Project).where(Project.id == project_user.project_id))
        assert project is not None
        assert project.name == "New Research Project"


async def test_login_existing_user_keeps_project(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("services.backend.src.utils.jwt.encode", return_value="jwt_token")
    verify_mock = AsyncMock(return_value={"uid": firebase_uid})
    mocker.patch(
        "services.backend.src.api.routes.auth.verify_id_token",
        verify_mock,
    )

    await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))

    async with async_session_maker() as session:
        project_user = await session.scalar(select(ProjectUser).where(ProjectUser.firebase_uid == firebase_uid))
        assert project_user is not None
        original_project_id = project_user.project_id

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"

    async with async_session_maker() as session:
        project_user = await session.scalar(select(ProjectUser).where(ProjectUser.firebase_uid == firebase_uid))
        assert project_user is not None
        assert project_user.project_id == original_project_id
