from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any

from pytest_mock import MockerFixture
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api_types import (
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    TableIdResponse,
    UpdateApplicationRequestBody,
)
from src.db.enums import UserRoleEnum
from src.db.tables import (
    Application,
    GrantCfp,
    Workspace,
    WorkspaceUser,
)
from src.utils.serialization import deserialize, serialize
from tests.factories import CreateApplicationRequestBodyFactory


async def test_create_application_api_request_success(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    cfp: GrantCfp,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    data = CreateApplicationRequestBodyFactory.build(workspace_id=str(workspace.id), cfp_id=str(cfp.id))

    files = {
        "file1": (b"test content 1", "application/pdf"),
        "file2": (b"test content 2", "application/msword"),
    }

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications",
        data={"data": serialize(data).decode(), **files},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED
    response_body = deserialize(response.body, TableIdResponse)

    async with async_session_maker() as session:
        application = await session.scalar(select(Application).where(Application.id == response_body["id"]))
        assert application.title == data["title"]


async def test_create_application_no_files_success(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    cfp: GrantCfp,
    mocker: MockerFixture,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    data = CreateApplicationRequestBodyFactory.build(workspace_id=str(workspace.id), cfp_id=str(cfp.id))

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications",
        data={"data": serialize(data).decode()},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED


async def test_retrieve_application_text_processing(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    application: Application,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications/{application.id}/content",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    response_body = deserialize(response.body, ApplicationDraftProcessingResponse)
    assert response_body["status"] == "generating"


async def test_retrieve_application_text_complete(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    application: Application,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )
        await session.execute(
            update(Application)
            .where(Application.id == application.id)
            .values({"text": "Generated text", "completed_at": datetime.now(tz=UTC)})
        )

    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications/{application.id}/content",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    response_body = deserialize(response.body, ApplicationDraftCompleteResponse)
    assert response_body["status"] == "complete"
    assert response_body["text"] == "Generated text"


async def test_update_application_success(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    application: Application,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    update_data = UpdateApplicationRequestBody(
        title="Updated Title", significance="Updated Significance", innovation="Updated Innovation"
    )

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/applications/{application.id}",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        updated = await session.scalar(select(Application).where(Application.id == application.id))
        assert updated.title == update_data["title"]
        assert updated.significance == update_data["significance"]
        assert updated.innovation == update_data["innovation"]


async def test_update_application_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    application: Application,
) -> None:
    update_data = UpdateApplicationRequestBody(title="Updated Title")

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/applications/{application.id}",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_application_success(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    application: Application,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )

    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/applications/{application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        result = await session.scalar(select(Application).where(Application.id == application.id))
        assert result is None


async def test_delete_application_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    application: Application,
) -> None:
    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/applications/{application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
