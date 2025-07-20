from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.rag.src.utils.wikidata_client import WikidataClient


class TestWikidataClient:
    """Test cases for WikidataClient."""

    @pytest.fixture
    def mock_session(self):
        """Mock aiohttp session."""
        return AsyncMock()

    @pytest.fixture
    def client(self):
        """Create WikidataClient instance."""
        return WikidataClient()

    @pytest.mark.asyncio
    async def test_context_manager(self, client, mock_session):
        """Test client context manager."""
        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client as ctx_client:
                assert ctx_client is client
                assert client.session == mock_session

        mock_session.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_scientific_context_success(self, client, mock_session):
        """Test successful scientific context retrieval."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": {
                "bindings": [
                    {
                        "term": {"value": "machine learning"},
                        "description": {"value": "Field of AI"},
                        "aliases": {"value": "ML, artificial intelligence"},
                    }
                ]
            }
        }
        mock_response.status = 200
        mock_session.post.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client:
                result = await client.get_scientific_context(["machine learning"], "test-trace")

        assert "machine learning" in result
        assert "Field of AI" in result
        mock_session.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_scientific_context_empty_terms(self, client):
        """Test handling of empty terms list."""
        async with client:
            result = await client.get_scientific_context([], "test-trace")

        assert result == ""

    @pytest.mark.asyncio
    async def test_get_scientific_context_http_error(self, client, mock_session):
        """Test handling of HTTP errors."""
        mock_response = MagicMock()
        mock_response.status = 500
        mock_session.post.return_value.__aenter__.return_value = mock_response

        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client:
                result = await client.get_scientific_context(["test"], "test-trace")

        assert result == ""

    @pytest.mark.asyncio
    async def test_get_scientific_context_network_error(self, client, mock_session):
        """Test handling of network errors."""
        mock_session.post.side_effect = Exception("Network error")

        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client:
                result = await client.get_scientific_context(["test"], "test-trace")

        assert result == ""

    @pytest.mark.asyncio
    async def test_build_sparql_query(self, client):
        """Test SPARQL query building."""
        terms = ["machine learning", "artificial intelligence"]
        query = client._build_sparql_query(terms)

        assert "machine learning" in query
        assert "artificial intelligence" in query
        assert "PREFIX wd:" in query
        assert "PREFIX wdt:" in query

    @pytest.mark.asyncio
    async def test_parse_wikidata_response_success(self, client):
        """Test successful response parsing."""
        mock_response = {
            "results": {
                "bindings": [
                    {
                        "term": {"value": "machine learning"},
                        "description": {"value": "Field of AI"},
                        "aliases": {"value": "ML, artificial intelligence"},
                    }
                ]
            }
        }

        result = client._parse_wikidata_response(mock_response)
        assert "machine learning" in result
        assert "Field of AI" in result

    @pytest.mark.asyncio
    async def test_parse_wikidata_response_empty(self, client):
        """Test parsing empty response."""
        mock_response = {"results": {"bindings": []}}

        result = client._parse_wikidata_response(mock_response)
        assert result == ""

    @pytest.mark.asyncio
    async def test_parse_wikidata_response_malformed(self, client):
        """Test parsing malformed response."""
        mock_response = {"invalid": "structure"}

        result = client._parse_wikidata_response(mock_response)
        assert result == ""

    @pytest.mark.asyncio
    async def test_batch_processing(self, client, mock_session):
        """Test batch processing of terms."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "results": {
                "bindings": [
                    {
                        "term": {"value": "term1"},
                        "description": {"value": "description1"},
                    }
                ]
            }
        }
        mock_response.status = 200
        mock_session.post.return_value.__aenter__.return_value = mock_response

        terms = ["term1", "term2", "term3", "term4", "term5", "term6"]  # More than batch size

        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client:
                result = await client.get_scientific_context(terms, "test-trace")

        # Should make multiple calls due to batching
        assert mock_session.post.call_count > 1

    @pytest.mark.asyncio
    async def test_retry_mechanism(self, client, mock_session):
        """Test retry mechanism on failures."""
        # First call fails, second succeeds
        mock_response_fail = MagicMock()
        mock_response_fail.status = 500

        mock_response_success = MagicMock()
        mock_response_success.json.return_value = {
            "results": {"bindings": [{"term": {"value": "test"}, "description": {"value": "test"}}]}
        }
        mock_response_success.status = 200

        mock_session.post.return_value.__aenter__.side_effect = [
            mock_response_fail,
            mock_response_success,
        ]

        with patch("aiohttp.ClientSession", return_value=mock_session):
            async with client:
                result = await client.get_scientific_context(["test"], "test-trace")

        # Should have retried
        assert mock_session.post.call_count >= 2
