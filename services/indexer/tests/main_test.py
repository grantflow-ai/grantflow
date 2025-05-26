from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from kreuzberg._mime_types import EXT_TO_MIME_TYPE
from litestar.testing import AsyncTestClient
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
)
from packages.shared_utils.src.pubsub import PubSubEvent
from services.indexer.src.main import (
    get_gcs_notification_data,
    handle_pubsub_message,
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


@pytest.fixture
def mock_parse_object_uri() -> Generator[MagicMock, None, None]:
    with patch("services.indexer.src.main.parse_object_uri") as mock:
        yield mock


def create_pubsub_event(object_path: str, event_type: str = "OBJECT_FINALIZE") -> PubSubEvent:
    return {
        "message": {
            "message_id": "test-message-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "data": "",
            "attributes": {
                "bucketId": "test-bucket",
                "objectId": object_path,
                "eventType": event_type,
            },
        }
    }


async def test_get_gcs_notification_data() -> None:
    valid_event = create_pubsub_event("test/path")
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


async def test_handle_pubsub_message(mock_download_blob: AsyncMock, mock_parse_object_uri: MagicMock) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": "app-123",
        "filename": "test.pdf",
    }

    object_path = "workspace/ws-123/grant_application/app-123/test.pdf"
    event = create_pubsub_event(object_path)

    with patch.dict(EXT_TO_MIME_TYPE, {"pdf": "application/pdf"}):
        result = await handle_pubsub_message(event)

        assert isinstance(result, dict)
        assert result["parent_type"] == "grant_application"
        assert result["parent_id"] == "app-123"
        assert result["filename"] == "test.pdf"
        assert result["mime_type"] == "application/pdf"
        assert result["object_path"] == object_path
        assert result["content"] == b"Test file content"
        assert result["size"] == len(b"Test file content")

        mock_parse_object_uri.assert_called_once_with(object_path=object_path)
        mock_download_blob.assert_awaited_once_with(object_path)


async def test_handle_file_indexing_grant_application(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": grant_application.id,
        "filename": "document.pdf",
    }

    with patch.dict(EXT_TO_MIME_TYPE, {"pdf": "application/pdf"}):
        file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.CREATED, response.text
        assert response.json() == {"message": "File indexing completed successfully."}

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
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "funding_organization",
        "parent_id": funding_organization.id,
        "filename": "guidelines.pdf",
    }

    with patch.dict(EXT_TO_MIME_TYPE, {"pdf": "application/pdf"}):
        file_path = f"funding_organization/{funding_organization.id}/guidelines.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.CREATED, response.text

        async with async_session_maker() as session:
            rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
            source = rag_source.first()
            assert source is not None
            assert source.indexing_status == FileIndexingStatusEnum.INDEXING

            org_file = await session.scalars(
                select(FundingOrganizationRagSource).where(FundingOrganizationRagSource.rag_source_id == source.id)
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
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_template",
        "parent_id": grant_template.id,
        "filename": "template.docx",
    }

    with patch.dict(
        EXT_TO_MIME_TYPE, {"docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
    ):
        file_path = f"workspace/ws-123/grant_template/{grant_template.id}/template.docx"
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
    mock_parse_object_uri: MagicMock,
) -> None:
    mock_parse_object_uri.side_effect = KeyError("Invalid path format")

    pubsub_event = create_pubsub_event("invalid/path")
    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_file_indexing_unsupported_extension(
    test_client: AsyncTestClient[Any],
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": grant_application.id,
        "filename": "document.unsupported",
    }

    with patch.dict(EXT_TO_MIME_TYPE, {}):
        file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.unsupported"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_file_indexing_download_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": grant_application.id,
        "filename": "document.pdf",
    }

    mock_download_blob.side_effect = Exception("Download error")

    with patch.dict(EXT_TO_MIME_TYPE, {"pdf": "application/pdf"}):
        file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_file_indexing_processing_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": grant_application.id,
        "filename": "document.pdf",
    }

    mock_process_source.side_effect = Exception("Processing error")

    with patch.dict(EXT_TO_MIME_TYPE, {"pdf": "application/pdf"}):
        file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_database_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": grant_application.id,
        "filename": "document.pdf",
    }

    with (
        patch.dict(EXT_TO_MIME_TYPE, {"pdf": "application/pdf"}),
        patch("services.indexer.src.main.insert") as mock_insert,
    ):
        mock_insert.side_effect = Exception("Database error")

        file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
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
