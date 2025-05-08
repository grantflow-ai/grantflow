from http import HTTPStatus
from typing import Any
from unittest.mock import Mock
from uuid import UUID

import pytest
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganization,
    FundingOrganizationRagSource,
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateRagSource,
    RagFile,
    RagSource,
    RagUrl,
    Workspace,
)
from pytest_mock import MockerFixture
from services.backend.tests.conftest import TestingClientType
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
async def rag_file(async_session_maker: async_sessionmaker[Any]) -> RagFile:
    file = RagFile(
        source_type="rag_file",
        filename="test.pdf",
        bucket_name="test-bucket",
        object_path="test/path",
        mime_type="application/pdf",
        size=1024,
        indexing_status=FileIndexingStatusEnum.FINISHED,
    )
    async with async_session_maker() as session, session.begin():
        session.add(file)
        await session.commit()
    return file


@pytest.fixture
async def rag_url(async_session_maker: async_sessionmaker[Any]) -> RagUrl:
    url = RagUrl(
        source_type="rag_url",
        url="https://example.com",
        title="Example URL",
        description="An example URL for testing",
        indexing_status=FileIndexingStatusEnum.FINISHED,
    )
    async with async_session_maker() as session, session.begin():
        session.add(url)
        await session.commit()
    return url


@pytest.fixture
async def application_file(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    rag_file: RagFile,
) -> GrantApplicationRagSource:
    app_file = GrantApplicationRagSource(grant_application_id=grant_application.id, rag_source_id=rag_file.id)
    async with async_session_maker() as session, session.begin():
        session.add(app_file)
        await session.commit()
    return app_file


@pytest.fixture
async def application_url(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    rag_url: RagUrl,
) -> GrantApplicationRagSource:
    app_url = GrantApplicationRagSource(grant_application_id=grant_application.id, rag_source_id=rag_url.id)
    async with async_session_maker() as session, session.begin():
        session.add(app_url)
        await session.commit()
    return app_url


@pytest.fixture
async def organization_file(
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    rag_file: RagFile,
) -> FundingOrganizationRagSource:
    org_file = FundingOrganizationRagSource(funding_organization_id=funding_organization.id, rag_source_id=rag_file.id)
    async with async_session_maker() as session, session.begin():
        session.add(org_file)
        await session.commit()
    return org_file


@pytest.fixture
async def template_file(
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
    rag_file: RagFile,
) -> GrantTemplateRagSource:
    template_file = GrantTemplateRagSource(grant_template_id=grant_template.id, rag_source_id=rag_file.id)
    async with async_session_maker() as session, session.begin():
        session.add(template_file)
        await session.commit()
    return template_file


