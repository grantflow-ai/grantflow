from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.constants import RAG_FILE
from packages.db.src.enums import SourceIndexingStatusEnum
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
from packages.shared_utils.src.exceptions import FileParsingError
from packages.shared_utils.src.pubsub import PubSubEvent
from services.indexer.src.main import (
    get_gcs_notification_data,
    handle_pubsub_message,
)
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
def mock_download_blob() -> Generator[AsyncMock]:
    with patch("services.indexer.src.main.download_blob") as mock:
        mock.return_value = b"Test file content"
        yield mock


@pytest.fixture
def mock_process_source() -> Generator[AsyncMock]:
    with patch("services.indexer.src.main.process_source") as mock:
        embedding = [0.1] * 384

        def side_effect(*args: Any, **kwargs: Any) -> tuple[list[dict[str, Any]], str]:
            source_id = kwargs.get("source_id", str(UUID("00000000-0000-0000-0000-000000000000")))
            vectors = [
                {"chunk": {"content": "test", "metadata": {}}, "embedding": embedding, "rag_source_id": source_id}
            ]
            return vectors, "Test extracted content"

        mock.side_effect = side_effect
        yield mock


@pytest.fixture
def mock_parse_object_uri() -> Generator[MagicMock]:
    with patch("services.indexer.src.main.parse_object_uri") as mock:
        yield mock


@pytest.fixture(autouse=True)
def mock_publish_notification() -> Generator[AsyncMock]:
    with patch("services.indexer.src.main.publish_notification") as mock:
        mock.return_value = None
        yield mock


def create_pubsub_event(object_path: str, event_type: str = "OBJECT_FINALIZE") -> PubSubEvent:
    return {
        "message": {
            "messageId": "test-message-id",
            "publishTime": "2023-01-01T00:00:00Z",
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
            "messageId": "test-message-id",
            "publishTime": "2023-01-01T00:00:00Z",
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
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    object_path = "workspace/ws-123/grant_application/app-123/test.pdf"
    event = create_pubsub_event(object_path)

    result = await handle_pubsub_message(event)

    assert isinstance(result, dict)
    assert result["parent_type"] == "grant_application"
    assert result["parent_id"] == "app-123"
    assert result["filename"] == "test.pdf"
    assert result["mime_type"] == "application/pdf"
    assert result["object_path"] == object_path
    assert result["content"] == b"Test file content"
    assert result["size"] == len(b"Test file content")
    assert result["workspace_id"] == "123e4567-e89b-12d3-a456-426614174000"

    mock_parse_object_uri.assert_called_once_with(object_path=object_path)
    mock_download_blob.assert_awaited_once_with(object_path)


async def test_handle_file_indexing_grant_application(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application.id),
        "filename": "document.pdf",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_source.first()
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert source.text_content == "Test extracted content"

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

    mock_publish_notification.assert_called_once()
    call_kwargs = mock_publish_notification.call_args.kwargs
    assert str(call_kwargs["parent_id"]) == str(grant_application.id)
    assert call_kwargs["event"] == "source_processing"
    assert str(call_kwargs["data"]["parent_id"]) == str(grant_application.id)
    assert call_kwargs["data"]["parent_type"] == "grant_application"
    assert call_kwargs["data"]["rag_source_id"] == source.id
    assert call_kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FINISHED
    assert call_kwargs["data"]["identifier"] == "document.pdf"


async def test_handle_file_indexing_funding_organization(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    mock_publish_notification: AsyncMock,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "funding_organization",
        "parent_id": str(funding_organization.id),
        "filename": "guidelines.pdf",
    }

    file_path = f"funding_organization/{funding_organization.id}/guidelines.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_source.first()
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED

        org_file = await session.scalars(
            select(FundingOrganizationRagSource).where(FundingOrganizationRagSource.rag_source_id == source.id)
        )
        org_file_record = org_file.first()
        assert org_file_record is not None
        assert org_file_record.funding_organization_id == funding_organization.id

    mock_download_blob.assert_awaited_once_with(file_path)
    mock_process_source.assert_awaited_once()

    mock_publish_notification.assert_called_once()
    call_kwargs = mock_publish_notification.call_args.kwargs
    assert str(call_kwargs["parent_id"]) == str(funding_organization.id)
    assert call_kwargs["event"] == "source_processing"
    assert str(call_kwargs["data"]["parent_id"]) == str(funding_organization.id)
    assert call_kwargs["data"]["parent_type"] == "funding_organization"
    assert call_kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FINISHED
    assert call_kwargs["data"]["identifier"] == "guidelines.pdf"


async def test_handle_file_indexing_grant_template(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
    mock_publish_notification: AsyncMock,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_template",
        "parent_id": str(grant_template.id),
        "filename": "template.docx",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    file_path = f"workspace/ws-123/grant_template/{grant_template.id}/template.docx"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_source.first()
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED

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

    mock_publish_notification.assert_called_once()
    call_kwargs = mock_publish_notification.call_args.kwargs
    assert str(call_kwargs["parent_id"]) == str(grant_template.id)
    assert call_kwargs["event"] == "source_processing"
    assert str(call_kwargs["data"]["parent_id"]) == str(grant_template.id)
    assert call_kwargs["data"]["parent_type"] == "grant_template"
    assert call_kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FINISHED
    assert call_kwargs["data"]["identifier"] == "template.docx"


async def test_handle_file_indexing_invalid_path(
    test_client: AsyncTestClient[Any],
    mock_parse_object_uri: MagicMock,
    mock_publish_notification: AsyncMock,
) -> None:
    mock_parse_object_uri.side_effect = KeyError("Invalid path format")

    pubsub_event = create_pubsub_event("invalid/path")
    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    mock_publish_notification.assert_not_called()


async def test_handle_file_indexing_unsupported_extension(
    test_client: AsyncTestClient[Any],
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application.id),
        "filename": "document.unsupported",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.unsupported"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    mock_publish_notification.assert_not_called()


async def test_handle_file_indexing_download_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application.id),
        "filename": "document.pdf",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    mock_download_blob.side_effect = Exception("Download error")

    file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    mock_publish_notification.assert_not_called()


async def test_handle_file_indexing_processing_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application.id),
        "filename": "document.pdf",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    mock_process_source.side_effect = Exception("Processing error")

    file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=pubsub_event)

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    async with async_session_maker() as session:
        rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_source.first()
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FAILED

    mock_publish_notification.assert_called_once()
    call_kwargs = mock_publish_notification.call_args.kwargs
    assert str(call_kwargs["parent_id"]) == str(grant_application.id)
    assert call_kwargs["event"] == "source_processing"
    assert str(call_kwargs["data"]["parent_id"]) == str(grant_application.id)
    assert call_kwargs["data"]["parent_type"] == "grant_application"
    assert call_kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FAILED
    assert call_kwargs["data"]["identifier"] == "document.pdf"


