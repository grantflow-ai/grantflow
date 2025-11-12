from collections.abc import Generator
from http import HTTPStatus
from typing import TYPE_CHECKING, Any
from unittest.mock import ANY, AsyncMock, Mock, patch
from uuid import UUID

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
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
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import GrantApplicationFactory, RagFileFactory

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
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources",
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
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{application_id}/sources",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 0
    assert sources == []


async def test_retrieve_application_sources_includes_pending_upload(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        rag_file_pending = RagFileFactory.build(
            filename="pending_upload.pdf",
            indexing_status=SourceIndexingStatusEnum.PENDING_UPLOAD,
        )
        session.add(rag_file_pending)
        await session.flush()

        junction = GrantApplicationSource(
            grant_application_id=grant_application.id,
            rag_source_id=rag_file_pending.id,
        )
        session.add(junction)

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 1

    source = sources[0]
    assert source["filename"] == "pending_upload.pdf"
    assert source["indexing_status"] == SourceIndexingStatusEnum.PENDING_UPLOAD.value


async def test_retrieve_application_sources_mixed_statuses(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        rag_file_pending = RagFileFactory.build(
            filename="pending.pdf",
            indexing_status=SourceIndexingStatusEnum.PENDING_UPLOAD,
        )
        rag_file_indexing = RagFileFactory.build(
            filename="indexing.pdf",
            indexing_status=SourceIndexingStatusEnum.INDEXING,
        )
        rag_file_finished = RagFileFactory.build(
            filename="finished.pdf",
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        session.add_all([rag_file_pending, rag_file_indexing, rag_file_finished])
        await session.flush()

        junctions = [
            GrantApplicationSource(
                grant_application_id=grant_application.id,
                rag_source_id=rag_file_pending.id,
            ),
            GrantApplicationSource(
                grant_application_id=grant_application.id,
                rag_source_id=rag_file_indexing.id,
            ),
            GrantApplicationSource(
                grant_application_id=grant_application.id,
                rag_source_id=rag_file_finished.id,
            ),
        ]
        session.add_all(junctions)

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 3

    filenames_to_statuses = {s["filename"]: s["indexing_status"] for s in sources}
    assert filenames_to_statuses["pending.pdf"] == SourceIndexingStatusEnum.PENDING_UPLOAD.value
    assert filenames_to_statuses["indexing.pdf"] == SourceIndexingStatusEnum.INDEXING.value
    assert filenames_to_statuses["finished.pdf"] == SourceIndexingStatusEnum.FINISHED.value


async def test_retrieve_granting_institution_sources(
    test_client: TestingClientType,
    project: Project,
    granting_institution: GrantingInstitution,
    granting_institution_file: GrantingInstitutionSource,
    granting_institution_url: GrantingInstitutionSource,
    rag_file: RagFile,
    rag_url: RagUrl,
    project_member_user: OrganizationUser,
    mock_admin_code: Mock,
) -> None:
    response = await test_client.get(
        f"/granting-institutions/{granting_institution.id}/sources",
        headers={"Authorization": "test-admin-code"},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 2


async def test_retrieve_template_sources(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    grant_template_file: GrantTemplateSource,
    grant_template_url: GrantTemplateSource,
    rag_file: RagFile,
    rag_url: RagUrl,
    project_member_user: OrganizationUser,
) -> None:
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/grant_templates/{grant_template.id}/sources",
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


async def test_retrieve_template_sources_includes_pending_upload(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        rag_file_pending = RagFileFactory.build(
            filename="template_pending.docx",
            indexing_status=SourceIndexingStatusEnum.PENDING_UPLOAD,
        )
        session.add(rag_file_pending)
        await session.flush()

        junction = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_file_pending.id,
        )
        session.add(junction)

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/grant_templates/{grant_template.id}/sources",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    sources = response.json()
    assert len(sources) == 1

    source = sources[0]
    assert source["filename"] == "template_pending.docx"
    assert source["indexing_status"] == SourceIndexingStatusEnum.PENDING_UPLOAD.value


async def test_retrieve_grant_application_sources_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
) -> None:
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_retrieve_grant_template_sources_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
) -> None:
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/grant_templates/{grant_template.id}/sources",
        headers={"Authorization": "Bearer invalid_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@patch("services.backend.src.api.routes.sources.delete_blob", new_callable=AsyncMock)
@patch("services.backend.src.api.routes.sources.log_organization_audit_from_request", new_callable=AsyncMock)
async def test_delete_application_source(
    mock_audit: AsyncMock,
    mock_delete_blob: AsyncMock,
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationSource,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/{grant_application_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        deleted_source = await session.get(RagSource, grant_application_file.rag_source_id)
        assert deleted_source is not None
        assert deleted_source.deleted_at is not None

        junction = await session.get(
            GrantApplicationSource,
            {
                "grant_application_id": grant_application.id,
                "rag_source_id": grant_application_file.rag_source_id,
            },
        )
        assert junction is not None


@patch("services.backend.src.api.routes.sources.delete_blob", new_callable=AsyncMock)
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
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/{grant_application_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    mock_delete_blob.assert_called_once_with(object_path)


@patch("services.backend.src.api.routes.sources.delete_blob", new_callable=AsyncMock)
async def test_delete_granting_institution_source(
    mock_delete_blob: AsyncMock,
    test_client: TestingClientType,
    granting_institution: GrantingInstitution,
    granting_institution_file: GrantingInstitutionSource,
    async_session_maker: async_sessionmaker[Any],
    mock_admin_code: Mock,
) -> None:
    response = await test_client.delete(
        f"/granting-institutions/{granting_institution.id}/sources/{granting_institution_file.rag_source_id}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        deleted_source = await session.get(RagSource, granting_institution_file.rag_source_id)
        assert deleted_source is not None
        assert deleted_source.deleted_at is not None

        junction = await session.get(
            GrantingInstitutionSource,
            {
                "granting_institution_id": granting_institution.id,
                "rag_source_id": granting_institution_file.rag_source_id,
            },
        )
        assert junction is not None


@patch("services.backend.src.api.routes.sources.delete_blob", new_callable=AsyncMock)
async def test_delete_template_source(
    mock_delete_blob: AsyncMock,
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    grant_template_file: GrantTemplateSource,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/grant_templates/{grant_template.id}/sources/{grant_template_file.rag_source_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        deleted_source = await session.get(RagSource, grant_template_file.rag_source_id)
        assert deleted_source is not None
        assert deleted_source.deleted_at is not None

        junction = await session.get(
            GrantTemplateSource,
            {
                "grant_template_id": grant_template.id,
                "rag_source_id": grant_template_file.rag_source_id,
            },
        )
        assert junction is not None


async def test_delete_grant_application_source_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationSource,
) -> None:
    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/{grant_application_file.rag_source_id}",
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
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/{UUID('00000000-0000-0000-0000-000000000000')}",
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
        f"/organizations/{project.organization_id}/projects/{project.id}/grant_templates/{grant_template.id}/sources/{grant_application_file.rag_source_id}",
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
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        entity_type="grant_application",
        entity_id=grant_application.id,
        source_id=ANY,
        blob_name=test_blob_name,
        trace_id=ANY,
        content_type="application/pdf",
    )


async def test_create_upload_url_creates_source_with_pending_upload_status(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mock_signed_url = "https://storage.googleapis.com/test-bucket/test-signed-url"
    mocker.patch(
        "services.backend.src.api.routes.sources.create_signed_upload_url",
        return_value=mock_signed_url,
    )
    test_blob_name = "pending_upload_test.pdf"

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    source_id = UUID(result["source_id"])

    async with async_session_maker() as session:
        source = await session.get(RagSource, source_id)
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.PENDING_UPLOAD

        rag_file = await session.get(RagFile, source_id)
        assert rag_file is not None
        await session.refresh(rag_file)  # Ensure all attributes are loaded
        assert rag_file.filename == test_blob_name

        junction = await session.get(
            GrantApplicationSource,
            {
                "grant_application_id": grant_application.id,
                "rag_source_id": source_id,
            },
        )
        assert junction is not None


async def test_create_download_url(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mock_signed_url = "https://storage.googleapis.com/test-bucket/test-signed-url"

    rag_file = RagFileFactory.build(
        bucket_name="test-bucket",
        object_path="grant_application/test-entity/test-source/test-file.pdf",
        filename="test-file.pdf",
    )

    async with async_session_maker() as session, session.begin():
        session.add(rag_file)
        await session.commit()
        source_id = rag_file.id

    mock_download_url = mocker.patch(
        "services.backend.src.api.routes.sources.create_signed_download_url",
        return_value=mock_signed_url,
    )

    mock_bucket = Mock()
    mock_bucket.name = "test-bucket"
    mocker.patch(
        "services.backend.src.api.routes.sources.get_bucket",
        return_value=mock_bucket,
    )

    response = await test_client.get(
        f"/sources/{source_id}/download-url",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_download_url.assert_called_once_with(
        bucket_name="test-bucket",
        object_path="grant_application/test-entity/test-source/test-file.pdf",
        filename="test-file.pdf",
        trace_id=ANY,
    )


async def test_create_download_url_not_found(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: OrganizationUser,
) -> None:
    source_id = UUID("123e4567-e89b-12d3-a456-426614174000")

    response = await test_client.get(
        f"/sources/{source_id}/download-url",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text
    result = response.json()
    assert "detail" in result
    assert f"RAG file with source_id {source_id} not found" in result["detail"]


async def test_create_granting_institution_upload_url(
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
        f"/granting-institutions/{granting_institution.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        entity_type="granting_institution",
        entity_id=granting_institution.id,
        source_id=ANY,
        blob_name=test_blob_name,
        trace_id=ANY,
        content_type="application/pdf",
    )


async def test_create_template_upload_url(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
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
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/grant_templates/{grant_template.id}/sources/upload-url?blob_name={test_blob_name}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "url" in result
    assert result["url"] == mock_signed_url

    mock_create_url.assert_called_once_with(
        entity_type="grant_template",
        entity_id=grant_template.id,
        source_id=ANY,
        blob_name=test_blob_name,
        trace_id=ANY,
        content_type="application/pdf",
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
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/upload-url?blob_name={test_blob_name}",
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
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/crawl-url",
        json=request_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "source_id" in result

    mock_publish_url_crawling_task.assert_called_once_with(
        url="https://example.org/docs",
        source_id=ANY,
        entity_type="grant_application",
        entity_id=grant_application.id,
        trace_id=ANY,
    )


async def test_handle_crawl_url_granting_institution(
    test_client: TestingClientType,
    mock_publish_url_crawling_task: AsyncMock,
    granting_institution: GrantingInstitution,
    mock_admin_code: Mock,
) -> None:
    request_data: UrlCrawlingRequest = {"url": "https://example.org/docs"}

    response = await test_client.post(
        f"/granting-institutions/{granting_institution.id}/sources/crawl-url",
        json=request_data,
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "source_id" in result

    mock_publish_url_crawling_task.assert_called_once_with(
        url="https://example.org/docs",
        source_id=ANY,
        entity_type="granting_institution",
        entity_id=granting_institution.id,
        trace_id=ANY,
    )


async def test_handle_crawl_url_grant_template(
    test_client: TestingClientType,
    mock_publish_url_crawling_task: AsyncMock,
    project: Project,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    project_member_user: OrganizationUser,
) -> None:
    request_data: UrlCrawlingRequest = {"url": "https://example.org/docs"}

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/grant_templates/{grant_template.id}/sources/crawl-url",
        json=request_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    result = response.json()
    assert "source_id" in result

    mock_publish_url_crawling_task.assert_called_once_with(
        url="https://example.org/docs",
        source_id=ANY,
        entity_type="grant_template",
        entity_id=grant_template.id,
        trace_id=ANY,
    )


async def test_handle_crawl_url_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
) -> None:
    request_data: UrlCrawlingRequest = {"url": "https://example.org/docs"}

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/crawl-url",
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
            f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}/sources/crawl-url",
            json=request_data,
            headers={"Authorization": "Bearer some_token"},
        )

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
