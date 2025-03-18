from http import HTTPStatus
from typing import Any, Final
from unittest.mock import AsyncMock

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api_types import (
    UpdateApplicationRequestBody,
)
from src.db.enums import UserRoleEnum
from src.db.tables import (
    GrantApplication,
    GrantTemplate,
    Workspace,
    WorkspaceUser,
)
from src.utils.db import retrieve_application
from tests.conftest import TestingClientType
from tests.factories import CreateApplicationRequestBodyFactory

TEST_CFP_URL: Final[str] = "https://grants.nih.gov/grants/guide/rfa-files/RFA-DC-25-005.html"


async def test_create_application(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    signal_dispatch_mock: AsyncMock,
    mock_extract_webpage_content: AsyncMock,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    request_body = CreateApplicationRequestBodyFactory.build(cfp_url=TEST_CFP_URL)

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    response_body = response.json()
    assert response_body["id"]

    grant_application = await retrieve_application(
        session_maker=async_session_maker, application_id=response_body["id"]
    )

    assert grant_application.title == request_body["title"]

    signal_calls = [
        call for call in signal_dispatch_mock.mock_calls if call.args[0] == "handle_generate_grant_template"
    ]
    assert len(signal_calls) == 1


async def test_retrieve_application_text_processing(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/content",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    response_body = response.json()
    assert response_body["status"] == "generating"


async def test_retrieve_application_text_complete(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/content",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK


async def test_update_application_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    update_data = UpdateApplicationRequestBody(title="Updated Title")

    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK

    async with async_session_maker() as session:
        updated = await session.scalar(select(GrantApplication).where(GrantApplication.id == grant_application.id))
        assert updated.title == update_data["title"]


async def test_update_application_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    update_data = UpdateApplicationRequestBody(title="Updated Title")

    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_application_bad_request(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_delete_application_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    response = await test_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == grant_application.id))
        assert result is None


async def test_delete_application_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
