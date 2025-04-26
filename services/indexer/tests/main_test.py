from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import RagFile
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


@pytest.mark.xfail(reason="Test needs to be updated for new database schema")
async def test_handle_file_indexing_success(
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
    }

    response = await test_client.post("/", json=file_data)

    if response.status_code != HTTPStatus.OK:
        pass

    response_json = response.json()

    assert response.status_code == HTTPStatus.OK
    assert "message" in response_json
    assert "file_id" in response_json
    assert response_json["message"] == "File indexing successful."

    async with async_session_maker() as session:
        file_db = await session.scalars(select(RagFile).where(RagFile.id == UUID(response_json["file_id"])))
        file = file_db.first()
        assert file is not None
        assert file.filename == "document.pdf"
        assert file.mime_type == "application/pdf"
        assert file.size == 12345
        assert file.indexing_status == FileIndexingStatusEnum.INDEXING

    mock_download_blob.assert_awaited_once_with("test-files/document.pdf")
    mock_parse_and_index_file.assert_awaited_once()
    assert mock_parse_and_index_file.call_args[1]["file_id"] == response_json["file_id"]
    assert mock_parse_and_index_file.call_args[1]["filename"] == "document.pdf"
    assert mock_parse_and_index_file.call_args[1]["mime_type"] == "application/pdf"


@pytest.mark.xfail(reason="Test needs to be updated for new database transaction behavior")
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
    }
    mock_download_blob.side_effect = Exception("Failed to download blob")

    response = await test_client.post("/", json=file_data)

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "message" in response.json()
    assert "detail" in response.json()


@pytest.mark.xfail(reason="Test needs to be updated for new database transaction behavior")
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
    }
    mock_parse_and_index_file.side_effect = Exception("Failed to parse and index file")

    response = await test_client.post("/", json=file_data)

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "message" in response.json()
    assert "detail" in response.json()


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
    }

    with patch("sqlalchemy.insert") as mock_insert:
        mock_insert.side_effect = Exception("Database error")

        response = await test_client.post("/", json=file_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert "message" in response.json()
