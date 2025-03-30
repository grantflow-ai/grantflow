from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any, Final
from unittest.mock import AsyncMock
from uuid import UUID

from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.api_types import (
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
from tests.test_utils import FIXTURES_FOLDER

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

    mock_extract_webpage_content.return_value = "Sample CFP content"

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications",
        data={"title": "abc"},
        files={"cfp_file": ("nih.md", (FIXTURES_FOLDER / "cfps" / "nih.md").read_bytes())},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    response_body = response.json()
    assert response_body["id"]

    grant_application = await retrieve_application(
        session_maker=async_session_maker, application_id=response_body["id"]
    )

    assert grant_application.title == "abc"

    signal_calls = [
        call for call in signal_dispatch_mock.mock_calls if call.args[0] == "grant_template_generation_pipeline_handler"
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

        await session.execute(
            update(GrantApplication).where(GrantApplication.id == grant_application.id).values({"text": None})
        )

    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/content",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
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
        await session.execute(
            update(GrantApplication)
            .where(GrantApplication.id == grant_application.id)
            .values({"text": "abc", "completed_at": datetime.now(tz=UTC)})
        )
        await session.commit()

    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/content",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    response_body = response.json()
    assert response_body["status"] == "complete"
    assert response_body["id"] == str(grant_application.id)
    assert "text" in response_body


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

    assert response.status_code == HTTPStatus.OK, response.text
    response_body = response.json()
    assert response_body["id"] == str(grant_application.id)
    assert response_body["title"] == update_data["title"]

    async with async_session_maker() as session:
        updated = await session.scalar(select(GrantApplication).where(GrantApplication.id == grant_application.id))
        assert updated.title == update_data["title"]


async def test_update_application_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    update_data = UpdateApplicationRequestBody(title="Updated Title")

    different_workspace_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.patch(
        f"/workspaces/{different_workspace_id}/applications/{grant_application.id}",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


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

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


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

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == grant_application.id))
        assert result is None


async def test_delete_application_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    different_workspace_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.delete(
        f"/workspaces/{different_workspace_id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_retrieve_application(
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
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    response_body = response.json()
    assert response_body["id"] == str(grant_application.id)
    assert response_body["title"] == grant_application.title
    assert "grant_template" in response_body


async def test_retrieve_application_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    different_workspace_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.get(
        f"/workspaces/{different_workspace_id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text
