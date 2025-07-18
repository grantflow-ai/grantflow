from collections.abc import Generator
from http import HTTPStatus
from typing import TYPE_CHECKING, Any
from unittest.mock import ANY, AsyncMock, Mock, patch
from uuid import UUID

import pytest
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitution,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    OrganizationUser,
    Project,
    RagFile,
    RagSource,
    RagUrl,
)
from pytest_mock import MockerFixture
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import GrantApplicationFactory

from services.backend.tests.conftest import TestingClientType

if TYPE_CHECKING:
    from services.backend.src.api.routes.sources import UrlCrawlingRequest


async def test_retrieve_application_sources(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationSource,
    grant_application_url: GrantApplicationSource,
    project_member_user: OrganizationUser,
    rag_file: RagFile,
    rag_url: RagUrl,
) -> None:
    response = await test_client.get(
        f"/projects/{project.id}/applications/{grant_application.id}/sources",
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


async def test_retrieve_application_sources_empty(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        new_application = GrantApplicationFactory.build(
            project_id=project.id,
            title="Test Application Without Sources",
        )
        session.add(new_application)
        await session.commit()

        application_id = new_application.id

    response = await test_client.get(
        f"/projects/{project.id}/applications/{application_id}/sources",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 0
    assert sources == []


async def test_retrieve_organization_sources(
    test_client: TestingClientType,
    granting_institution: GrantingInstitution,
    granting_institution_file: GrantingInstitutionSource,
    granting_institution_url: GrantingInstitutionSource,
    rag_file: RagFile,
    rag_url: RagUrl,
    mock_admin_code: Mock,
) -> None:
    response = await test_client.get(
        f"/organizations/{granting_institution.id}/sources",
        headers={"Authorization": "test-admin-code"},
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


async def test_retrieve_template_sources(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    grant_template_file: GrantTemplateSource,
    grant_template_url: GrantTemplateSource,
    rag_file: RagFile,
    rag_url: RagUrl,
    project_member_user: OrganizationUser,
) -> None:
    response = await test_client.get(
        f"/projects/{project.id}/grant_templates/{grant_template.id}/sources",
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


async def test_retrieve_grant_application_sources_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
) -> None:
    response = await test_client.get(
        f"/projects/{project.id}/applications/{grant_application.id}/sources",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_retrieve_grant_template_sources_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
) -> None:
    response = await test_client.get(
        f"/projects/{project.id}/grant_templates/{grant_template.id}/sources",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_application_source(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationSource,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/projects/{project.id}/applications/{grant_application.id}/sources/{grant_application_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagSource, grant_application_file.rag_source_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                GrantApplicationSource,
                {
                    "grant_application_id": grant_application.id,
                    "rag_source_id": grant_application_file.rag_source_id,
                },
            )


@patch("services.backend.src.api.routes.sources.delete_blob")
async def test_delete_application_source_deletes_from_gcs(
    mock_delete_blob: AsyncMock,
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationSource,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session:
        file_source = await session.get(RagFile, grant_application_file.rag_source_id)
        assert file_source is not None, "File source should exist"
        object_path = file_source.object_path

    response = await test_client.delete(
        f"/projects/{project.id}/applications/{grant_application.id}/sources/{grant_application_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    mock_delete_blob.assert_called_once_with(object_path)


async def test_delete_organization_source(
    test_client: TestingClientType,
    granting_institution: GrantingInstitution,
    granting_institution_file: GrantingInstitutionSource,
    async_session_maker: async_sessionmaker[Any],
    mock_admin_code: Mock,
) -> None:
    response = await test_client.delete(
        f"/organizations/{granting_institution.id}/sources/{granting_institution_file.rag_source_id}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagSource, granting_institution_file.rag_source_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                GrantingInstitutionSource,
                {
                    "granting_institution_id": granting_institution.id,
                    "rag_source_id": granting_institution_file.rag_source_id,
                },
            )


async def test_delete_template_source(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    grant_template_file: GrantTemplateSource,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/projects/{project.id}/grant_templates/{grant_template.id}/sources/{grant_template_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagSource, grant_template_file.rag_source_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                GrantTemplateSource,
                {
                    "grant_template_id": grant_template.id,
                    "rag_source_id": grant_template_file.rag_source_id,
                },
            )


async def test_delete_grant_application_source_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationSource,
) -> None:
    response = await test_client.delete(
        f"/projects/{project.id}/applications/{grant_application.id}/sources/{grant_application_file.rag_source_id}",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_grant_application_source_not_found(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
) -> None:
    response = await test_client.delete(
        f"/projects/{project.id}/applications/{grant_application.id}/sources/{UUID('00000000-0000-0000-0000-000000000000')}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_delete_source_from_wrong_entity(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    grant_application_file: GrantApplicationSource,
    project_member_user: OrganizationUser,
) -> None:
    response = await test_client.delete(
        f"/projects/{project.id}/grant_templates/{grant_template.id}/sources/{grant_application_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_create_upload_url(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
    mocker: MockerFixture,
) -> None:
    mock_signed_url = "https://storage.googleapis.com/test-bucket/test-signed-url"
    mock_create_url = mocker.patch(
        "services.backend.src.api.routes.sources.create_signed_upload_url",
    )
    mock_create_url.return_value = mock_signed_url
    test_blob_name = "test_document.pdf"

    response = await test_client.post(
        f"/projects/{project.id}/applications/{grant_application.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        project_id=project.id,
        parent_id=grant_application.id,
        source_id=ANY,
        blob_name=test_blob_name,
        trace_id=ANY,
    )


async def test_create_organization_upload_url(
    test_client: TestingClientType,
    granting_institution: GrantingInstitution,
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
        f"/organizations/{granting_institution.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        project_id=None,
        parent_id=granting_institution.id,
        source_id=ANY,
        blob_name=test_blob_name,
        trace_id=ANY,
    )


async def test_create_template_upload_url(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    project_member_user: OrganizationUser,
    mocker: MockerFixture,
) -> None:
    mock_signed_url = "https://storage.googleapis.com/test-bucket/test-signed-url"
    mock_create_url = mocker.patch(
        "services.backend.src.api.routes.sources.create_signed_upload_url",
    )
    mock_create_url.return_value = mock_signed_url
    test_blob_name = "test_document.pdf"

    response = await test_client.post(
        f"/projects/{project.id}/grant_templates/{grant_template.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        project_id=project.id,
        parent_id=grant_template.id,
        source_id=ANY,
        blob_name=test_blob_name,
        trace_id=ANY,
    )


async def test_create_upload_url_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    mocker: MockerFixture,
) -> None:
    mock_create_url = mocker.patch(
        "packages.shared_utils.src.gcs.create_signed_upload_url",
        return_value="https://storage.googleapis.com/test-bucket/test-signed-url",
    )

    test_blob_name = "test_document.pdf"

    response = await test_client.post(
        f"/projects/{project.id}/applications/{grant_application.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED

    mock_create_url.assert_not_called()


@pytest.fixture
def mock_publish_url_crawling_task() -> Generator[AsyncMock]:
    with patch("services.backend.src.api.routes.sources.publish_url_crawling_task") as mock_func:
        mock_func.return_value = "test-message-id"
        yield mock_func


async def test_handle_crawl_url_grant_application(
    test_client: TestingClientType,
    mock_publish_url_crawling_task: AsyncMock,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
) -> None:
    request_data: UrlCrawlingRequest = {"url": "https://example.org/docs"}

    response = await test_client.post(
        f"/projects/{project.id}/applications/{grant_application.id}/sources/crawl-url",
        json=request_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "source_id" in result

    mock_publish_url_crawling_task.assert_called_once_with(
        logger=ANY,
        url="https://example.org/docs",
        source_id=ANY,
        project_id=project.id,
        parent_id=grant_application.id,
        trace_id=ANY,
    )


async def test_handle_crawl_url_funding_organization(
    test_client: TestingClientType,
    mock_publish_url_crawling_task: AsyncMock,
    granting_institution: GrantingInstitution,
    mock_admin_code: Mock,
) -> None:
    request_data: UrlCrawlingRequest = {"url": "https://example.org/docs"}

    response = await test_client.post(
        f"/organizations/{granting_institution.id}/sources/crawl-url",
        json=request_data,
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "source_id" in result

    mock_publish_url_crawling_task.assert_called_once_with(
        logger=ANY,
        url="https://example.org/docs",
        source_id=ANY,
        project_id=None,
        parent_id=granting_institution.id,
        trace_id=ANY,
    )


async def test_handle_crawl_url_grant_template(
    test_client: TestingClientType,
    mock_publish_url_crawling_task: AsyncMock,
    project: Project,
    grant_template: GrantTemplate,
    project_member_user: OrganizationUser,
) -> None:
    request_data: UrlCrawlingRequest = {"url": "https://example.org/docs"}

    response = await test_client.post(
        f"/projects/{project.id}/grant_templates/{grant_template.id}/sources/crawl-url",
        json=request_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "source_id" in result

    mock_publish_url_crawling_task.assert_called_once_with(
        logger=ANY,
        url="https://example.org/docs",
        source_id=ANY,
        project_id=project.id,
        parent_id=grant_template.id,
        trace_id=ANY,
    )


async def test_handle_crawl_url_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
) -> None:
    request_data: UrlCrawlingRequest = {"url": "https://example.org/docs"}

    response = await test_client.post(
        f"/projects/{project.id}/applications/{grant_application.id}/sources/crawl-url",
        json=request_data,
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_handle_crawl_url_pubsub_error(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
) -> None:
    with patch("services.backend.src.api.routes.sources.publish_url_crawling_task") as mock_func:
        mock_func.side_effect = Exception("PubSub error")

        request_data: UrlCrawlingRequest = {"url": "https://example.org/docs"}

        response = await test_client.post(
            f"/projects/{project.id}/applications/{grant_application.id}/sources/crawl-url",
            json=request_data,
            headers={"Authorization": "Bearer some_token"},
        )

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
