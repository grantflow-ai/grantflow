from http import HTTPStatus
from typing import Any

import pytest
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import insert, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api_types import (
    CreateWorkspaceRequestBody,
    UpdateWorkspaceRequestBody,
    WorkspaceResponse,
)
from src.db.tables import UserRoleEnum, Workspace, WorkspaceUser
from src.utils.serialization import deserialize
from tests.factories import WorkspaceFactory


async def test_create_workspace_api_request_success(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    request_body = CreateWorkspaceRequestBody(
        name="test_workspace", description="test_description", logo_url="logo_url"
    )
    _, response = await asgi_client.post(
        "/workspaces",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED
    response_body = deserialize(response.text, WorkspaceResponse)
    assert response_body["id"]

    async with async_session_maker() as session, session.begin():
        workspace = await session.scalar(select(Workspace).where(Workspace.id == response_body["id"]))

        assert workspace.name == response_body["name"]
        assert workspace.description == response_body["description"]
        assert workspace.logo_url == response_body["logo_url"]


async def test_create_workspace_api_request_failure(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    _, response = await asgi_client.post(
        "/workspaces",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_retrieve_workspaces_api_request(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    workspaces_data = WorkspaceFactory.batch(4, users=[])
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Workspace).values(
                [
                    {"id": value.id, "name": value.name, "description": value.description, "logo_url": value.logo_url}
                    for value in workspaces_data
                ]
            )
        )
        await session.commit()

    workspaces_with_user_access = workspaces_data[:3]
    workspace_without_user_access = workspaces_data[3]

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                [
                    {
                        "workspace_id": workspaces_with_user_access[0].id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER.value,
                    },
                    {
                        "workspace_id": workspaces_with_user_access[1].id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.ADMIN.value,
                    },
                    {
                        "workspace_id": workspaces_with_user_access[2].id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.MEMBER.value,
                    },
                ]
            )
        )
        await session.commit()

    _, response = await asgi_client.get(
        "/workspaces",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    values = deserialize(response.text, list[WorkspaceResponse])
    assert len(values) == 3

    for workspace in workspaces_with_user_access:
        assert any(
            value["id"] == str(workspace.id)
            and value["name"] == workspace.name
            and value["description"] == workspace.description
            and value["logo_url"] == workspace.logo_url
            for value in values
        )

    assert all(value["id"] != str(workspace_without_user_access.id) for value in values)


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN))
@pytest.mark.parametrize(
    "request_body, attrs",
    (
        (UpdateWorkspaceRequestBody(name="new_name"), ("name",)),
        (UpdateWorkspaceRequestBody(description="new_description"), ("description",)),
        (UpdateWorkspaceRequestBody(logo_url="new_logo_url"), ("logo_url",)),
        (UpdateWorkspaceRequestBody(name="new_name", description="new_description"), ("name", "description")),
        (UpdateWorkspaceRequestBody(name="new_name", logo_url="new_logo_url"), ("name", "logo_url")),
        (
            UpdateWorkspaceRequestBody(description="new_description", logo_url="new_logo_url"),
            ("description", "logo_url"),
        ),
    ),
)
async def test_update_workspace_api_request_success(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    user_role: UserRoleEnum,
    request_body: UpdateWorkspaceRequestBody,
    attrs: tuple[str, ...],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": user_role.value}
            )
        )

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK

    async with async_session_maker() as session, session.begin():
        workspace = await session.scalar(select(Workspace).where(Workspace.id == workspace.id))

    for attr in attrs:
        assert getattr(workspace, attr) == request_body[attr]  # type: ignore[literal-required]


async def test_update_workspace_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}",
        json=UpdateWorkspaceRequestBody(name="new_name"),
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_workspace_api_request_success(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.OWNER.value}
            )
        )

    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    with pytest.raises(NoResultFound):
        async with async_session_maker() as session, session.begin():
            await session.get_one(Workspace, workspace.id)


@pytest.mark.parametrize("user_role", (UserRoleEnum.ADMIN, UserRoleEnum.MEMBER))
async def test_delete_workspace_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    user_role: UserRoleEnum,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": user_role.value}
            )
        )

    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED
