from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from pytest_mock import MockerFixture

from services.rag.src.utils.wikidata_client import (
    _build_sparql_query,
    _parse_wikidata_response,
    expand_scientific_terms,
    get_scientific_context,
)


@pytest.fixture
def mock_httpx_response(mocker: MockerFixture) -> MagicMock:
    """Mock httpx response."""
    response = MagicMock()
    response.raise_for_status = MagicMock()
    return response


@pytest.fixture
def mock_httpx_client(mocker: MockerFixture) -> AsyncMock:
    """Mock httpx client with proper async context manager."""
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    return client


async def test_get_scientific_context_success(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    """Test successful scientific context retrieval."""
    mock_httpx_response.json.return_value = {
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
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)
        result = await get_scientific_context(["machine learning"], "test-trace")

    assert "machine learning" in result
    assert "Computer Science" in result


async def test_get_scientific_context_empty_terms() -> None:
    """Test handling of empty terms list."""
    result = await get_scientific_context([], "test-trace")
    assert result == ""


async def test_get_scientific_context_http_error(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    """Test handling of HTTP errors."""
    mock_httpx_response.raise_for_status.side_effect = httpx.HTTPError("HTTP Error")
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)
        result = await get_scientific_context(["test"], "test-trace")

    assert result == ""


async def test_get_scientific_context_network_error(mock_httpx_client: AsyncMock) -> None:
    """Test handling of network errors."""
    mock_httpx_client.get.side_effect = httpx.HTTPError("Network error")

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)
        result = await get_scientific_context(["test"], "test-trace")

    assert result == ""


def test_build_sparql_query() -> None:
    """Test SPARQL query building."""
    terms = ["machine learning", "artificial intelligence"]
    query = _build_sparql_query(terms)

    assert "machine learning" in query
    assert "artificial intelligence" in query
    assert "SELECT DISTINCT" in query
    assert "?item ?label ?description ?scientific_field" in query


def test_parse_wikidata_response_success() -> None:
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

    result = _parse_wikidata_response(mock_response)
    assert len(result) == 1
    assert result[0]["label"] == "machine learning"
    assert result[0]["description"] == "Field of AI"


def test_parse_wikidata_response_empty() -> None:
    """Test parsing empty response."""
    mock_response: dict[str, Any] = {"results": {"bindings": []}}

    result = _parse_wikidata_response(mock_response)
    assert result == []


def test_parse_wikidata_response_malformed() -> None:
    """Test parsing malformed response."""
    mock_response: dict[str, str] = {"invalid": "structure"}

    result = _parse_wikidata_response(mock_response)
    assert result == []


async def test_batch_processing(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    """Test batch processing of terms."""
    mock_httpx_response.json.return_value = {
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
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    terms = ["term1", "term2", "term3", "term4", "term5", "term6"]  # More than batch size

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)
        await get_scientific_context(terms, "test-trace")

    # Should make multiple calls due to batching
    assert mock_httpx_client.get.call_count > 1


async def test_expand_scientific_terms_success(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    """Test successful term expansion."""
    mock_httpx_response.json.return_value = {
        "results": {
            "bindings": [
                {
                    "item": {"value": "Q123"},
                    "label": {"value": "test"},
                    "description": {"value": "test description"},
                    "scientific_field": {"value": "Test Science"},
                }
            ]
        }
    }
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)
        result = await expand_scientific_terms(["test"], "test-trace")

    assert len(result) == 1
    assert result[0]["label"] == "test"
    assert result[0]["scientific_field"] == "Test Science"


async def test_expand_scientific_terms_empty() -> None:
    """Test handling of empty terms list."""
    result = await expand_scientific_terms([], "test-trace")
    assert result == []


async def test_expand_scientific_terms_http_error(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    """Test handling of HTTP errors in term expansion."""
    mock_httpx_response.raise_for_status.side_effect = httpx.HTTPError("HTTP Error")
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)
        result = await expand_scientific_terms(["test"], "test-trace")

    assert result == []


async def test_expand_scientific_terms_network_error(mock_httpx_client: AsyncMock) -> None:
    """Test handling of network errors in term expansion."""
    mock_httpx_client.get.side_effect = httpx.HTTPError("Network error")

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)
        result = await expand_scientific_terms(["test"], "test-trace")

    assert result == []
