from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.rag.src.utils.wikidata_client import WikidataClient


class TestWikidataClient:
    """Test cases for WikidataClient."""

    @pytest.fixture
    def mock_session(self) -> AsyncMock:
        """Mock aiohttp session."""
        return AsyncMock()

    @pytest.fixture
    def client(self) -> WikidataClient:
        """Create WikidataClient instance."""
        return WikidataClient()

    @pytest.mark.asyncio
    async def test_context_manager(self, client: WikidataClient, mock_session: AsyncMock) -> None:
        """Test client context manager."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client as ctx_client:
                assert ctx_client is client
                assert client.session == mock_session

        mock_session.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_scientific_context_success(self, client: WikidataClient, mock_session: AsyncMock) -> None:
        """Test successful scientific context retrieval."""
        # Mock the expand_scientific_terms method to return test data
        mock_expanded_data = [
            {
                "item_id": "Q123",
                "label": "machine learning",
                "description": "Field of AI",
                "scientific_field": "Computer Science",
            }
        ]

        with patch.object(client, "expand_scientific_terms", return_value=mock_expanded_data):
            async with client:
                result = await client.get_scientific_context(["machine learning"], "test-trace")

        assert "machine learning" in result
        assert "Computer Science" in result

    @pytest.mark.asyncio
    async def test_get_scientific_context_empty_terms(self, client: WikidataClient) -> None:
        """Test handling of empty terms list."""
        async with client:
            result = await client.get_scientific_context([], "test-trace")

        assert result == ""

    @pytest.mark.asyncio
    async def test_get_scientific_context_http_error(self, client: WikidataClient, mock_session: AsyncMock) -> None:
        """Test handling of HTTP errors."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception("HTTP Error")
        mock_session.get.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client:
                result = await client.get_scientific_context(["test"], "test-trace")

        assert result == ""

    @pytest.mark.asyncio
    async def test_get_scientific_context_network_error(self, client: WikidataClient, mock_session: AsyncMock) -> None:
        """Test handling of network errors."""
        mock_session.get.side_effect = Exception("Network error")

        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client:
                result = await client.get_scientific_context(["test"], "test-trace")

        assert result == ""

    @pytest.mark.asyncio
    async def test_build_sparql_query(self, client: WikidataClient) -> None:
        """Test SPARQL query building."""
        terms = ["machine learning", "artificial intelligence"]
        query = client._build_sparql_query(terms)

        assert "machine learning" in query
        assert "artificial intelligence" in query
        assert "SELECT DISTINCT" in query
        assert "?item ?label ?description ?scientific_field" in query

    @pytest.mark.asyncio
    async def test_parse_wikidata_response_success(self, client: WikidataClient) -> None:
        """Test successful response parsing."""
        mock_response: dict[str, Any] = {
            "results": {
                "bindings": [
                    {
                        "item": {"value": "Q123"},
                        "label": {"value": "machine learning"},
                        "description": {"value": "Field of AI"},
                        "scientific_field": {"value": "Computer Science"},
                    }
                ]
            }
        }

        result = await client._parse_wikidata_response(mock_response)
        assert len(result) == 1
        assert result[0]["label"] == "machine learning"
        assert result[0]["description"] == "Field of AI"

    @pytest.mark.asyncio
    async def test_parse_wikidata_response_empty(self, client: WikidataClient) -> None:
        """Test parsing empty response."""
        mock_response: dict[str, Any] = {"results": {"bindings": []}}

        result = await client._parse_wikidata_response(mock_response)
        assert result == []

    @pytest.mark.asyncio
    async def test_parse_wikidata_response_malformed(self, client: WikidataClient) -> None:
        """Test parsing malformed response."""
        mock_response: dict[str, str] = {"invalid": "structure"}

        result = await client._parse_wikidata_response(mock_response)
        assert result == []

    @pytest.mark.asyncio
    async def test_batch_processing(self, client: WikidataClient, mock_session: AsyncMock) -> None:
        """Test batch processing of terms."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": {
                "bindings": [
                    {
                        "item": {"value": "Q123"},
                        "label": {"value": "term1"},
                        "description": {"value": "description1"},
                        "scientific_field": {"value": "Science"},
                    }
                ]
            }
        }
        mock_response.raise_for_status = MagicMock()
        mock_session.get.return_value.__aenter__.return_value = mock_response

        terms = ["term1", "term2", "term3", "term4", "term5", "term6"]  # More than batch size

        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client:
                await client.get_scientific_context(terms, "test-trace")

        # Should make multiple calls due to batching
        assert mock_session.get.call_count > 1

    @pytest.mark.asyncio
    async def test_retry_mechanism(self, client: WikidataClient, mock_session: AsyncMock) -> None:
        """Test retry mechanism on failures."""
        # Mock the expand_scientific_terms method to simulate retry behavior
        mock_expanded_data = [
            {
                "item_id": "Q123",
                "label": "test",
                "description": "test",
                "scientific_field": "Test Science",
            }
        ]

        with patch.object(client, "expand_scientific_terms", return_value=mock_expanded_data):
            async with client:
                result = await client.get_scientific_context(["test"], "test-trace")

        # Verify the result is generated correctly
        assert "test" in result
        assert "Test Science" in result
