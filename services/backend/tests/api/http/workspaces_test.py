from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any

import pytest
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Workspace, WorkspaceUser
from services.backend.src.api.http.workspaces import UpdateWorkspaceRequestBody
from services.backend.tests.conftest import TestingClientType
from sqlalchemy import insert, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    CreateWorkspaceRequestBodyFactory,
    GrantApplicationFactory,
    WorkspaceFactory,
)


async def test_create_workspace_success(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    request_body = CreateWorkspaceRequestBodyFactory.build()
    response = await test_client.post(
        "/workspaces",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    response_body = response.json()
    assert response_body["id"]

    async with async_session_maker() as session, session.begin():
        workspace = await session.scalar(select(Workspace).where(Workspace.id == response_body["id"]))

        assert workspace.name == request_body["name"]
        assert workspace.description == request_body["description"]
        assert workspace.logo_url == request_body["logo_url"]


async def test_create_workspace_failure(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.post(
        "/workspaces",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


async def test_retrieve_workspaces(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    workspaces_data = WorkspaceFactory.batch(4)
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

    response = await test_client.get(
        "/workspaces",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    values = response.json()
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


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER))
async def test_retrieve_workspace_success(
    test_client: TestingClientType,
    workspace: Workspace,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        if user_role == UserRoleEnum.OWNER:
            await session.execute(
                insert(WorkspaceUser).values(
                    workspace_id=workspace.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.OWNER.value,
                )
            )
        elif user_role == UserRoleEnum.ADMIN:
            await session.execute(
                insert(WorkspaceUser).values(
                    workspace_id=workspace.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN.value,
                )
            )
        else:
            await session.execute(
                insert(WorkspaceUser).values(
                    workspace_id=workspace.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.MEMBER.value,
                )
            )
        await session.commit()

    grant_app1 = GrantApplicationFactory.build(
        workspace_id=workspace.id,
        title="Application 1",
        completed_at=datetime.now(UTC),
    )
    grant_app2 = GrantApplicationFactory.build(
        workspace_id=workspace.id,
        title="Application 2",
        completed_at=None,
    )

    async with async_session_maker() as session, session.begin():
        session.add(grant_app1)
        session.add(grant_app2)
        await session.commit()

    response = await test_client.get(
        f"/workspaces/{workspace.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response_data = response.json()
    assert response_data["id"] == str(workspace.id)
    assert response_data["name"] == workspace.name
    assert response_data["description"] == workspace.description
    assert response_data["logo_url"] == workspace.logo_url
    assert response_data["role"] == user_role.value

    grant_applications = response_data["grant_applications"]
    assert len(grant_applications) == 2

    app_ids = {str(grant_app1.id), str(grant_app2.id)}
    response_app_ids = {app["id"] for app in grant_applications}
    assert app_ids == response_app_ids

    for app in grant_applications:
        if app["id"] == str(grant_app1.id):
            assert app["title"] == "Application 1"
            assert app["completed_at"] is not None
        elif app["id"] == str(grant_app2.id):
            assert app["title"] == "Application 2"
            assert app["completed_at"] is None


async def test_retrieve_workspace_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


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
async def test_update_workspace_success(
    test_client: TestingClientType,
    workspace: Workspace,
    user_role: UserRoleEnum,
    request_body: UpdateWorkspaceRequestBody,
    attrs: tuple[str, ...],
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        if user_role == UserRoleEnum.OWNER:
            await session.execute(
                insert(WorkspaceUser).values(
                    workspace_id=workspace.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.OWNER.value,
                )
            )
        else:
            await session.execute(
                insert(WorkspaceUser).values(
                    workspace_id=workspace.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN.value,
                )
            )
        await session.commit()

    response = await test_client.patch(
        f"/workspaces/{workspace.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    async with async_session_maker() as session, session.begin():
        workspace = await session.scalar(select(Workspace).where(Workspace.id == workspace.id))

    for attr in attrs:
        assert getattr(workspace, attr) == request_body[attr]  # type: ignore[literal-required]


async def test_update_workspace_failure_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    workspace_member_user: None,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.patch(
        f"/workspaces/{workspace.id}",
        json=UpdateWorkspaceRequestBody(name="new_name"),
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_delete_workspace_success(
    test_client: TestingClientType,
    workspace: Workspace,
    workspace_owner_user: None,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    with pytest.raises(NoResultFound):
        async with async_session_maker() as session, session.begin():
            await session.get_one(Workspace, workspace.id)


@pytest.mark.parametrize("user_role", (UserRoleEnum.ADMIN, UserRoleEnum.MEMBER))
async def test_delete_workspace_failure_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        if user_role == UserRoleEnum.ADMIN:
            await session.execute(
                insert(WorkspaceUser).values(
                    workspace_id=workspace.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN.value,
                )
            )
        else:
            await session.execute(
                insert(WorkspaceUser).values(
                    workspace_id=workspace.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.MEMBER.value,
                )
            )
        await session.commit()

    response = await test_client.delete(
        f"/workspaces/{workspace.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text
