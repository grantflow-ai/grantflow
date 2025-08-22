"""Tests for Firestore utilities."""

from __future__ import annotations

from typing import TYPE_CHECKING, cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from google.cloud.firestore import AsyncClient, AsyncCollectionReference, AsyncDocumentReference
from services.scraper.src.firestore_utils import (
    batch_save_grants,
    get_existing_grant_identifiers,
    get_firestore_client,
    get_grants_collection,
    get_subscriptions_collection,
    save_grant_document,
    save_grant_page_content,
)

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from services.scraper.src.dtos import GrantInfo


@pytest.fixture
def mock_firestore_client() -> AsyncMock:
    """Create a mock Firestore client."""
    mock_client = AsyncMock(spec=AsyncClient)
    mock_client.collection = MagicMock()
    return mock_client


@pytest.fixture
def mock_collection() -> AsyncMock:
    """Create a mock collection reference."""
    return AsyncMock(spec=AsyncCollectionReference)


@pytest.fixture
def mock_document() -> AsyncMock:
    """Create a mock document reference."""
    mock_doc = AsyncMock(spec=AsyncDocumentReference)
    mock_doc.id = "test-grant-123"
    return mock_doc


def test_get_firestore_client() -> None:
    """Test getting Firestore client instance."""
    with patch("services.scraper.src.firestore_utils.firestore.AsyncClient") as mock_client_class:
        mock_client_class.return_value = MagicMock(spec=AsyncClient)

        client = get_firestore_client()

        assert client is not None
        mock_client_class.assert_called_once_with(project="grantflow")


async def test_get_grants_collection(mock_firestore_client: AsyncMock) -> None:
    """Test getting grants collection reference."""
    mock_collection = AsyncMock(spec=AsyncCollectionReference)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.scraper.src.firestore_utils.get_firestore_client", return_value=mock_firestore_client):
        collection = await get_grants_collection()

        assert collection == mock_collection
        mock_firestore_client.collection.assert_called_once_with("grants")


async def test_get_subscriptions_collection(mock_firestore_client: AsyncMock) -> None:
    """Test getting subscriptions collection reference."""
    mock_collection = AsyncMock(spec=AsyncCollectionReference)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.scraper.src.firestore_utils.get_firestore_client", return_value=mock_firestore_client):
        collection = await get_subscriptions_collection()

        assert collection == mock_collection
        mock_firestore_client.collection.assert_called_once_with("subscriptions")


async def test_save_grant_document_with_url(mock_collection: AsyncMock, mock_document: AsyncMock) -> None:
    """Test saving a grant document with URL-based ID."""
    grant_info: dict[str, str] = {
        "url": "https://grants.nih.gov/grants/guide/pa-files/PA-24-123",
        "title": "Test Grant",
        "description": "Test Description",
    }

    mock_collection.document.return_value = mock_document
    mock_document.set = AsyncMock()

    with patch("services.scraper.src.firestore_utils.get_grants_collection", return_value=mock_collection):
        grant_id = await save_grant_document(cast("GrantInfo", grant_info))

        assert grant_id == "PA-24-123"
        mock_collection.document.assert_called_once_with("PA-24-123")

        # Verify the document data includes timestamps
        call_args = mock_document.set.call_args
        doc_data = call_args[0][0]
        assert "created_at" in doc_data
        assert "updated_at" in doc_data
        assert "scraped_at" in doc_data
        assert doc_data["title"] == "Test Grant"
        assert call_args[1]["merge"] is True


async def test_save_grant_document_without_url(mock_collection: AsyncMock, mock_document: AsyncMock) -> None:
    """Test saving a grant document without URL (auto-generated ID)."""
    grant_info: dict[str, str] = {
        "title": "Test Grant",
        "description": "Test Description",
    }

    mock_document.id = "auto-generated-id"
    mock_collection.add = AsyncMock(return_value=mock_document)

    with patch("services.scraper.src.firestore_utils.get_grants_collection", return_value=mock_collection):
        grant_id = await save_grant_document(cast("GrantInfo", grant_info))

        assert grant_id == "auto-generated-id"

        # Verify the document data includes timestamps
        call_args = mock_collection.add.call_args
        doc_data = call_args[0][0]
        assert "created_at" in doc_data
        assert "updated_at" in doc_data
        assert "scraped_at" in doc_data
        assert doc_data["title"] == "Test Grant"


