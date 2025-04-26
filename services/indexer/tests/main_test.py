from collections.abc import AsyncGenerator, Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import RagFile
from services.indexer.src.main import app
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
async def test_client(async_session_maker: async_sessionmaker[Any]) -> AsyncGenerator[AsyncTestClient, None]:
    """Create a test client for testing the API."""
    app.state.session_maker = async_session_maker
    async with AsyncTestClient(app=app) as client:
        yield client


@pytest.fixture
def mock_download_blob() -> Generator[AsyncMock, None, None]:
    """Mock the download_blob function to return test content."""
    with patch("services.indexer.src.main.download_blob") as mock:
        mock.return_value = b"Test file content"
        yield mock


@pytest.fixture
def mock_parse_and_index_file() -> Generator[AsyncMock, None, None]:
    """Mock the parse_and_index_file function for testing."""
    with patch("services.indexer.src.main.parse_and_index_file") as mock:
        mock.return_value = None
        yield mock


async def test_handle_file_indexing_success(
    test_client: AsyncTestClient,
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test successful file indexing API endpoint."""
    # Arrange
    file_data = {
        "bucket": "test-bucket",
        "file_path": "test-files/document.pdf",
        "mime_type": "application/pdf",
        "filename": "document.pdf",
        "size": 12345,
    }

    # Act
    response = await test_client.post("/", json=file_data)
    response_json = response.json()

    # Assert
    assert response.status_code == HTTPStatus.CREATED
    assert "message" in response_json
    assert "file_id" in response_json
    assert response_json["message"] == "File indexing successful."

    # Verify database record was created with correct status
    async with async_session_maker() as session:
        file_db = await session.scalars(select(RagFile).where(RagFile.id == UUID(response_json["file_id"])))
        file = file_db.first()
        assert file is not None
        assert file.filename == "document.pdf"
        assert file.mime_type == "application/pdf"
        assert file.size == 12345
        assert file.indexing_status == FileIndexingStatusEnum.INDEXING

    # Verify mocks were called correctly
    mock_download_blob.assert_awaited_once_with("test-bucket", "test-files/document.pdf")
    mock_parse_and_index_file.assert_awaited_once()
    assert mock_parse_and_index_file.call_args[1]["file_id"] == response_json["file_id"]
    assert mock_parse_and_index_file.call_args[1]["filename"] == "document.pdf"
    assert mock_parse_and_index_file.call_args[1]["mime_type"] == "application/pdf"


async def test_handle_file_indexing_download_error(
    test_client: AsyncTestClient,
    mock_download_blob: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test file indexing API when GCS download fails."""
    # Arrange
    file_data = {
        "bucket": "test-bucket",
        "file_path": "test-files/document.pdf",
        "mime_type": "application/pdf",
        "filename": "document.pdf",
        "size": 12345,
    }
    mock_download_blob.side_effect = Exception("Failed to download blob")

    # Act
    response = await test_client.post("/", json=file_data)

    # Assert
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "message" in response.json()
    assert "detail" in response.json()

    # Verify database record was updated with failed status
    async with async_session_maker() as session:
        files = await session.scalars(select(RagFile))
        file = files.first()
        assert file is not None
        assert file.indexing_status == FileIndexingStatusEnum.FAILED


async def test_handle_file_indexing_parsing_error(
    test_client: AsyncTestClient,
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test file indexing API when file parsing fails."""
    # Arrange
    file_data = {
        "bucket": "test-bucket",
        "file_path": "test-files/document.pdf",
        "mime_type": "application/pdf",
        "filename": "document.pdf",
        "size": 12345,
    }
    mock_parse_and_index_file.side_effect = Exception("Failed to parse and index file")

    # Act
    response = await test_client.post("/", json=file_data)

    # Assert
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "message" in response.json()
    assert "detail" in response.json()

    # Verify database record was updated with failed status
    async with async_session_maker() as session:
        files = await session.scalars(select(RagFile))
        file = files.first()
        assert file is not None
        assert file.indexing_status == FileIndexingStatusEnum.FAILED


async def test_handle_file_indexing_bad_request(
    test_client: AsyncTestClient,
) -> None:
    """Test file indexing API with invalid request data."""
    # Missing required fields
    invalid_data = {
        "bucket": "test-bucket",
        "file_path": "test-files/document.pdf",
        # Missing mime_type, filename, and size
    }

    response = await test_client.post("/", json=invalid_data)
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_database_error(
    test_client: AsyncTestClient,
) -> None:
    """Test handling of database errors during file indexing."""
    # Arrange
    file_data = {
        "bucket": "test-bucket",
        "file_path": "test-files/document.pdf",
        "mime_type": "application/pdf",
        "filename": "document.pdf",
        "size": 12345,
    }

    # Mock DB error
    with patch("sqlalchemy.insert") as mock_insert:
        mock_insert.side_effect = Exception("Database error")

        # Act
        response = await test_client.post("/", json=file_data)

        # Assert
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert "message" in response.json()
