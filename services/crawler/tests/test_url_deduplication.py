from datetime import datetime, timedelta, UTC
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import base64

import pytest
from litestar.stores.memory import MemoryStore
from sqlalchemy.ext.asyncio import async_sessionmaker

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import RagSource
from packages.shared_utils.src.serialization import serialize
from services.crawler.src.main import handle_url_crawling


def encode_crawling_request(
    source_id: str, url: str, entity_type: str = "grant_application"
) -> str:
    """Helper to encode a crawling request as base64."""
    data = {
        "source_id": source_id,
        "url": url,
        "entity_type": entity_type,
        "entity_id": str(uuid4()),
        "trace_id": "test-trace-id",
    }
    return base64.b64encode(serialize(data)).decode()


@pytest.mark.asyncio
async def test_concurrent_url_claim_first_wins(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that only one container can claim a URL for processing."""
    source_id = uuid4()
    url = "https://example.com"

    # Create a RagSource in CREATED state
    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.CREATED,
            text_content="",
        )
        session.add(source)

    # Mock request with memory store
    mock_request = MagicMock()
    mock_memory_store = AsyncMock(spec=MemoryStore)
    mock_memory_store.set = AsyncMock()
    mock_memory_store.get = AsyncMock(return_value=None)
    mock_memory_store.delete = AsyncMock()
    mock_request.app.stores.get.return_value = mock_memory_store

    # Mock crawl_url to not actually crawl
    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.return_value = ([], "", [])

        # Mock update_source_indexing_status
        with patch(
            "services.crawler.src.main.update_source_indexing_status"
        ) as mock_update:
            mock_update.return_value = None

            # First request should succeed
            pubsub_event = {
                "message": {"data": encode_crawling_request(str(source_id), url)}
            }

            await handle_url_crawling(
                data=pubsub_event,
                session_maker=async_session_maker,
                request=mock_request,
            )

            assert mock_crawl.called
            assert mock_memory_store.set.called
            assert mock_memory_store.delete.called

    # Verify status was changed to INDEXING
    async with async_session_maker() as session:
        source = await session.get(RagSource, source_id)
        assert source.indexing_status == SourceIndexingStatusEnum.INDEXING
        assert source.indexing_started_at is not None


@pytest.mark.asyncio
async def test_concurrent_url_claim_second_returns_fast(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that second container returns immediately if URL is being processed."""
    source_id = uuid4()
    url = "https://example.com"

    # Create a RagSource already in INDEXING state (claimed by another container)
    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            indexing_started_at=datetime.now(UTC),
            text_content="",
        )
        session.add(source)

    mock_request = MagicMock()
    mock_memory_store = AsyncMock(spec=MemoryStore)
    mock_request.app.stores.get.return_value = mock_memory_store

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        pubsub_event = {
            "message": {"data": encode_crawling_request(str(source_id), url)}
        }

        # Should return without calling crawl_url
        await handle_url_crawling(
            data=pubsub_event,
            session_maker=async_session_maker,
            request=mock_request,
        )

        assert not mock_crawl.called
        assert not mock_memory_store.set.called  # Should not initialize memory store


@pytest.mark.asyncio
async def test_already_finished_url_returns_fast(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that containers return immediately for already processed URLs."""
    source_id = uuid4()
    url = "https://example.com"

    # Create a RagSource already in FINISHED state
    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            indexing_started_at=datetime.now(UTC) - timedelta(minutes=5),
            text_content="Already processed content",
        )
        session.add(source)

    mock_request = MagicMock()
    mock_memory_store = AsyncMock(spec=MemoryStore)
    mock_request.app.stores.get.return_value = mock_memory_store

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        pubsub_event = {
            "message": {"data": encode_crawling_request(str(source_id), url)}
        }

        # Should return without calling crawl_url
        await handle_url_crawling(
            data=pubsub_event,
            session_maker=async_session_maker,
            request=mock_request,
        )

        assert not mock_crawl.called
        assert not mock_memory_store.set.called


@pytest.mark.asyncio
async def test_stuck_job_recovery(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that stuck jobs (>10 minutes) can be reclaimed."""
    source_id = uuid4()
    url = "https://example.com"

    # Create a RagSource stuck in INDEXING for 15 minutes
    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            indexing_started_at=datetime.now(UTC) - timedelta(minutes=15),
            text_content="",
        )
        session.add(source)

    mock_request = MagicMock()
    mock_memory_store = AsyncMock(spec=MemoryStore)
    mock_memory_store.set = AsyncMock()
    mock_memory_store.get = AsyncMock(return_value=None)
    mock_memory_store.delete = AsyncMock()
    mock_request.app.stores.get.return_value = mock_memory_store

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.return_value = ([], "", [])

        with patch(
            "services.crawler.src.main.update_source_indexing_status"
        ) as mock_update:
            mock_update.return_value = None

            pubsub_event = {
                "message": {"data": encode_crawling_request(str(source_id), url)}
            }

            # Should reclaim and process the stuck job
            await handle_url_crawling(
                data=pubsub_event,
                session_maker=async_session_maker,
                request=mock_request,
            )

            assert mock_crawl.called
            assert mock_memory_store.set.called

    # Verify indexing_started_at was updated
    async with async_session_maker() as session:
        source = await session.get(RagSource, source_id)
        assert source.indexing_status == SourceIndexingStatusEnum.INDEXING
        # Should be recent (within last minute)
        assert source.indexing_started_at > datetime.now(UTC) - timedelta(minutes=1)


