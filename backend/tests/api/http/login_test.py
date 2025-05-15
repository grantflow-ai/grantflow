from http import HTTPStatus
from typing import Any

from pytest_mock import MockerFixture
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.http.auth import LoginRequestBody
from src.db.enums import UserRoleEnum
from src.db.tables import Workspace, WorkspaceUser
from tests.conftest import TestingClientType


async def test_login_new_user_creates_workspace(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("jwt.encode", return_value="jwt_token")
    mocker.patch("src.utils.firebase.verify_id_token", return_value={"uid": firebase_uid})
    mocker.patch("src.api.http.auth.get_session_maker", return_value=async_session_maker)

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"

    # Verify that a default workspace was created for the new user
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
    mocker.patch("src.utils.firebase.verify_id_token", return_value={"uid": firebase_uid})
    mocker.patch("src.api.http.auth.get_session_maker", return_value=async_session_maker)

    # First login to create workspace
    await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))

    # Get the workspace ID from first login
    async with async_session_maker() as session:
        workspace_user = await session.scalar(select(WorkspaceUser).where(WorkspaceUser.firebase_uid == firebase_uid))
        original_workspace_id = workspace_user.workspace_id

    # Second login
    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"

    # Verify that the same workspace is maintained
    async with async_session_maker() as session:
        workspace_user = await session.scalar(select(WorkspaceUser).where(WorkspaceUser.firebase_uid == firebase_uid))
        assert workspace_user is not None
        assert workspace_user.workspace_id == original_workspace_id