async def test_retrieve_application_sources(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationRagSource,
    application_url: GrantApplicationRagSource,
    rag_file: RagFile,
    rag_url: RagUrl,
    workspace_member_user: None,
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/sources",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 2

    file_source = next((s for s in sources if "filename" in s), None)
    url_source = next((s for s in sources if "url" in s), None)

    assert file_source is not None
    assert url_source is not None

    assert file_source["filename"] == rag_file.filename
    assert file_source["size"] == rag_file.size
    assert file_source["mime_type"] == rag_file.mime_type
    assert file_source["indexing_status"] == rag_file.indexing_status.value

    assert url_source["url"] == rag_url.url
    assert url_source["title"] == rag_url.title
    assert url_source["description"] == rag_url.description
    assert url_source["indexing_status"] == rag_url.indexing_status.value


async def test_retrieve_organization_sources(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    organization_file: FundingOrganizationRagSource,
    rag_file: RagFile,
    mock_admin_code: Mock,
) -> None:
    response = await test_client.get(
        f"/organizations/{funding_organization.id}/sources",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 1
    assert sources[0]["id"] == str(rag_file.id)
    assert sources[0]["filename"] == rag_file.filename
    assert sources[0]["size"] == rag_file.size
    assert sources[0]["mime_type"] == rag_file.mime_type
    assert sources[0]["indexing_status"] == rag_file.indexing_status.value


async def test_retrieve_template_sources(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_template: GrantTemplate,
    template_file: GrantTemplateRagSource,
    rag_file: RagFile,
    workspace_member_user: None,
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}/grant_templates/{grant_template.id}/sources",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 1
    assert sources[0]["id"] == str(rag_file.id)
    assert sources[0]["filename"] == rag_file.filename
    assert sources[0]["size"] == rag_file.size
    assert sources[0]["mime_type"] == rag_file.mime_type
    assert sources[0]["indexing_status"] == rag_file.indexing_status.value


async def test_retrieve_sources_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/sources",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_application_source(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationRagSource,
    workspace_member_user: None,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/sources/{application_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagSource, application_file.rag_source_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                GrantApplicationRagSource,
                {
                    "grant_application_id": grant_application.id,
                    "rag_source_id": application_file.rag_source_id,
                },
            )


async def test_delete_organization_source(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    organization_file: FundingOrganizationRagSource,
    async_session_maker: async_sessionmaker[Any],
    mock_admin_code: Mock,
) -> None:
    response = await test_client.delete(
        f"/organizations/{funding_organization.id}/sources/{organization_file.rag_source_id}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagSource, organization_file.rag_source_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                FundingOrganizationRagSource,
                {
                    "funding_organization_id": funding_organization.id,
                    "rag_source_id": organization_file.rag_source_id,
                },
            )


async def test_delete_template_source(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_template: GrantTemplate,
    template_file: GrantTemplateRagSource,
    workspace_member_user: None,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}/grant_templates/{grant_template.id}/sources/{template_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagSource, template_file.rag_source_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                GrantTemplateRagSource,
                {
                    "grant_template_id": grant_template.id,
                    "rag_source_id": template_file.rag_source_id,
                },
            )


async def test_delete_source_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    application_file: GrantApplicationRagSource,
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/sources/{application_file.rag_source_id}",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_source_not_found(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/sources/{UUID('00000000-0000-0000-0000-000000000000')}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_create_application_upload_url(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
    mocker: MockerFixture,
) -> None:
    mock_signed_url = "https://storage.googleapis.com/test-bucket/test-signed-url"
    mock_create_url = mocker.patch(
        "services.backend.src.api.routes.sources.create_signed_upload_url",
    )
    mock_create_url.return_value = mock_signed_url
    test_blob_name = "test_document.pdf"

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        workspace_id=str(workspace.id),
        application_id=str(grant_application.id),
        organization_id=None,
        template_id=None,
        blob_name=test_blob_name,
    )


async def test_create_organization_upload_url(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    mock_admin_code: Mock,
    mocker: MockerFixture,
) -> None:
    mock_signed_url = "https://storage.googleapis.com/test-bucket/test-signed-url"
    mock_create_url = mocker.patch(
        "services.backend.src.api.routes.sources.create_signed_upload_url",
    )
    mock_create_url.return_value = mock_signed_url
    test_blob_name = "test_document.pdf"

    response = await test_client.post(
        f"/organizations/{funding_organization.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        workspace_id=None,
        application_id=None,
        organization_id=str(funding_organization.id),
        template_id=None,
        blob_name=test_blob_name,
    )


async def test_create_template_upload_url(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_template: GrantTemplate,
    workspace_member_user: None,
    mocker: MockerFixture,
) -> None:
    mock_signed_url = "https://storage.googleapis.com/test-bucket/test-signed-url"
    mock_create_url = mocker.patch(
        "services.backend.src.api.routes.sources.create_signed_upload_url",
    )
    mock_create_url.return_value = mock_signed_url
    test_blob_name = "test_document.pdf"

    response = await test_client.post(
        f"/workspaces/{workspace.id}/grant_templates/{grant_template.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        workspace_id=str(workspace.id),
        application_id=None,
        organization_id=None,
        template_id=str(grant_template.id),
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
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED

    mock_create_url.assert_not_called()
