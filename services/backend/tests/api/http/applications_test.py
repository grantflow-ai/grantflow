from http import HTTPStatus
from typing import Any, Final
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from db.src.tables import (
    GrantApplication,
    Workspace,
)
from src.api.http.grant_applications import UpdateApplicationRequestBody
from tests.conftest import TestingClientType

TEST_CFP_URL: Final[str] = "https://grants.nih.gov/grants/guide/rfa-files/RFA-DC-25-005.html"


async def test_update_application_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
) -> None:
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
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
) -> None:
    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


async def test_delete_application_success(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
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
