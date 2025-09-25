from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import msgspec
import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.constants import RAG_FILE
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitution,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    Project,
    RagFile,
    RagSource,
)
from packages.shared_utils.src.exceptions import FileParsingError
from packages.shared_utils.src.pubsub import PubSubEvent, PubSubMessage
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.indexer.src.main import (
    get_gcs_notification_data,
    handle_pubsub_message,
)


@pytest.fixture
def mock_download_blob() -> Generator[AsyncMock]:
    with patch("services.indexer.src.main.download_blob") as mock:
        mock.return_value = b"Test file content"
        yield mock


@pytest.fixture
def mock_process_source() -> Generator[AsyncMock]:
    with patch("services.indexer.src.main.process_source") as mock:
        embedding = [0.1] * 384

        def side_effect(*args: Any, **kwargs: Any) -> tuple[list[dict[str, Any]], str, dict[str, Any] | None]:
            source_id = kwargs.get("source_id", str(UUID("00000000-0000-0000-0000-000000000000")))
            vectors = [
                {"chunk": {"content": "test", "metadata": {}}, "embedding": embedding, "rag_source_id": source_id}
            ]
            return vectors, "Test extracted content", None

        mock.side_effect = side_effect
        yield mock


@pytest.fixture
def mock_parse_object_uri() -> Generator[MagicMock]:
    with patch("services.indexer.src.main.parse_object_uri") as mock:
        yield mock


def create_pubsub_event(object_path: str, event_type: str = "OBJECT_FINALIZE") -> PubSubEvent:
    return PubSubEvent(
        message=PubSubMessage(
            message_id="test-message-id",
            publish_time="2023-01-01T00:00:00Z",
            data="",
            attributes={
                "bucketId": "test-bucket",
                "objectId": object_path,
                "eventType": event_type,
            },
        )
    )


async def test_get_gcs_notification_data() -> None:
    valid_event = create_pubsub_event("test/path")
    notification, _trace_id = get_gcs_notification_data(valid_event)
    assert notification is not None
    assert notification["bucket_name"] == "test-bucket"
    assert notification["object_name"] == "test/path"
    assert notification["event_type"] == "OBJECT_FINALIZE"

    invalid_event = PubSubEvent(
        message=PubSubMessage(
            message_id="test-message-id",
            publish_time="2023-01-01T00:00:00Z",
            data="",
            attributes={},
        )
    )
    notification, _trace_id = get_gcs_notification_data(invalid_event)
    assert notification is None


async def test_handle_pubsub_message(mock_parse_object_uri: MagicMock) -> None:
    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": UUID("987e4567-e89b-12d3-a456-426614174000"),
        "source_id": UUID("550e8400-e29b-41d4-a716-446655440000"),
        "blob_name": "test.pdf",
    }

    object_path = "grant_application/987e4567-e89b-12d3-a456-426614174000/550e8400-e29b-41d4-a716-446655440000/test.pdf"
    event = create_pubsub_event(object_path)

    result, obj_path, _trace_id = await handle_pubsub_message(event)

    assert isinstance(result, dict)
    assert result["entity_type"] == "grant_application"
    assert result["entity_id"] == UUID("987e4567-e89b-12d3-a456-426614174000")
    assert result["source_id"] == UUID("550e8400-e29b-41d4-a716-446655440000")
    assert result["blob_name"] == "test.pdf"
    assert obj_path == object_path

    mock_parse_object_uri.assert_called_once_with(object_path=object_path)


