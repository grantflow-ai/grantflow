from http import HTTPStatus
from typing import Any

from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Workspace, WorkspaceUser
from pytest_mock import MockerFixture
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.api.routes.auth import LoginRequestBody
from services.backend.tests.conftest import TestingClientType


async def test_login_new_user_creates_workspace(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("jwt.encode", return_value="jwt_token")
    mocker.patch("services.backend.src.utils.firebase.verify_id_token", return_value={"uid": firebase_uid})

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"

    async with async_session_maker() as session:
        workspace_user = await session.scalar(select(WorkspaceUser).where(WorkspaceUser.firebase_uid == firebase_uid))
        assert workspace_user is not None
        assert workspace_user.role == UserRoleEnum.OWNER

        workspace = await session.scalar(select(Workspace).where(Workspace.id == workspace_user.workspace_id))
        assert workspace is not None
        assert workspace.name == "default"


async def test_login_existing_user_keeps_workspace(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("jwt.encode", return_value="jwt_token")
    mocker.patch("services.backend.src.utils.firebase.verify_id_token", return_value={"uid": firebase_uid})

    await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))

    async with async_session_maker() as session:
        workspace_user = await session.scalar(select(WorkspaceUser).where(WorkspaceUser.firebase_uid == firebase_uid))
        assert workspace_user is not None
        original_workspace_id = workspace_user.workspace_id

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"

    async with async_session_maker() as session:
        workspace_user = await session.scalar(select(WorkspaceUser).where(WorkspaceUser.firebase_uid == firebase_uid))
        assert workspace_user is not None
        assert workspace_user.workspace_id == original_workspace_id
