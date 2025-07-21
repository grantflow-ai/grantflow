import json
from base64 import b64encode
from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, Mock, patch
from uuid import UUID, uuid4

import msgspec
import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.constants import RAG_URL
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitution,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    Project,
    RagSource,
    RagUrl,
)
from packages.shared_utils.src.pubsub import CrawlingRequest, PubSubEvent, PubSubMessage
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture(autouse=True)
def mock_crawl_url() -> Generator[AsyncMock]:
    with patch("services.crawler.src.main.crawl_url") as mock:
        embedding = [0.1] * 384

        async def crawl_url_side_effect(
            *, url: str, source_id: str
        ) -> tuple[list[dict[str, Any]], str, list[dict[str, Any]]]:
            return (
                [
                    {
                        "chunk": {"content": "test", "metadata": {}},
                        "embedding": embedding,
                        "rag_source_id": source_id,
                    }
                ],
                "Test content",
                [
                    {"filename": "test_doc.pdf", "content": b"Test PDF content"},
                    {"filename": "guidelines.docx", "content": b"Test DOCX content"},
                ],
            )

        mock.side_effect = crawl_url_side_effect
        yield mock


@pytest.fixture(autouse=True)
def mock_crawl_module() -> Generator[None]:
    with patch("services.crawler.src.extraction.crawl"):
        yield


@pytest.fixture(autouse=True)
def mock_upload_blob() -> Generator[AsyncMock]:
    with patch("services.crawler.src.main.upload_blob") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture(autouse=True)
def mock_construct_object_uri() -> Generator[Mock]:
    with patch("services.crawler.src.main.construct_object_uri") as mock:

        def side_effect(
            *,
            entity_type: str,
            entity_id: str,
            source_id: str,
            blob_name: str,
        ) -> str:
            return f"{entity_type}/{entity_id}/{source_id}/{blob_name}"

        mock.side_effect = side_effect
        yield mock


@pytest.fixture(autouse=True)
def mock_publish_notification() -> Generator[AsyncMock]:
    with patch("packages.db.src.utils.publish_notification") as mock:
        mock.return_value = None
        yield mock


def create_crawling_request(
    entity_id: UUID,
    source_id: UUID,
    entity_type: str = "organization",
    url: str = "https://example.org/docs",
) -> dict[str, str]:
    request: dict[str, str] = {
        "entity_id": str(entity_id),
        "entity_type": entity_type,
        "source_id": str(source_id),
        "url": url,
    }

    return request


def create_pubsub_event(
    entity_id: UUID,
    source_id: UUID,
    entity_type: str = "organization",
    url: str = "https://example.org/docs",
) -> PubSubEvent:
    message_data = {
        "entity_id": str(entity_id),
        "entity_type": entity_type,
        "source_id": str(source_id),
        "url": url,
    }

    return PubSubEvent(
        message=PubSubMessage(
            message_id="test-message-id",
            publish_time="2023-01-01T00:00:00Z",
            data=b64encode(json.dumps(message_data).encode("utf-8")).decode("utf-8"),
            attributes={},
        )
    )