async def test_handle_file_indexing_grant_application(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project: Project,
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": "",
                    "source_type": RAG_FILE,
                    "parent_id": None,
                }
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "document.pdf",
                    "mime_type": "application/pdf",
                    "size": 0,
                    "bucket_name": "test-bucket",
                    "object_path": f"grant_application/{grant_application.id}/{source_id}/document.pdf",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": grant_application.id,
        "source_id": source_id,
        "blob_name": "document.pdf",
    }

    file_path = f"grant_application/{grant_application.id}/{source_id}/document.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        source = await session.scalar(select(RagSource).where(RagSource.id == source_id))
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert source.text_content == "Test extracted content"

        rag_file = await session.scalar(select(RagFile).where(RagFile.id == source_id))
        assert rag_file is not None
        assert rag_file.filename == "document.pdf"
        assert rag_file.mime_type == "application/pdf"

        app_file = await session.scalar(
            select(GrantApplicationSource).where(GrantApplicationSource.rag_source_id == source_id)
        )
        assert app_file is not None
        assert app_file.grant_application_id == grant_application.id

    mock_download_blob.assert_awaited_once_with(file_path)
    mock_process_source.assert_awaited_once()
    assert mock_process_source.call_args[1]["source_id"] == str(source_id)
    assert mock_process_source.call_args[1]["filename"] == "document.pdf"
    assert mock_process_source.call_args[1]["mime_type"] == "application/pdf"


async def test_handle_file_indexing_funding_organization(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": "",
                    "source_type": RAG_FILE,
                    "parent_id": None,
                }
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "guidelines.pdf",
                    "mime_type": "application/pdf",
                    "size": 0,
                    "bucket_name": "test-bucket",
                    "object_path": f"granting_institution/{granting_institution.id}/{source_id}/guidelines.pdf",
                }
            )
        )
        await session.execute(
            insert(GrantingInstitutionSource).values(
                {
                    "rag_source_id": source_id,
                    "granting_institution_id": granting_institution.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "entity_type": "granting_institution",
        "entity_id": granting_institution.id,
        "source_id": source_id,
        "blob_name": "guidelines.pdf",
    }

    file_path = f"granting_institution/{granting_institution.id}/{source_id}/guidelines.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_source.first()
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED

        org_file = await session.scalars(
            select(GrantingInstitutionSource).where(GrantingInstitutionSource.rag_source_id == source.id)
        )
        org_file_record = org_file.first()
        assert org_file_record is not None
        assert org_file_record.granting_institution_id == granting_institution.id

    mock_download_blob.assert_awaited_once_with(file_path)
    mock_process_source.assert_awaited_once()


async def test_handle_file_indexing_grant_template(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
    project: Project,
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": "",
                    "source_type": RAG_FILE,
                    "parent_id": None,
                }
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "template.docx",
                    "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "size": 0,
                    "bucket_name": "test-bucket",
                    "object_path": f"grant_template/{grant_template.id}/{source_id}/template.docx",
                }
            )
        )
        await session.execute(
            insert(GrantTemplateSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_template_id": grant_template.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_template",
        "entity_id": grant_template.id,
        "source_id": source_id,
        "blob_name": "template.docx",
    }

    file_path = f"grant_template/{grant_template.id}/{source_id}/template.docx"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
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
            select(GrantTemplateSource).where(GrantTemplateSource.rag_source_id == source.id)
        )
        template_file_record = template_file.first()
        assert template_file_record is not None
        assert template_file_record.grant_template_id == grant_template.id

    mock_download_blob.assert_awaited_once_with(file_path)
    mock_process_source.assert_awaited_once()


async def test_handle_file_indexing_invalid_path(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_object_uri: MagicMock,
) -> None:
    mock_parse_object_uri.side_effect = KeyError("Invalid path format")

    pubsub_event = create_pubsub_event("invalid/path")
    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_file_indexing_unsupported_extension(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
) -> None:
    source_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": grant_application.id,
        "source_id": source_id,
        "blob_name": "document.unsupported",
    }

    file_path = f"grant_application/{grant_application.id}/{source_id}/document.unsupported"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_file_indexing_download_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
) -> None:
    source_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": grant_application.id,
        "source_id": source_id,
        "blob_name": "document.pdf",
    }

    mock_download_blob.side_effect = Exception("Download error")

    file_path = f"grant_application/{grant_application.id}/{source_id}/document.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_file_indexing_processing_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    source_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": source_id,
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": "",
                    "source_type": RAG_FILE,
                    "parent_id": None,
                }
            )
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "document.pdf",
                    "mime_type": "application/pdf",
                    "size": 0,
                    "bucket_name": "test-bucket",
                    "object_path": f"grant_application/{grant_application.id}/{source_id}/document.pdf",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": grant_application.id,
        "source_id": source_id,
        "blob_name": "document.pdf",
    }

    mock_process_source.side_effect = Exception("Processing error")

    file_path = f"grant_application/{grant_application.id}/{source_id}/document.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    async with async_session_maker() as session:
        rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_source.first()
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FAILED


