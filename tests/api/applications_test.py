from http import HTTPStatus
from typing import Any

from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore[attr-defined]

from src.api.api_types import (
    CreateGrantApplicationRequestBody,
    GrantApplicationResponse,
)
from src.db.tables import GrantApplication, GrantCfp, UserRoleEnum, Workspace, WorkspaceUser
from src.utils.serialization import deserialize
from tests.factories import GrantApplicationFactory


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

    application_data = GrantApplicationFactory.build(
        workspace_id=workspace.id, cfp_id=cfp.id, cfp=cfp, application_files=[], research_aims=[], drafts=[]
    )

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications",
        json=CreateGrantApplicationRequestBody(
            title=application_data.title,
            cfp_id=str(application_data.cfp_id),
            significance=application_data.significance,
            innovation=application_data.innovation,
        ),
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED

    response_body = deserialize(response.body, GrantApplicationResponse)
    assert response_body["id"]

    async with async_session_maker() as session, session.begin():
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == response_body["id"]))

        assert application.title == response_body["title"]
        assert str(application.cfp_id) == response_body["cfp_id"]
        assert application.significance == response_body["significance"]
        assert application.innovation == response_body["innovation"]


async def test_create_application_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    cfp: GrantCfp,
) -> None:
    application_data = GrantApplicationFactory.build(
        workspace_id=workspace.id, cfp_id=cfp.id, cfp=cfp, application_files=[], research_aims=[], drafts=[]
    )

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications",
        json=CreateGrantApplicationRequestBody(
            title=application_data.title,
            cfp_id=str(application_data.cfp_id),
            significance=application_data.significance,
            innovation=application_data.innovation,
        ),
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_application_api_request_failure_bad_request(
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
    application_data = GrantApplicationFactory.build(
        workspace_id=workspace.id, cfp_id=cfp.id, cfp=cfp, application_files=[], research_aims=[], drafts=[]
    )

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications",
        json=CreateGrantApplicationRequestBody(  # type: ignore[typeddict-item]
            significance=application_data.significance,
            innovation=application_data.innovation,
            title=application_data.title,
        ),
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_retrieve_applications_api_request_success(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    workspace: Workspace,
    application: GrantApplication,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "firebase_uid": firebase_uid, "role": UserRoleEnum.MEMBER.value}
            )
        )
    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications", headers={"Authorization": "Bearer some_token"}
    )
    assert response.status_code == HTTPStatus.OK

    response_body = deserialize(response.body, list[GrantApplicationResponse])

    assert len(response_body) == 1
    assert response_body[0]["title"] == application.title
    assert response_body[0]["cfp_id"] == str(application.cfp_id)
    assert response_body[0]["significance"] == application.significance
    assert response_body[0]["innovation"] == application.innovation


async def test_retrieve_applications_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    application: GrantApplication,
) -> None:
    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications", headers={"Authorization": "Bearer some_token"}
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED
