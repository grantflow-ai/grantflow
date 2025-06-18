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
    FundingOrganization,
    FundingOrganizationRagSource,
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateRagSource,
    RagSource,
    RagUrl,
)
from packages.shared_utils.src.pubsub import CrawlingRequest, PubSubEvent, PubSubMessage
from packages.shared_utils.src.shared_types import ParentType
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
        mock.return_value = "test-bucket/test-path/test-file.pdf"
        yield mock


@pytest.fixture(autouse=True)
def mock_publish_notification() -> Generator[AsyncMock]:
    with patch("services.crawler.src.main.publish_notification") as mock:
        mock.return_value = None
        yield mock


def create_crawling_request(
    parent_id: UUID,
    source_id: UUID,
    url: str = "https://example.org/docs",
    workspace_id: UUID | None = None,
) -> dict[str, str]:
    request: dict[str, str] = {
        "parent_id": str(parent_id),
        "source_id": str(source_id),
        "url": url,
        "workspace_id": str(workspace_id) if workspace_id else str(parent_id),
    }

    return request


def create_pubsub_event(
    parent_id: UUID,
    source_id: UUID,
    url: str = "https://example.org/docs",
    workspace_id: UUID | None = None,
) -> PubSubEvent:
    message_data = {
        "parent_id": str(parent_id),
        "source_id": str(source_id),
        "url": url,
        "workspace_id": str(workspace_id) if workspace_id else str(parent_id),
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
) -> None:
    workspace_id = uuid4()

    # Create RAG source and URL record first
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
            insert(GrantApplicationRagSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    pubsub_event = create_pubsub_event(
        parent_id=grant_application.id,
        source_id=source_id,
        workspace_id=workspace_id,
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

    # Should be called twice: once for INDEXING and once for FINISHED
    assert mock_publish_notification.call_count == 2

    # Check the final call (FINISHED status)
    final_call_kwargs = mock_publish_notification.call_args.kwargs
    assert final_call_kwargs["parent_id"] == grant_application.id
    assert final_call_kwargs["event"] == "source_processing"
    assert final_call_kwargs["data"]["parent_id"] == grant_application.id
    assert final_call_kwargs["data"]["parent_type"] == "grant_application"
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
    funding_organization: FundingOrganization,
) -> None:
    # Create RAG source and URL record first
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
            insert(FundingOrganizationRagSource).values(
                {
                    "rag_source_id": source_id,
                    "funding_organization_id": funding_organization.id,
                }
            )
        )

    pubsub_event = create_pubsub_event(
        parent_id=funding_organization.id,
                source_id=source_id,
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
) -> None:
    workspace_id = uuid4()

    # Create RAG source and URL record first
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
            insert(GrantTemplateRagSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_template_id": grant_template.id,
                }
            )
        )

    pubsub_event = create_pubsub_event(
        parent_id=grant_template.id,
                source_id=source_id,
        workspace_id=workspace_id,
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
    mock_upload_blob: AsyncMock,
) -> None:
    # Create RAG source and URL record first
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
            insert(GrantApplicationRagSource).values(
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
            parent_id=grant_application.id,
                        source_id=source_id,
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.CREATED, response.text

        mock_upload_blob.assert_not_called()


async def test_handle_url_crawling_database_error(
    test_client: AsyncTestClient[Any],
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    # Create RAG source and URL record first
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
            insert(GrantApplicationRagSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    with patch("services.crawler.src.main.update_rag_source_status") as mock_update:
        mock_update.side_effect = Exception("Database error")

        pubsub_event = create_pubsub_event(
            parent_id=grant_application.id,
                        source_id=source_id,
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_url_crawling_extraction_error(
    test_client: AsyncTestClient[Any],
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    mock_publish_notification: AsyncMock,
) -> None:
    from packages.shared_utils.src.exceptions import UrlParsingError

    source_id: UUID
    # Create RAG source and URL record first
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
            insert(GrantApplicationRagSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.side_effect = UrlParsingError("Failed to parse URL")

        pubsub_event = create_pubsub_event(
            parent_id=grant_application.id,
                        source_id=source_id,
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.CREATED

        async with async_session_maker() as session:
            source = await session.scalar(
                select(RagSource).where(RagSource.id == source_id)
            )
            assert source is not None
            assert source.indexing_status == SourceIndexingStatusEnum.FAILED

        # Should be called twice: once for INDEXING and once for FAILED
        assert mock_publish_notification.call_count == 2

        # Check the final call (FAILED status)
        final_call_kwargs = mock_publish_notification.call_args.kwargs
        assert final_call_kwargs["parent_id"] == grant_application.id
        assert final_call_kwargs["event"] == "source_processing"
        assert final_call_kwargs["data"]["parent_id"] == grant_application.id
        assert final_call_kwargs["data"]["parent_type"] == "grant_application"
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
    mock_publish_notification: AsyncMock,
) -> None:
    from httpx import ConnectError

    source_id: UUID
    # Create RAG source and URL record first
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
            insert(GrantApplicationRagSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.side_effect = ConnectError("[Errno -2] Name or service not known")

        pubsub_event = create_pubsub_event(
            parent_id=grant_application.id,
                        source_id=source_id,
        )

        response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
        assert response.status_code == HTTPStatus.CREATED

        async with async_session_maker() as session:
            source = await session.scalar(
                select(RagSource).where(RagSource.id == source_id)
            )
            assert source is not None
            assert source.indexing_status == SourceIndexingStatusEnum.FAILED

        # Should be called twice: once for INDEXING and once for FAILED
        assert mock_publish_notification.call_count == 2

        # Check the final call (FAILED status)
        final_call_kwargs = mock_publish_notification.call_args.kwargs
        assert final_call_kwargs["parent_id"] == grant_application.id
        assert final_call_kwargs["event"] == "source_processing"
        assert final_call_kwargs["data"]["parent_id"] == grant_application.id
        assert final_call_kwargs["data"]["parent_type"] == "grant_application"
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
    async_session_maker: async_sessionmaker[Any],
) -> None:
    workspace_id = uuid4()

    # Create RAG source and URL record first
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
            insert(GrantApplicationRagSource).values(
                {
                    "rag_source_id": source_id,
                    "grant_application_id": grant_application.id,
                }
            )
        )

    pubsub_event = create_pubsub_event(
        parent_id=grant_application.id,
                source_id=source_id,
        workspace_id=workspace_id,
    )

    response = await test_client.post("/", json=msgspec.to_builtins(pubsub_event))
    assert response.status_code == HTTPStatus.CREATED

    assert mock_construct_object_uri.call_count == 2
    assert mock_construct_object_uri.call_args_list[0][1]["source_id"] == source_id
    assert mock_construct_object_uri.call_args_list[0][1]["workspace_id"] == str(
        workspace_id
    )
    assert "blob_name" in mock_construct_object_uri.call_args_list[0][1]

    assert mock_upload_blob.await_count == 2
    assert (
        mock_upload_blob.call_args_list[0][1]["blob_path"]
        == "test-bucket/test-path/test-file.pdf"
    )


async def test_decode_pubsub_message(
    test_client: AsyncTestClient[Any],
    grant_application: GrantApplication,
) -> None:
    workspace_id = uuid4()
    source_id = uuid4()
    pubsub_event = create_pubsub_event(
        parent_id=grant_application.id,
        source_id=source_id,
        workspace_id=workspace_id,
        url="https://example.com/test",
    )

    with patch("services.crawler.src.main.decode_pubsub_message") as mock_decode:
        mock_decode.return_value = CrawlingRequest(
            parent_id=grant_application.id,
            source_id=source_id,
            workspace_id=workspace_id,
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
        "parent_id": str(uuid4()),
        "url": "https://example.org/docs",
        # Missing source_id and workspace_id
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
    mock_publish_notification: AsyncMock,
) -> None:
    source_id = uuid4()
    pubsub_event = create_pubsub_event(
        parent_id=grant_application.id,
                source_id=source_id,
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
    # This test is no longer relevant since the architecture changed -
    # sources are now created in the backend, not the crawler
    # We'll remove the "existing URL" logic from the crawler
    pass
