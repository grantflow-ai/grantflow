from http import HTTPStatus
from typing import Any
from uuid import UUID

from packages.db.src.tables import (
    GrantApplication,
    Workspace,
)
from services.backend.tests.conftest import TestingClientType
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker


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
