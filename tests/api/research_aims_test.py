from http import HTTPStatus
from typing import Any
from uuid import UUID

from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api_types import (
    CreateResearchAimRequestBody,
    CreateResearchTaskRequestBody,
    ResearchAimResponse,
    UpdateResearchAimRequestBody,
    UpdateResearchTaskRequestBody,
)
from src.db.tables import ResearchAim, ResearchTask, UserRoleEnum, Workspace, WorkspaceUser
from src.utils.serialization import deserialize


async def test_create_research_aims_success(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    application: Any,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    request_body = [
        CreateResearchAimRequestBody(
            aim_number=1,
            title="Test Aim",
            description="Test Description",
            requires_clinical_trials=True,
            research_tasks=[
                CreateResearchTaskRequestBody(
                    task_number=1,
                    title="Test Task",
                    description="Test Task Description",
                )
            ],
        )
    ]

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications/{application.id}/research-aims",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED

    response_body = deserialize(response.text, list[ResearchAimResponse])
    assert len(response_body) == 1
    assert response_body[0]["title"] == request_body[0]["title"]
    assert response_body[0]["description"] == request_body[0]["description"]
    assert len(response_body[0]["research_tasks"]) == 1
    assert response_body[0]["research_tasks"][0]["title"] == request_body[0]["research_tasks"][0]["title"]


async def test_create_research_aims_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    application: Any,
) -> None:
    request_body = [
        CreateResearchAimRequestBody(
            aim_number=1,
            title="Test Aim",
            description="Test Description",
            requires_clinical_trials=True,
            research_tasks=[],
        )
    ]

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications/{application.id}/research-aims",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_retrieve_research_aims_success(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    application: Any,
    research_aim: ResearchAim,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications/{application.id}/research-aims",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK

    response_body = deserialize(response.text, list[ResearchAimResponse])
    assert len(response_body) == 1
    assert response_body[0]["title"] == research_aim.title
    assert response_body[0]["description"] == research_aim.description


async def test_retrieve_research_aims_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    application: Any,
) -> None:
    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications/{application.id}/research-aims",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_research_aim_success(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    research_aim: ResearchAim,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    request_body = UpdateResearchAimRequestBody(
        title="Updated Title",
        description="Updated Description",
    )

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/research-aims/{research_aim.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK

    async with async_session_maker() as session:
        updated_aim = await session.scalar(select(ResearchAim).where(ResearchAim.id == research_aim.id))
        assert updated_aim.title == request_body["title"]
        assert updated_aim.description == request_body["description"]


async def test_update_research_aim_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    research_aim: ResearchAim,
) -> None:
    request_body = UpdateResearchAimRequestBody(title="Updated Title")
    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/research-aims/{research_aim.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_research_task_success(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    research_task: ResearchTask,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    request_body = UpdateResearchTaskRequestBody(
        title="Updated Title",
        description="Updated Description",
    )

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/research-tasks/{research_task.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK

    async with async_session_maker() as session:
        updated_task = await session.scalar(select(ResearchTask).where(ResearchTask.id == research_task.id))
        assert updated_task.title == request_body["title"]
        assert updated_task.description == request_body["description"]


async def test_update_research_task_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
) -> None:
    task_id = UUID("00000000-0000-0000-0000-000000000000")
    request_body = UpdateResearchTaskRequestBody(title="Updated Title")
    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/research-tasks/{task_id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_research_aim_success(
    asgi_client: SanicASGITestClient,
    firebase_uid: str,
    workspace: Workspace,
    research_aim: ResearchAim,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/research-aims/{research_aim.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        deleted_aim = await session.scalar(select(ResearchAim).where(ResearchAim.id == research_aim.id))
        assert deleted_aim is None


async def test_delete_research_aim_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    research_aim: ResearchAim,
) -> None:
    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/research-aims/{research_aim.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED
