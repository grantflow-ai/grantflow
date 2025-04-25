from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker

from db.src.enums import FileIndexingStatusEnum
from db.src.tables import (
    GrantApplication,
    GrantApplicationFile,
    RagFile,
    Workspace,
)
from tests.conftest import TestingClientType


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
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    signal_dispatch_mock: AsyncMock,
    workspace_member_user: None,
) -> None:
    test_files = {
        "test1.txt": b"Test content 1",
        "test2.txt": b"Test content 2",
    }

    response = await test_client.post(
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
        assert "file_id" in call.kwargs
        assert "file_dto" in call.kwargs


async def test_upload_application_files_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    test_files = {
        "test.txt": b"Test content",
    }

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        files=test_files,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_upload_application_files_no_files(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
) -> None:
    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        files={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_retrieve_application_files_success(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationFile,
    workspace_member_user: None,
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    files = response.json()
    assert len(files) == 1
    assert files[0]["id"] == str(application_file.rag_file_id)


async def test_retrieve_application_files_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_application_file_success(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationFile,
    workspace_member_user: None,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
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
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationFile,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files/{application_file.rag_file_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_application_file_not_found(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files/{UUID('00000000-0000-0000-0000-000000000000')}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
