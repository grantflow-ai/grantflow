from http import HTTPStatus
from typing import Any
from uuid import UUID

import pytest
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationFile,
    RagSource,
    Workspace,
)
from pytest_mock import MockerFixture
from services.backend.tests.conftest import TestingClientType
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
async def application_file(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    file: RagSource,
) -> GrantApplicationFile:
    app_file = GrantApplicationFile(grant_application_id=grant_application.id, rag_file_id=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(app_file)
        await session.commit()
    return app_file


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
            await session.get_one(RagSource, application_file.rag_file_id)

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


async def test_create_upload_url_success(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
    mocker: MockerFixture,
) -> None:
    mock_signed_url = "https://storage.googleapis.com/test-bucket/test-signed-url"
    mock_create_url = mocker.patch(
        "services.backend.src.api.routes.application_files.create_signed_upload_url",
    )
    mock_create_url.return_value = mock_signed_url
    test_blob_name = "test_document.pdf"

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        workspace_id=str(workspace.id),
        application_id=str(grant_application.id),
        blob_name=test_blob_name,
    )


async def test_create_upload_url_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    mocker: MockerFixture,
) -> None:
    mock_create_url = mocker.patch(
        "packages.shared_utils.src.gcs.create_signed_upload_url",
        return_value="https://storage.googleapis.com/test-bucket/test-signed-url",
    )

    test_blob_name = "test_document.pdf"

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/files/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED

    mock_create_url.assert_not_called()
