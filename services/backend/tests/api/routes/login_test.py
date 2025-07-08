from http import HTTPStatus
from typing import Any

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
    mocker.patch("jwt.encode", return_value="jwt_token")
    mocker.patch(
        "services.backend.src.utils.firebase.verify_id_token",
        return_value={"uid": firebase_uid},
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
        assert project.name == "default"


async def test_login_existing_user_keeps_project(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("jwt.encode", return_value="jwt_token")
    mocker.patch(
        "services.backend.src.utils.firebase.verify_id_token",
        return_value={"uid": firebase_uid},
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
