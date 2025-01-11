from typing import Any, cast
from uuid import uuid4

import pytest
from sanic import NotFound, Unauthorized
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.utils import verify_workspace_access
from src.api_types import APIRequest
from src.db.enums import UserRoleEnum
from src.db.tables import GrantApplication, GrantTemplate, Workspace
from src.utils.db import retrieve_application
from tests.factories import WorkspaceUserFactory
from tests.test_utils import create_test_request


@pytest.fixture
def api_request(async_session_maker: async_sessionmaker[Any]) -> APIRequest:
    request = create_test_request()
    request.ctx.firebase_uid = "test-firebase-uid"
    request.ctx.session_maker = async_session_maker

    return cast(APIRequest, request)


async def test_verify_workspace_access_success(
    api_request: APIRequest, async_session_maker: async_sessionmaker[Any], workspace: Workspace
) -> None:
    async with async_session_maker() as session, session.begin():
        session.add(
            WorkspaceUserFactory.build(
                workspace_id=workspace.id, firebase_uid="test-firebase-uid", role=UserRoleEnum.MEMBER
            )
        )
        await session.commit()

    role: UserRoleEnum = await verify_workspace_access(request=api_request, workspace_id=workspace.id)

    assert role == UserRoleEnum.MEMBER


async def test_verify_workspace_access_with_allowed_roles_success(
    api_request: APIRequest, async_session_maker: async_sessionmaker[Any], workspace: Workspace
) -> None:
    async with async_session_maker() as session, session.begin():
        session.add(
            WorkspaceUserFactory.build(
                workspace_id=workspace.id, firebase_uid="test-firebase-uid", role=UserRoleEnum.MEMBER
            )
        )
        await session.commit()
    role: UserRoleEnum = await verify_workspace_access(
        request=api_request, workspace_id=workspace.id, allowed_roles=[UserRoleEnum.MEMBER, UserRoleEnum.ADMIN]
    )

    assert role == UserRoleEnum.MEMBER


async def test_verify_workspace_access_unauthorized_role(
    api_request: APIRequest, async_session_maker: async_sessionmaker[Any], workspace: Workspace
) -> None:
    async with async_session_maker() as session, session.begin():
        session.add(
            WorkspaceUserFactory.build(
                workspace_id=workspace.id, firebase_uid="test-firebase-uid", role=UserRoleEnum.MEMBER
            )
        )
        await session.commit()

    with pytest.raises(Unauthorized):
        await verify_workspace_access(
            request=api_request, workspace_id=workspace.id, allowed_roles=[UserRoleEnum.ADMIN, UserRoleEnum.OWNER]
        )


async def test_verify_workspace_access_nonexistent_workspace(
    api_request: APIRequest, async_session_maker: async_sessionmaker[Any]
) -> None:
    with pytest.raises(Unauthorized):
        await verify_workspace_access(request=api_request, workspace_id=uuid4())


async def test_retrieve_application_success(
    async_session_maker: async_sessionmaker[Any], grant_template: GrantTemplate
) -> None:
    result: GrantApplication = await retrieve_application(
        application_id=grant_template.grant_application_id, session_maker=async_session_maker
    )
    assert result
    assert result.grant_template is not None


async def test_retrieve_application_not_found(async_session_maker: async_sessionmaker[Any]) -> None:
    with pytest.raises(NotFound):
        await retrieve_application(application_id=uuid4(), session_maker=async_session_maker)


async def test_verify_workspace_access_string_uuid(
    api_request: APIRequest, async_session_maker: async_sessionmaker[Any], workspace: Workspace
) -> None:
    async with async_session_maker() as session, session.begin():
        session.add(
            WorkspaceUserFactory.build(
                workspace_id=workspace.id, firebase_uid="test-firebase-uid", role=UserRoleEnum.MEMBER
            )
        )
        await session.commit()

    role: UserRoleEnum = await verify_workspace_access(request=api_request, workspace_id=str(workspace.id))

    assert role == UserRoleEnum.MEMBER