async def test_handle_database_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    source_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": source_id,
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": "",
                    "source_type": RAG_FILE,
                    "parent_id": None,
                }
            )
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "document.pdf",
                    "mime_type": "application/pdf",
                    "size": 0,
                    "bucket_name": "test-bucket",
                    "object_path": f"grant_application/{grant_application.id}/{source_id}/document.pdf",
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": grant_application.id,
        "source_id": source_id,
        "blob_name": "document.pdf",
    }

    with patch("services.indexer.src.main.update_source_indexing_status") as mock_update:
        mock_update.side_effect = Exception("Database error")

        file_path = f"grant_application/{grant_application.id}/{source_id}/document.pdf"
        pubsub_event = create_pubsub_event(file_path)

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_invalid_pubsub_message(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
) -> None:
    invalid_event = {
        "message": {
            "messageId": "test-message-id",
            "publishTime": "2023-01-01T00:00:00Z",
            "data": "",
            "attributes": {},
        }
    }

    response = await test_client.post("/", json=msgspec.to_builtins(invalid_event))
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_file_indexing_existing_file(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    source_id_placeholder = "550e8400-e29b-41d4-a716-446655440000"
    object_path = f"grant_application/{grant_application.id}/{source_id_placeholder}/existing.pdf"
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.FINISHED,
                    "text_content": "Existing content",
                    "source_type": "rag_file",
                    "parent_id": None,
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
            insert(GrantApplicationSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": grant_application.id,
        "source_id": source_id,
        "blob_name": "existing.pdf",
    }

    pubsub_event = create_pubsub_event(object_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED, response.text

    mock_download_blob.assert_awaited_once_with(object_path)
    mock_process_source.assert_not_called()


async def test_handle_file_indexing_file_parsing_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    source_id = UUID("550e8400-e29b-41d4-a716-446655440000")

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": source_id,
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": "",
                    "source_type": RAG_FILE,
                    "parent_id": None,
                }
            )
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": source_id,
                    "filename": "document.pdf",
                    "mime_type": "application/pdf",
                    "size": 0,
                    "bucket_name": "test-bucket",
                    "object_path": f"grant_application/{grant_application.id}/{source_id}/document.pdf",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": grant_application.id,
        "source_id": source_id,
        "blob_name": "document.pdf",
    }

    mock_process_source.side_effect = FileParsingError("Failed to parse file", context={"filename": "document.pdf"})

    file_path = f"grant_application/{grant_application.id}/{source_id}/document.pdf"
    pubsub_event = create_pubsub_event(file_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    async with async_session_maker() as session:
        rag_source = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_source.first()
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FAILED


async def test_handle_file_indexing_retry_failed_file(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_process_source: AsyncMock,
    mock_parse_object_uri: MagicMock,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    source_id_placeholder = "550e8400-e29b-41d4-a716-446655440000"
    object_path = f"grant_application/{grant_application.id}/{source_id_placeholder}/failed.pdf"
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.FAILED,
                    "text_content": "",
                    "source_type": RAG_FILE,
                    "parent_id": None,
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
            insert(GrantApplicationSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    mock_parse_object_uri.return_value = {
        "entity_type": "grant_application",
        "entity_id": grant_application.id,
        "source_id": source_id,
        "blob_name": "failed.pdf",
    }

    pubsub_event = create_pubsub_event(object_path)

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session:
        rag_source = await session.get(RagSource, source_id)
        assert rag_source is not None
        assert rag_source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert rag_source.text_content == "Test extracted content"

    mock_download_blob.assert_awaited_once_with(object_path)
    mock_process_source.assert_awaited_once()
