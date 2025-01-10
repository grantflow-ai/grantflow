from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock

import pytest
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import FileIndexingStatusEnum, UserRoleEnum
from src.db.tables import (
    GrantApplication,
    GrantApplicationFile,
    RagFile,
    Workspace,
    WorkspaceUser,
)
from src.utils.serialization import deserialize


@pytest.fixture
async def application_file(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    file: RagFile,
) -> GrantApplicationFile:
    app_file = GrantApplicationFile(grant_application_id=grant_application.id, rag_file_id=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(app_file)
        await session.commit()
    return app_file


async def test_upload_application_files_success(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    signal_dispatch_mock: AsyncMock,
) -> None:
    # Setup workspace access
    async with async_session_maker() as session, session.begin():
        workspace_user = WorkspaceUser(workspace_id=workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.MEMBER)
        session.add(workspace_user)
        await session.commit()

    test_files = {
        "test1.txt": b"Test content 1",
        "test2.txt": b"Test content 2",
    }

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        files=test_files,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session:
        files = (await session.scalars(select(RagFile))).all()
        assert len(files) == 2

        for file in files:
            assert file.indexing_status == FileIndexingStatusEnum.INDEXING
            assert file.filename in test_files

        app_files = (
            await session.scalars(
                select(GrantApplicationFile).where(GrantApplicationFile.grant_application_id == grant_application.id)
            )
        ).all()
        assert len(app_files) == 2

    signal_calls = [call for call in signal_dispatch_mock.mock_calls if call.args[0] == "parse_and_index_file"]
    assert len(signal_calls) == 2
    for call in signal_calls:
        assert "file_id" in call.kwargs["context"]
        assert "file_dto" in call.kwargs["context"]


async def test_upload_application_files_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    test_files = {
        "test.txt": b"Test content",
    }

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        files=test_files,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_upload_application_files_no_files(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        workspace_user = WorkspaceUser(workspace_id=workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.MEMBER)
        session.add(workspace_user)
        await session.commit()

    _, response = await asgi_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        files={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_retrieve_application_files_success(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationFile,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        workspace_user = WorkspaceUser(workspace_id=workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.MEMBER)
        session.add(workspace_user)
        await session.commit()

    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    files = deserialize(response.text, list[dict[str, Any]])
    assert len(files) == 1
    assert files[0]["grant_application_id"] == str(grant_application.id)
    assert files[0]["rag_file_id"] == str(application_file.rag_file_id)


async def test_retrieve_application_files_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    _, response = await asgi_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_application_file_success(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationFile,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        workspace_user = WorkspaceUser(workspace_id=workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.MEMBER)
        session.add(workspace_user)
        await session.commit()

    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files/{application_file.rag_file_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagFile, application_file.rag_file_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                GrantApplicationFile,
                {
                    "grant_application_id": grant_application.id,
                    "rag_file_id": application_file.rag_file_id,
                },
            )


async def test_delete_application_file_unauthorized(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationFile,
) -> None:
    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files/{application_file.rag_file_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_application_file_not_found(
    asgi_client: SanicASGITestClient,
    workspace: Workspace,
    grant_application: GrantApplication,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        workspace_user = WorkspaceUser(workspace_id=workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.MEMBER)
        session.add(workspace_user)
        await session.commit()

    _, response = await asgi_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