async def test_handle_database_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application.id),
        "filename": "document.pdf",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    with patch("services.indexer.src.main.insert") as mock_insert:
        mock_insert.side_effect = Exception("Database error")

        file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=pubsub_event)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

        mock_publish_notification.assert_not_called()


async def test_invalid_pubsub_message(
    test_client: AsyncTestClient[Any],
    mock_publish_notification: AsyncMock,
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

    mock_publish_notification.assert_not_called()


async def test_handle_file_indexing_existing_file(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
) -> None:
    object_path = f"workspace/ws-123/grant_application/{grant_application.id}/existing.pdf"
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.FINISHED,
                    "text_content": "Existing content",
                    "source_type": "rag_file",
                }
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "bucket_name": "test-bucket",
                    "filename": "existing.pdf",
                    "mime_type": "application/pdf",
                    "object_path": object_path,
                    "size": 1234,
                }
            )
        )
        await session.execute(
            insert(GrantApplicationRagSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application.id),
        "filename": "existing.pdf",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    pubsub_event = create_pubsub_event(object_path)

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.CREATED, response.text

    mock_download_blob.assert_awaited_once_with(object_path)
    mock_process_source.assert_not_called()

    mock_publish_notification.assert_called_once()
    call_kwargs = mock_publish_notification.call_args.kwargs
    assert str(call_kwargs["parent_id"]) == str(grant_application.id)
    assert call_kwargs["event"] == "source_processing"
    assert str(call_kwargs["data"]["parent_id"]) == str(grant_application.id)
    assert call_kwargs["data"]["parent_type"] == "grant_application"
    assert call_kwargs["data"]["rag_source_id"] == source_id
    assert call_kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FINISHED
    assert call_kwargs["data"]["identifier"] == "existing.pdf"


async def test_handle_file_indexing_file_parsing_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application.id),
        "filename": "document.pdf",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    mock_process_source.side_effect = FileParsingError("Failed to parse file", context={"filename": "document.pdf"})

    file_path = f"workspace/ws-123/grant_application/{grant_application.id}/document.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=pubsub_event)

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    async with async_session_maker() as session:
        rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_source.first()
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FAILED

    mock_publish_notification.assert_called_once()
    call_kwargs = mock_publish_notification.call_args.kwargs
    assert str(call_kwargs["parent_id"]) == str(grant_application.id)
    assert call_kwargs["event"] == "source_processing"
    assert str(call_kwargs["data"]["parent_id"]) == str(grant_application.id)
    assert call_kwargs["data"]["parent_type"] == "grant_application"
    assert call_kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FAILED
    assert call_kwargs["data"]["identifier"] == "document.pdf"


async def test_handle_file_indexing_retry_failed_file(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that failed files are reprocessed on retry."""

    object_path = f"workspace/ws-123/grant_application/{grant_application.id}/failed.pdf"
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.FAILED,
                    "text_content": "",
                    "source_type": RAG_FILE,
                }
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "bucket_name": "test-bucket",
                    "object_path": object_path,
                    "filename": "failed.pdf",
                    "mime_type": "application/pdf",
                    "size": 1000,
                }
            )
        )
        await session.execute(
            insert(GrantApplicationRagSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "parent_type": "grant_application",
        "parent_id": str(grant_application.id),
        "filename": "failed.pdf",
        "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    }

    pubsub_event = create_pubsub_event(object_path)

    response = await test_client.post("/", json=pubsub_event)
    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session:
        rag_source = await session.get(RagSource, source_id)
        assert rag_source is not None
        assert rag_source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert rag_source.text_content == "Test extracted content"

    mock_download_blob.assert_awaited_once_with(object_path)
    mock_process_source.assert_awaited_once()

    mock_publish_notification.assert_called_once()
    call_kwargs = mock_publish_notification.call_args.kwargs
    assert str(call_kwargs["parent_id"]) == str(grant_application.id)
    assert call_kwargs["event"] == "source_processing"
    assert str(call_kwargs["data"]["parent_id"]) == str(grant_application.id)
    assert call_kwargs["data"]["parent_type"] == "grant_application"
    assert call_kwargs["data"]["rag_source_id"] == source_id
    assert call_kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FINISHED
    assert call_kwargs["data"]["identifier"] == "failed.pdf"
