from datetime import datetime, timedelta, UTC
from http import HTTPStatus
from typing import Any
from unittest.mock import patch
from uuid import uuid4
import base64

import pytest
from litestar.testing import AsyncTestClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import RagSource
from packages.shared_utils.src.serialization import serialize


def encode_crawling_request(
    source_id: str, url: str, entity_type: str = "grant_application"
) -> str:
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
    test_client: AsyncTestClient[Any],
) -> None:
    source_id = uuid4()
    url = "https://example.com"

    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.CREATED,
            text_content="",
        )
        session.add(source)

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.return_value = ([], "", [])

        with patch(
            "services.crawler.src.main.update_source_indexing_status"
        ) as mock_update:
            mock_update.return_value = None

            response = await test_client.post(
                "/",
                json={
                    "message": {"data": encode_crawling_request(str(source_id), url)}
                },
            )
            assert response.status_code == HTTPStatus.CREATED
            assert mock_crawl.called

    async with async_session_maker() as session:
        source = await session.get(RagSource, source_id)
        assert source.indexing_status == SourceIndexingStatusEnum.INDEXING
        assert source.indexing_started_at is not None


@pytest.mark.asyncio
async def test_concurrent_url_claim_second_returns_fast(
    async_session_maker: async_sessionmaker[Any],
    test_client: AsyncTestClient[Any],
) -> None:
    source_id = uuid4()
    url = "https://example.com"

    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            indexing_started_at=datetime.now(UTC),
            text_content="",
        )
        session.add(source)

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        response = await test_client.post(
            "/",
            json={"message": {"data": encode_crawling_request(str(source_id), url)}},
        )
        assert response.status_code == HTTPStatus.CREATED
        assert not mock_crawl.called


@pytest.mark.asyncio
async def test_already_finished_url_returns_fast(
    async_session_maker: async_sessionmaker[Any],
    test_client: AsyncTestClient[Any],
) -> None:
    source_id = uuid4()
    url = "https://example.com"

    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            indexing_started_at=datetime.now(UTC) - timedelta(minutes=5),
            text_content="Already processed content",
        )
        session.add(source)

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        response = await test_client.post(
            "/",
            json={"message": {"data": encode_crawling_request(str(source_id), url)}},
        )
        assert response.status_code == HTTPStatus.CREATED
        assert not mock_crawl.called


@pytest.mark.asyncio
async def test_stuck_job_recovery(
    async_session_maker: async_sessionmaker[Any],
    test_client: AsyncTestClient[Any],
) -> None:
    source_id = uuid4()
    url = "https://example.com"

    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            indexing_started_at=datetime.now(UTC) - timedelta(minutes=15),
            text_content="",
        )
        session.add(source)

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.return_value = ([], "", [])

        with patch(
            "services.crawler.src.main.update_source_indexing_status"
        ) as mock_update:
            mock_update.return_value = None

            response = await test_client.post(
                "/",
                json={
                    "message": {"data": encode_crawling_request(str(source_id), url)}
                },
            )
            assert response.status_code == HTTPStatus.CREATED
            assert mock_crawl.called

    async with async_session_maker() as session:
        source = await session.get(RagSource, source_id)
        assert source.indexing_status == SourceIndexingStatusEnum.INDEXING
        assert source.indexing_started_at > datetime.now(UTC) - timedelta(minutes=1)


@pytest.mark.asyncio
async def test_failed_source_can_be_retried(
    async_session_maker: async_sessionmaker[Any],
    test_client: AsyncTestClient[Any],
) -> None:
    source_id = uuid4()
    url = "https://example.com"

    async with async_session_maker() as session, session.begin():
        source = RagSource(
            id=source_id,
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.FAILED,
            indexing_started_at=datetime.now(UTC) - timedelta(minutes=30),
            text_content="",
        )
        session.add(source)

    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.return_value = ([], "", [])

        with patch(
            "services.crawler.src.main.update_source_indexing_status"
        ) as mock_update:
            mock_update.return_value = None

            response = await test_client.post(
                "/",
                json={
                    "message": {"data": encode_crawling_request(str(source_id), url)}
                },
            )
            assert response.status_code == HTTPStatus.CREATED
            assert mock_crawl.called

    async with async_session_maker() as session:
        source = await session.get(RagSource, source_id)
        assert source.indexing_status == SourceIndexingStatusEnum.INDEXING
        assert source.indexing_started_at > datetime.now(UTC) - timedelta(minutes=1)