@pytest.mark.asyncio
async def test_memory_store_prevents_duplicate_crawls_in_session() -> None:
    """Test that memory store prevents revisiting URLs within a crawl session."""
    memory_store = MemoryStore()
    session_key = "visited_urls:test"

    # Simulate crawl function behavior
    async def simulate_crawl_with_memory(url: str) -> bool:
        visited = await memory_store.get(session_key) or set()
        if url in visited:
            return False  # Already visited
        visited.add(url)
        await memory_store.set(session_key, visited, expires_in=3600)
        return True  # New URL

    # First visit should succeed
    assert await simulate_crawl_with_memory("https://example.com") is True

    # Second visit should be blocked
    assert await simulate_crawl_with_memory("https://example.com") is False

    # Different URL should succeed
    assert await simulate_crawl_with_memory("https://other.com") is True

    # Verify the set contains both URLs
    visited_urls = await memory_store.get(session_key)
    assert visited_urls == {"https://example.com", "https://other.com"}


@pytest.mark.asyncio
async def test_memory_store_cleanup_on_error(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that memory store is cleaned up even when crawling fails."""
    source_id = uuid4()
    url = "https://example.com"

    # Create a RagSource in CREATED state
    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.CREATED,
            text_content="",
        )
        session.add(source)

    mock_request = MagicMock()
    mock_memory_store = AsyncMock(spec=MemoryStore)
    mock_memory_store.set = AsyncMock()
    mock_memory_store.get = AsyncMock(return_value=None)
    mock_memory_store.delete = AsyncMock()
    mock_request.app.stores.get.return_value = mock_memory_store

    # Mock crawl_url to raise an exception
    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.side_effect = Exception("Crawling failed")

        with patch(
            "services.crawler.src.main.update_source_indexing_status"
        ) as mock_update:
            mock_update.return_value = None

            pubsub_event = {
                "message": {"data": encode_crawling_request(str(source_id), url)}
            }

            await handle_url_crawling(
                data=pubsub_event,
                session_maker=async_session_maker,
                request=mock_request,
            )

            # Memory store should still be cleaned up
            assert mock_memory_store.delete.called
            mock_memory_store.delete.assert_called_with(f"visited_urls:{source_id}")


@pytest.mark.asyncio
async def test_failed_source_can_be_retried(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test that failed sources can be retried."""
    source_id = uuid4()
    url = "https://example.com"

    # Create a RagSource in FAILED state
    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.FAILED,
            indexing_started_at=datetime.now(UTC) - timedelta(minutes=30),
            text_content="",
        )
        session.add(source)

    mock_request = MagicMock()
    mock_memory_store = AsyncMock(spec=MemoryStore)
    mock_memory_store.set = AsyncMock()
    mock_memory_store.get = AsyncMock(return_value=None)
    mock_memory_store.delete = AsyncMock()
    mock_request.app.stores.get.return_value = mock_memory_store

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.return_value = ([], "", [])

        with patch(
            "services.crawler.src.main.update_source_indexing_status"
        ) as mock_update:
            mock_update.return_value = None

            pubsub_event = {
                "message": {"data": encode_crawling_request(str(source_id), url)}
            }

            # Should process the failed job
            await handle_url_crawling(
                data=pubsub_event,
                session_maker=async_session_maker,
                request=mock_request,
            )

            assert mock_crawl.called

    # Verify status was changed to INDEXING
    async with async_session_maker() as session:
        source = await session.get(RagSource, source_id)
        assert source.indexing_status == SourceIndexingStatusEnum.INDEXING
        assert source.indexing_started_at > datetime.now(UTC) - timedelta(minutes=1)