async def test_handle_url_crawling_pubsub_event_grant_application(
    test_client: AsyncTestClient[Any],
    mock_crawl_url: AsyncMock,
    mock_upload_blob: AsyncMock,
    mock_construct_object_uri: Mock,
    mock_publish_notification: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project: Project,
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                [
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "text_content": "",
                        "source_type": RAG_URL,
                    }
                ]
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagUrl).values(
                [
                    {
                        "id": source_id,
                        "url": "https://example.org/docs",
                    }
                ]
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

    pubsub_event = create_pubsub_event(
        entity_id=project.organization_id,
        source_id=source_id,
        entity_type="organization",
    )

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        source = await session.scalar(
            select(RagSource).where(RagSource.id == source_id)
        )
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert source.text_content == "Test content"

    assert mock_upload_blob.await_count == 2

    assert mock_publish_notification.call_count == 2

    final_call_kwargs = mock_publish_notification.call_args.kwargs
    assert final_call_kwargs["parent_id"] == grant_application.id
    assert final_call_kwargs["event"] == "source_processing"
    assert final_call_kwargs["data"]["source_id"] == source_id
    assert (
        final_call_kwargs["data"]["indexing_status"]
        == SourceIndexingStatusEnum.FINISHED
    )
    assert final_call_kwargs["data"]["identifier"] == "https://example.org/docs"


async def test_handle_url_crawling_funding_organization(
    test_client: AsyncTestClient[Any],
    mock_crawl_url: AsyncMock,
    mock_upload_blob: AsyncMock,
    mock_construct_object_uri: Mock,
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                [
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "text_content": "",
                        "source_type": RAG_URL,
                    }
                ]
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagUrl).values(
                [
                    {
                        "id": source_id,
                        "url": "https://example.org/docs",
                    }
                ]
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

    pubsub_event = create_pubsub_event(
        entity_id=granting_institution.id,
        source_id=source_id,
        entity_type="granting_institution",
    )

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        source = await session.scalar(
            select(RagSource).where(RagSource.id == source_id)
        )
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED

    assert mock_upload_blob.await_count == 2


async def test_handle_url_crawling_grant_template(
    test_client: AsyncTestClient[Any],
    mock_crawl_url: AsyncMock,
    mock_upload_blob: AsyncMock,
    mock_construct_object_uri: Mock,
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
    project: Project,
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                [
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "text_content": "",
                        "source_type": RAG_URL,
                    }
                ]
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagUrl).values(
                [
                    {
                        "id": source_id,
                        "url": "https://example.org/docs",
                    }
                ]
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

    pubsub_event = create_pubsub_event(
        entity_id=project.organization_id,
        source_id=source_id,
        entity_type="organization",
    )

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        source = await session.scalar(
            select(RagSource).where(RagSource.id == source_id)
        )
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED

    assert mock_upload_blob.await_count == 2


async def test_handle_url_crawling_no_files_returned(
    test_client: AsyncTestClient[Any],
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project: Project,
    mock_upload_blob: AsyncMock,
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                [
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "text_content": "",
                        "source_type": RAG_URL,
                    }
                ]
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagUrl).values(
                [
                    {
                        "id": source_id,
                        "url": "https://example.org/docs",
                    }
                ]
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

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:

        async def crawl_url_side_effect(
            *, url: str, source_id: str
        ) -> tuple[list[dict[str, Any]], str, list[dict[str, Any]]]:
            embedding = [0.1] * 384
            return (
                [
                    {
                        "chunk": {"content": "test", "metadata": {}},
                        "embedding": embedding,
                        "rag_source_id": source_id,
                    }
                ],
                "Test content",
                [],
            )

        mock_crawl.side_effect = crawl_url_side_effect

        pubsub_event = create_pubsub_event(
            entity_id=project.organization_id,
            source_id=source_id,
            entity_type="organization",
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.CREATED, response.text

        mock_upload_blob.assert_not_called()


async def test_handle_url_crawling_database_error(
    test_client: AsyncTestClient[Any],
    grant_application: GrantApplication,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                [
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "text_content": "",
                        "source_type": RAG_URL,
                    }
                ]
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagUrl).values(
                [
                    {
                        "id": source_id,
                        "url": "https://example.org/docs",
                    }
                ]
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

    with patch(
        "services.crawler.src.main.update_source_indexing_status"
    ) as mock_update:
        mock_update.side_effect = Exception("Database error")

        pubsub_event = create_pubsub_event(
            entity_id=project.organization_id,
            source_id=source_id,
            entity_type="organization",
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_url_crawling_extraction_error(
    test_client: AsyncTestClient[Any],
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project: Project,
    mock_publish_notification: AsyncMock,
) -> None:
    from packages.shared_utils.src.exceptions import UrlParsingError

    source_id: UUID

    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                [
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "text_content": "",
                        "source_type": RAG_URL,
                    }
                ]
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagUrl).values(
                [
                    {
                        "id": source_id,
                        "url": "https://example.org/docs",
                    }
                ]
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

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.side_effect = UrlParsingError("Failed to parse URL")

        pubsub_event = create_pubsub_event(
            entity_id=project.organization_id,
            source_id=source_id,
            entity_type="organization",
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.CREATED

        async with async_session_maker() as session:
            source = await session.scalar(
                select(RagSource).where(RagSource.id == source_id)
            )
            assert source is not None
            assert source.indexing_status == SourceIndexingStatusEnum.FAILED

        assert mock_publish_notification.call_count == 2

        final_call_kwargs = mock_publish_notification.call_args.kwargs
        assert final_call_kwargs["parent_id"] == grant_application.id
        assert final_call_kwargs["event"] == "source_processing"
        assert final_call_kwargs["data"]["source_id"] == source_id
        assert (
            final_call_kwargs["data"]["indexing_status"]
            == SourceIndexingStatusEnum.FAILED
        )
        assert final_call_kwargs["data"]["identifier"] == "https://example.org/docs"


async def test_handle_url_crawling_network_error(
    test_client: AsyncTestClient[Any],
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project: Project,
    mock_publish_notification: AsyncMock,
) -> None:
    from httpx import ConnectError

    source_id: UUID

    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                [
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "text_content": "",
                        "source_type": RAG_URL,
                    }
                ]
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagUrl).values(
                [
                    {
                        "id": source_id,
                        "url": "https://example.org/docs",
                    }
                ]
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

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.side_effect = ConnectError("[Errno -2] Name or service not known")

        pubsub_event = create_pubsub_event(
            entity_id=project.organization_id,
            source_id=source_id,
            entity_type="organization",
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.CREATED

        async with async_session_maker() as session:
            source = await session.scalar(
                select(RagSource).where(RagSource.id == source_id)
            )
            assert source is not None
            assert source.indexing_status == SourceIndexingStatusEnum.FAILED

        assert mock_publish_notification.call_count == 2

        final_call_kwargs = mock_publish_notification.call_args.kwargs
        assert final_call_kwargs["parent_id"] == grant_application.id
        assert final_call_kwargs["event"] == "source_processing"
        assert final_call_kwargs["data"]["source_id"] == source_id
        assert (
            final_call_kwargs["data"]["indexing_status"]
            == SourceIndexingStatusEnum.FAILED
        )
        assert final_call_kwargs["data"]["identifier"] == "https://example.org/docs"


async def test_handle_upload_blob_called_with_correct_parameters(
    test_client: AsyncTestClient[Any],
    mock_upload_blob: AsyncMock,
    mock_construct_object_uri: Mock,
    grant_application: GrantApplication,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        source_id = await session.scalar(
            insert(RagSource)
            .values(
                [
                    {
                        "indexing_status": SourceIndexingStatusEnum.CREATED,
                        "text_content": "",
                        "source_type": RAG_URL,
                    }
                ]
            )
            .returning(RagSource.id)
        )
        await session.execute(
            insert(RagUrl).values(
                [
                    {
                        "id": source_id,
                        "url": "https://example.org/docs",
                    }
                ]
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

    pubsub_event = create_pubsub_event(
        entity_id=project.organization_id,
        source_id=source_id,
        entity_type="organization",
    )

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED

    assert mock_construct_object_uri.call_count == 2
    first_call_kwargs = mock_construct_object_uri.call_args_list[0][1]
    assert first_call_kwargs["entity_type"] == "organization"
    assert first_call_kwargs["entity_id"] == str(project.organization_id)
    assert "source_id" in first_call_kwargs
    assert "blob_name" in first_call_kwargs

    assert mock_upload_blob.await_count == 2
    first_upload_call_args = mock_upload_blob.call_args_list[0][0]
    assert len(first_upload_call_args) >= 1
    blob_path = first_upload_call_args[0]
    assert str(project.organization_id) in blob_path


async def test_decode_pubsub_message(
    test_client: AsyncTestClient[Any],
    grant_application: GrantApplication,
    project: Project,
) -> None:
    source_id = uuid4()
    pubsub_event = create_pubsub_event(
        entity_id=project.organization_id,
        source_id=source_id,
        entity_type="organization",
        url="https://example.com/test",
    )

    with patch("services.crawler.src.main.decode_pubsub_message") as mock_decode:
        mock_decode.return_value = CrawlingRequest(
            entity_id=project.organization_id,
            entity_type="organization",
            source_id=source_id,
            url="https://example.com/test",
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.CREATED

        mock_decode.assert_called_once()


async def test_invalid_pubsub_message(
    test_client: AsyncTestClient[Any],
) -> None:
    invalid_event = {
        "message": {
            "message_id": "test-message-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "data": "invalid-base64-data",
            "attributes": {},
        }
    }

    response = await test_client.post("/", json=invalid_event)
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_pubsub_message_missing_required_fields(
    test_client: AsyncTestClient[Any],
) -> None:
    message_data = {
        "entity_id": str(uuid4()),
        "url": "https://example.org/docs",
    }

    pubsub_event = {
        "message": {
            "message_id": "test-message-id",
            "publish_time": "2023-01-01T00:00:00Z",
            "data": b64encode(json.dumps(message_data).encode("utf-8")).decode("utf-8"),
            "attributes": {},
        }
    }

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_url_crawling_skipped_url(
    test_client: AsyncTestClient[Any],
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project: Project,
    mock_publish_notification: AsyncMock,
) -> None:
    source_id = uuid4()
    pubsub_event = create_pubsub_event(
        entity_id=project.organization_id,
        source_id=source_id,
        entity_type="organization",
        url="https://x.com/NIHFunding",
    )

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session:
        rag_sources = await session.scalars(select(RagSource))
        assert len(list(rag_sources)) == 0

    mock_publish_notification.assert_not_called()


async def test_handle_url_crawling_existing_url(
    test_client: AsyncTestClient[Any],
    mock_crawl_url: AsyncMock,
    mock_upload_blob: AsyncMock,
    mock_publish_notification: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    pass
