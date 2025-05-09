from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, Mock, patch
from uuid import UUID, uuid4

import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.enums import FileIndexingStatusEnum
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
from packages.shared_utils.src.shared_types import ParentType
from services.crawler.src.main import CrawlingRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture(autouse=True)
def mock_crawl_url() -> Generator[AsyncMock, None, None]:
    with patch("services.crawler.src.main.crawl_url") as mock:
        mock.return_value = [
            {"filename": "test_doc.pdf", "content": b"Test PDF content"},
            {"filename": "guidelines.docx", "content": b"Test DOCX content"},
        ]
        yield mock


@pytest.fixture(autouse=True)
def mock_crawl_url_module() -> Generator[None, None, None]:
    """Mock the crawl_url module to prevent actual web crawling."""
    with patch("services.crawler.src.extraction.AsyncWebCrawler"):
        yield


@pytest.fixture(autouse=True)
def mock_upload_blob() -> Generator[AsyncMock, None, None]:
    with patch("services.crawler.src.main.upload_blob") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture(autouse=True)
def mock_construct_object_uri() -> Generator[Mock, None, None]:
    with patch("services.crawler.src.main.construct_object_uri") as mock:
        mock.return_value = "test-bucket/test-path/test-file.pdf"
        yield mock


def create_crawling_request(
    parent_id: UUID,
    parent_type: ParentType,
    url: str = "https://example.org/docs",
    workspace_id: UUID | None = None,
) -> CrawlingRequest:
    request: CrawlingRequest = {
        "parent_id": str(parent_id),  # type: ignore[typeddict-item]
        "parent_type": parent_type,
        "url": url,
    }

    if workspace_id:
        request["workspace_id"] = str(workspace_id)  # type: ignore[typeddict-item]

    return request


async def test_handle_url_crawling_grant_application(
    test_client: AsyncTestClient[Any],
    mock_crawl_url: AsyncMock,
    mock_upload_blob: AsyncMock,
    mock_construct_object_uri: Mock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    workspace_id = uuid4()
    request = create_crawling_request(
        parent_id=grant_application.id,
        parent_type="grant_application",
        workspace_id=workspace_id,
    )

    response = await test_client.post("/", json=request)
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        rag_sources = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_sources.first()
        assert source is not None
        assert source.indexing_status == FileIndexingStatusEnum.INDEXING
        assert source.text_content == ""

        rag_url = await session.scalars(select(RagUrl).where(RagUrl.id == source.id))
        url_record = rag_url.first()
        assert url_record is not None
        assert url_record.url == request["url"]

        app_source = await session.scalars(
            select(GrantApplicationRagSource).where(GrantApplicationRagSource.rag_source_id == source.id)
        )
        app_source_record = app_source.first()
        assert app_source_record is not None
        assert app_source_record.grant_application_id == grant_application.id

    assert mock_upload_blob.await_count == 2


async def test_handle_url_crawling_funding_organization(
    test_client: AsyncTestClient[Any],
    mock_crawl_url: AsyncMock,
    mock_upload_blob: AsyncMock,
    mock_construct_object_uri: Mock,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
) -> None:
    request = create_crawling_request(
        parent_id=funding_organization.id,
        parent_type="funding_organization",
    )

    response = await test_client.post("/", json=request)
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        rag_sources = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_sources.first()
        assert source is not None
        assert source.indexing_status == FileIndexingStatusEnum.INDEXING

        org_source = await session.scalars(
            select(FundingOrganizationRagSource).where(FundingOrganizationRagSource.rag_source_id == source.id)
        )
        org_source_record = org_source.first()
        assert org_source_record is not None
        assert org_source_record.funding_organization_id == funding_organization.id

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
    request = create_crawling_request(
        parent_id=grant_template.id,
        parent_type="grant_template",
        workspace_id=workspace_id,
    )

    response = await test_client.post("/", json=request)
    assert response.status_code == HTTPStatus.CREATED, response.text

    async with async_session_maker() as session:
        rag_sources = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
        source = rag_sources.first()
        assert source is not None
        assert source.indexing_status == FileIndexingStatusEnum.INDEXING

        template_source = await session.scalars(
            select(GrantTemplateRagSource).where(GrantTemplateRagSource.rag_source_id == source.id)
        )
        template_source_record = template_source.first()
        assert template_source_record is not None
        assert template_source_record.grant_template_id == grant_template.id

    assert mock_upload_blob.await_count == 2


async def test_handle_url_crawling_no_files_returned(
    test_client: AsyncTestClient[Any],
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    with patch("services.crawler.src.main.crawl_url"):
        request = create_crawling_request(
            parent_id=grant_application.id,
            parent_type="grant_application",
        )

        response = await test_client.post("/", json=request)
        assert response.status_code == HTTPStatus.CREATED, response.text

        with patch("services.crawler.src.main.upload_blob") as mock_upload:
            assert mock_upload.await_count == 0


async def test_handle_url_crawling_database_error(
    test_client: AsyncTestClient[Any],
    grant_application: GrantApplication,
) -> None:
    with patch("services.crawler.src.main.insert") as mock_insert:
        mock_insert.side_effect = Exception("Database error")

        request = create_crawling_request(
            parent_id=grant_application.id,
            parent_type="grant_application",
        )

        response = await test_client.post("/", json=request)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_url_crawling_extraction_error(
    test_client: AsyncTestClient[Any],
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    with patch("services.crawler.src.main.crawl_url") as mock_crawl:
        mock_crawl.side_effect = Exception("Extraction error")

        request = create_crawling_request(
            parent_id=grant_application.id,
            parent_type="grant_application",
        )

        response = await test_client.post("/", json=request)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

        async with async_session_maker() as session:
            rag_sources = await session.scalars(select(RagSource).order_by(RagSource.created_at.desc()))
            source = rag_sources.first()
            assert source is not None


async def test_handle_upload_blob_is_called(
    test_client: AsyncTestClient[Any],
    mock_upload_blob: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    """Test that upload_blob is called when files are returned."""
    request = create_crawling_request(
        parent_id=grant_application.id,
        parent_type="grant_application",
    )

    response = await test_client.post("/", json=request)
    assert response.status_code == HTTPStatus.CREATED

    assert mock_upload_blob.await_count == 2
