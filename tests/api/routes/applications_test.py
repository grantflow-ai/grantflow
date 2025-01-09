from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any, Final
from unittest.mock import AsyncMock

from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.utils import retrieve_application
from src.api_types import (
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    UpdateApplicationRequestBody,
)
from src.constants import TEMPLATE_VARIABLE_PATTERN
from src.db.enums import UserRoleEnum
from src.db.tables import (
    GrantApplication,
    GrantTemplate,
    Workspace,
    WorkspaceUser,
)
from src.utils.serialization import deserialize, serialize
from tests.factories import CreateApplicationRequestBodyFactory, TextGenerationResultFactory

TEST_CFP_URL: Final[str] = "https://grants.nih.gov/grants/guide/rfa-files/RFA-DC-25-005.html"


async def test_create_application(
    asgi_client: SanicASGITestClient,
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

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications",
        data={
            "data": serialize(request_body).decode(),
        },
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    response_body = response.json
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
    asgi_client: SanicASGITestClient,
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

    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/content",
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
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
) -> None:
    generation_results = [
        TextGenerationResultFactory.build(
            type=section_type,
        )
        for section_type in TEMPLATE_VARIABLE_PATTERN.findall(grant_template.template)
    ]

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )
        await session.execute(
            update(GrantApplication)
            .where(GrantApplication.id == grant_application.id)
            .values({"completed_at": datetime.now(tz=UTC), "text_generation_results": generation_results})
        )
        await session.commit()

    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/content",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    response_body = deserialize(response.body, ApplicationDraftCompleteResponse)

    expected_result = grant_template.template
    for generation_result in generation_results:
        expected_result = expected_result.replace(generation_result["type"], generation_result["content"])

    expected_result = expected_result.replace("{", "").replace("}", "")

    assert response_body["status"] == "complete"
    assert response_body["text"] == expected_result


async def test_update_application_success(
    asgi_client: SanicASGITestClient,
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

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK

    async with async_session_maker() as session:
        updated = await session.scalar(select(GrantApplication).where(GrantApplication.id == grant_application.id))
        assert updated.title == update_data["title"]


async def test_update_application_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    update_data = UpdateApplicationRequestBody(title="Updated Title")

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_application_bad_request(
    asgi_client: SanicASGITestClient,
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

    _, response = await asgi_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_delete_application_success(
    asgi_client: SanicASGITestClient,
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

    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == grant_application.id))
        assert result is None


async def test_delete_application_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
