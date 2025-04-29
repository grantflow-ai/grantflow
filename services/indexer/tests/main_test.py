from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import FundingOrganization, GrantApplication, RagFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
def mock_download_blob() -> Generator[AsyncMock, None, None]:
    with patch("services.indexer.src.main.download_blob") as mock:
        mock.return_value = b"Test file content"
        yield mock


@pytest.fixture
def mock_parse_and_index_file() -> Generator[AsyncMock, None, None]:
    with patch("services.indexer.src.main.parse_and_index_file") as mock:
        mock.return_value = None
        yield mock


async def test_handle_file_indexing_success(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    file_data = {
        "file_path": "test-files/document.pdf",
        "mime_type": "application/pdf",
        "filename": "document.pdf",
        "size": 12345,
        "parent_id": str(grant_application.id),
        "parent_type": "grant_application",
        "bucket_name": "test-bucket",
        "object_path": "test-file-path",
    }

    response = await test_client.post("/", json=file_data)
    assert response.status_code == HTTPStatus.CREATED
    response_json = response.json()
    assert response_json["message"] == "File indexing successful."
    assert "file_id" in response_json
    file_id = response_json["file_id"]

    async with async_session_maker() as session:
        file_db = await session.scalars(select(RagFile).where(RagFile.id == UUID(file_id)))
        file = file_db.first()
        assert file is not None
        assert file.filename == "document.pdf"
        assert file.mime_type == "application/pdf"
        assert file.size == 12345
        assert file.indexing_status == FileIndexingStatusEnum.INDEXING

    mock_download_blob.assert_awaited_once_with("test-files/document.pdf")
    mock_parse_and_index_file.assert_awaited_once()
    assert mock_parse_and_index_file.call_args[1]["file_id"] == file_id
    assert mock_parse_and_index_file.call_args[1]["filename"] == "document.pdf"
    assert mock_parse_and_index_file.call_args[1]["mime_type"] == "application/pdf"


async def test_handle_file_indexing_success_organization(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
) -> None:
    file_data = {
        "file_path": "test-files/document2.pdf",
        "mime_type": "application/pdf",
        "filename": "document2.pdf",
        "size": 54321,
        "parent_id": str(funding_organization.id),
        "parent_type": "organization",
        "bucket_name": "test-bucket",
        "object_path": "test-file-path",
    }

    response = await test_client.post("/", json=file_data)
    assert response.status_code == HTTPStatus.CREATED
    response_json = response.json()
    assert response_json["message"] == "File indexing successful."
    assert "file_id" in response_json
    file_id = response_json["file_id"]

    async with async_session_maker() as session:
        file_db = await session.scalars(select(RagFile).where(RagFile.id == UUID(file_id)))
        file = file_db.first()
        assert file is not None
        assert file.filename == "document2.pdf"
        assert file.mime_type == "application/pdf"
        assert file.size == 54321
        assert file.indexing_status == FileIndexingStatusEnum.INDEXING

    mock_download_blob.assert_awaited_once_with("test-files/document2.pdf")
    mock_parse_and_index_file.assert_awaited_once()
    assert mock_parse_and_index_file.call_args[1]["file_id"] == file_id
    assert mock_parse_and_index_file.call_args[1]["filename"] == "document2.pdf"
    assert mock_parse_and_index_file.call_args[1]["mime_type"] == "application/pdf"


async def test_handle_file_indexing_download_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    file_data = {
        "file_path": "test-files/document.pdf",
        "mime_type": "application/pdf",
        "filename": "document.pdf",
        "size": 12345,
        "parent_id": "123e4567-e89b-12d3-a456-426614174000",
        "parent_type": "grant_application",
        "bucket_name": "test-bucket",
        "object_path": "test-file-path",
    }
    mock_download_blob.side_effect = Exception("Failed to download blob")

    response = await test_client.post("/", json=file_data)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    resp = response.json()
    assert resp["message"] == "An unexpected backend error occurred"
    assert "detail" in resp


async def test_handle_file_indexing_parsing_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    file_data = {
        "file_path": "test-files/document.pdf",
        "mime_type": "application/pdf",
        "filename": "document.pdf",
        "size": 12345,
        "parent_id": "123e4567-e89b-12d3-a456-426614174000",
        "parent_type": "grant_application",
        "bucket_name": "test-bucket",
        "object_path": "test-file-path",
    }
    mock_parse_and_index_file.side_effect = Exception("Failed to parse and index file")

    response = await test_client.post("/", json=file_data)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    resp = response.json()
    assert resp["message"] == "An unexpected backend error occurred"
    assert "detail" in resp


async def test_handle_file_indexing_bad_request(
    test_client: AsyncTestClient[Any],
) -> None:
    invalid_data = {
        "file_path": "test-files/document.pdf",
    }

    response = await test_client.post("/", json=invalid_data)
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_database_error(
    test_client: AsyncTestClient[Any],
) -> None:
    file_data = {
        "file_path": "test-files/document.pdf",
        "mime_type": "application/pdf",
        "filename": "document.pdf",
        "size": 12345,
        "parent_id": "123e4567-e89b-12d3-a456-426614174000",
        "parent_type": "grant_application",
        "bucket_name": "test-bucket",
        "object_path": "test-file-path",
    }

    with patch("sqlalchemy.insert") as mock_insert:
        mock_insert.side_effect = Exception("Database error")

        response = await test_client.post("/", json=file_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert "message" in response.json()
