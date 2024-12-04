from http import HTTPStatus
from typing import Any

from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.applications import CreateApplicationRequestBody, CreateApplicationResponse
from src.db.tables import GrantApplication, GrantCfp, User, UserRoleEnum, Workspace, WorkspaceUser
from src.utils.serialization import deserialize
from tests.factories import GrantApplicationFactory


async def test_create_application_api_request_success(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    user: User,
    workspace: Workspace,
    cfp: GrantCfp,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "user_id": user.id, "role": UserRoleEnum.MEMBER.value}
            )
        )

    application_data = GrantApplicationFactory.build(
        workspace_id=workspace.id, cfp_id=cfp.id, cfp=cfp, application_files=[], research_aims=[], drafts=[]
    )

    _, response = await asgi_client.post(
        f"/{user.id}/workspaces/{workspace.id}/applications",
        json=CreateApplicationRequestBody(
            title=application_data.title,
            cfp_id=str(application_data.cfp_id),
            significance=application_data.significance,
            innovation=application_data.innovation,
        ),
    )
    assert response.status_code == HTTPStatus.CREATED

    response_body = deserialize(response.body, CreateApplicationResponse)
    assert response_body["application_id"]

    async with async_session_maker() as session, session.begin():
        application = await session.scalar(
            select(GrantApplication).where(GrantApplication.id == response_body["application_id"])
        )

        assert application.title == application_data.title
        assert application.cfp_id == application_data.cfp_id
        assert application.significance == application_data.significance
        assert application.innovation == application_data.innovation


async def test_create_application_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    user: User,
    workspace: Workspace,
    cfp: GrantCfp,
) -> None:
    application_data = GrantApplicationFactory.build(
        workspace_id=workspace.id, cfp_id=cfp.id, cfp=cfp, application_files=[], research_aims=[], drafts=[]
    )

    _, response = await asgi_client.post(
        f"/{user.id}/workspaces/{workspace.id}/applications",
        json=CreateApplicationRequestBody(
            title=application_data.title,
            cfp_id=str(application_data.cfp_id),
            significance=application_data.significance,
            innovation=application_data.innovation,
        ),
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_application_api_request_failure_bad_request(
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    user: User,
    workspace: Workspace,
    cfp: GrantCfp,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(WorkspaceUser).values(
                {"workspace_id": workspace.id, "user_id": user.id, "role": UserRoleEnum.MEMBER.value}
            )
        )
    application_data = GrantApplicationFactory.build(
        workspace_id=workspace.id, cfp_id=cfp.id, cfp=cfp, application_files=[], research_aims=[], drafts=[]
    )

    _, response = await asgi_client.post(
        f"/{user.id}/workspaces/{workspace.id}/applications",
        json=CreateApplicationRequestBody(
            cfp_id=str(application_data.cfp_id),
            significance=application_data.significance,
            innovation=application_data.innovation,
        ),
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
