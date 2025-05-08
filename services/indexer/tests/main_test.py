from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateRagSource,
    OrganizationRagSource,
    RagFile,
    RagSource,
)
from services.indexer.src.main import (
    PubSubEvent,
    get_gcs_notification_data,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
def mock_download_blob() -> Generator[AsyncMock, None, None]:
    with patch("services.indexer.src.main.download_blob") as mock:
        mock.return_value = b"Test file content"
        yield mock


@pytest.fixture
def mock_process_source() -> Generator[AsyncMock, None, None]:
    with patch("services.indexer.src.main.process_source") as mock:
        mock.return_value = None
        yield mock


def create_pubsub_event(object_path: str, event_type: str = "OBJECT_FINALIZE") -> PubSubEvent:
    return {
        "message": {  # type: ignore[typeddict-item]
            "attributes": {
                "bucketId": "test-bucket",
                "objectId": object_path,
                "eventType": event_type,
            }
        }
    }


async def test_handle_file_indexing_grant_application(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        file_path = f"grant_application/{grant_application.id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.CREATED, response.text

        async with async_session_maker() as session:
            rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
            source = rag_source.first()
            assert source is not None
            assert source.indexing_status == FileIndexingStatusEnum.INDEXING

            rag_file = await session.scalars(select(RagFile).where(RagFile.id == source.id))
            file = rag_file.first()
            assert file is not None
            assert file.filename == "document.pdf"
            assert file.mime_type == "application/pdf"
            assert file.size == len(b"Test file content")

            app_file = await session.scalars(
                select(GrantApplicationRagSource).where(GrantApplicationRagSource.rag_source_id == source.id)
            )
            app_file_record = app_file.first()
            assert app_file_record is not None
            assert app_file_record.grant_application_id == grant_application.id

        mock_download_blob.assert_awaited_once_with(file_path)
        mock_process_source.assert_awaited_once()
        assert mock_process_source.call_args[1]["source_id"] == str(source.id)
        assert mock_process_source.call_args[1]["filename"] == "document.pdf"
        assert mock_process_source.call_args[1]["mime_type"] == "application/pdf"


async def test_handle_file_indexing_funding_organization(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        file_path = f"funding_organization/{funding_organization.id}/guidelines.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.CREATED, response.text

        async with async_session_maker() as session:
            rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
            source = rag_source.first()
            assert source is not None

            org_file = await session.scalars(
                select(OrganizationRagSource).where(OrganizationRagSource.rag_source_id == source.id)
            )
            org_file_record = org_file.first()
            assert org_file_record is not None
            assert org_file_record.funding_organization_id == funding_organization.id

        mock_download_blob.assert_awaited_once_with(file_path)
        mock_process_source.assert_awaited_once()


async def test_handle_file_indexing_grant_template(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        file_path = f"grant_template/{grant_template.id}/template.docx"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.CREATED, response.text

        async with async_session_maker() as session:
            rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
            source = rag_source.first()
            assert source is not None

            rag_file = await session.scalars(select(RagFile).where(RagFile.id == source.id))
            file = rag_file.first()
            assert file is not None
            assert file.filename == "template.docx"
            assert file.mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

            template_file = await session.scalars(
                select(GrantTemplateRagSource).where(GrantTemplateRagSource.rag_source_id == source.id)
            )
            template_file_record = template_file.first()
            assert template_file_record is not None
            assert template_file_record.grant_template_id == grant_template.id

        mock_download_blob.assert_awaited_once_with(file_path)
        mock_process_source.assert_awaited_once()


async def test_handle_file_indexing_invalid_path(
    test_client: AsyncTestClient[Any],
) -> None:
    pubsub_event = create_pubsub_event("invalid_path")

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_file_indexing_unsupported_extension(
    test_client: AsyncTestClient[Any],
    grant_application: GrantApplication,
) -> None:
    file_path = f"grant_application/{grant_application.id}/document.unsupported"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_file_indexing_download_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    grant_application: GrantApplication,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        mock_download_blob.side_effect = Exception("Download error")

        file_path = f"grant_application/{grant_application.id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_file_indexing_processing_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    grant_application: GrantApplication,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        mock_process_source.side_effect = Exception("Processing error")

        file_path = f"grant_application/{grant_application.id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_database_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    grant_application: GrantApplication,
) -> None:
    with (
        patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types,
        patch("services.indexer.src.main.insert") as mock_insert,
    ):
        mock_mime_types.__getitem__.return_value = "application/pdf"
        mock_insert.side_effect = Exception("Database error")

        file_path = f"grant_application/{grant_application.id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_invalid_pubsub_message(
    test_client: AsyncTestClient[Any],
) -> None:
    invalid_event = {
        "message": {
            "message_id": "test-message-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "data": "",
            "attributes": {},
        }
    }

    response = await test_client.post("/", json=invalid_event)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_get_gcs_notification_data() -> None:
    valid_event: PubSubEvent = create_pubsub_event("test/path")
    result = get_gcs_notification_data(valid_event)
    assert result is not None
    assert result["bucket_name"] == "test-bucket"
    assert result["object_name"] == "test/path"
    assert result["event_type"] == "OBJECT_FINALIZE"

    invalid_event: PubSubEvent = {
        "message": {
            "message_id": "test-message-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "data": "",
            "attributes": {},
        }
    }
    result = get_gcs_notification_data(invalid_event)
    assert result is None