async def test_save_grant_page_content(mock_collection: AsyncMock, mock_document: AsyncMock) -> None:
    """Test saving grant page content."""
    grant_id = "PA-24-123"
    content = "# Grant Title\n\nGrant content here..."

    mock_collection.document.return_value = mock_document
    mock_document.update = AsyncMock()

    with patch("services.scraper.src.firestore_utils.get_grants_collection", return_value=mock_collection):
        await save_grant_page_content(grant_id, content)

        mock_collection.document.assert_called_once_with(grant_id)

        # Verify the update data
        call_args = mock_document.update.call_args
        update_data = call_args[0][0]
        assert update_data["page_content"] == content
        assert "content_scraped_at" in update_data
        assert "updated_at" in update_data


async def test_get_existing_grant_identifiers(mock_collection: AsyncMock) -> None:
    """Test getting existing grant identifiers from Firestore."""
    # Create mock documents
    mock_docs = []
    for i in range(3):
        mock_doc = AsyncMock()
        mock_doc.id = f"grant-{i}"
        mock_docs.append(mock_doc)

    # Create async generator for stream
    async def mock_stream() -> AsyncIterator[AsyncMock]:
        for doc in mock_docs:
            yield doc

    mock_query = AsyncMock()
    mock_query.stream.return_value = mock_stream()
    mock_collection.select.return_value = mock_query

    with patch("services.scraper.src.firestore_utils.get_grants_collection", return_value=mock_collection):
        identifiers = await get_existing_grant_identifiers()

        assert identifiers == {"grant-0", "grant-1", "grant-2"}
        mock_collection.select.assert_called_once_with([])


async def test_batch_save_grants(mock_firestore_client: AsyncMock, mock_collection: AsyncMock) -> None:
    """Test batch saving multiple grants."""
    grants: list[dict[str, str]] = [
        {"url": "https://grants.nih.gov/grants/guide/pa-files/PA-24-001", "title": "Grant 1"},
        {"url": "https://grants.nih.gov/grants/guide/pa-files/PA-24-002", "title": "Grant 2"},
        {"title": "Grant 3"},  # No URL, should use auto-generated ID
    ]

    mock_batch = AsyncMock()
    mock_batch.set = MagicMock()
    mock_batch.commit = AsyncMock()
    mock_firestore_client.batch.return_value = mock_batch

    mock_doc_1 = AsyncMock()
    mock_doc_2 = AsyncMock()
    mock_doc_3 = AsyncMock()
    mock_collection.document.side_effect = [mock_doc_1, mock_doc_2, mock_doc_3]

    with (
        patch("services.scraper.src.firestore_utils.get_firestore_client", return_value=mock_firestore_client),
        patch("services.scraper.src.firestore_utils.get_grants_collection", return_value=mock_collection),
    ):
        saved_count = await batch_save_grants(cast("list[GrantInfo]", grants))

        assert saved_count == 3
        assert mock_batch.set.call_count == 3
        mock_batch.commit.assert_called_once()

        # Verify document IDs
        calls = mock_collection.document.call_args_list
        assert calls[0][0][0] == "PA-24-001"
        assert calls[1][0][0] == "PA-24-002"
        assert calls[2] == (())  # Auto-generated ID call


async def test_batch_save_grants_large_batch(mock_firestore_client: AsyncMock, mock_collection: AsyncMock) -> None:
    """Test batch saving with more than 500 grants (Firestore batch limit)."""
    # Create 501 grants to test batch splitting
    grants: list[dict[str, str]] = [{"title": f"Grant {i}"} for i in range(501)]

    mock_batch = AsyncMock()
    mock_batch.set = MagicMock()
    mock_batch.commit = AsyncMock()
    mock_firestore_client.batch.return_value = mock_batch

    mock_doc = AsyncMock()
    mock_collection.document.return_value = mock_doc

    with (
        patch("services.scraper.src.firestore_utils.get_firestore_client", return_value=mock_firestore_client),
        patch("services.scraper.src.firestore_utils.get_grants_collection", return_value=mock_collection),
    ):
        saved_count = await batch_save_grants(cast("list[GrantInfo]", grants))

        assert saved_count == 501
        assert mock_batch.set.call_count == 501
        # Should commit twice: once at 500, once for remaining 1
        assert mock_batch.commit.call_count == 2
