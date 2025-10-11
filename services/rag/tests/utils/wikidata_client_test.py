from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from pytest_mock import MockerFixture

from services.rag.src.grant_application.enrich_terminology_stage import (
    _expand_scientific_terms as expand_scientific_terms,
)
from services.rag.src.grant_application.enrich_terminology_stage import (
    _get_scientific_context as get_scientific_context,
)


@pytest.fixture
def mock_httpx_response(mocker: MockerFixture) -> MagicMock:
    response = MagicMock()
    response.raise_for_status = MagicMock()
    return response


@pytest.fixture
def mock_httpx_client(mocker: MockerFixture) -> AsyncMock:
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    return client


async def test_get_scientific_context_success(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    search_response = MagicMock()
    search_response.json.return_value = {
        "search": [
            {
                "id": "Q2539",
                "label": "machine learning",
                "description": "Field of AI",
            }
        ]
    }
    search_response.raise_for_status = MagicMock()

    details_response = MagicMock()
    details_response.json.return_value = {
        "entities": {
            "Q2539": {
                "labels": {"en": {"value": "machine learning"}},
                "descriptions": {"en": {"value": "Field of AI"}},
            }
        }
    }
    details_response.raise_for_status = MagicMock()

    mock_httpx_client.get = AsyncMock(side_effect=[search_response, details_response])

    with patch(
        "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
        return_value=mock_httpx_client,
    ):
        result = await get_scientific_context(["machine learning"], "test-trace")

    assert "machine learning" in result
    assert "Field of AI" in result


async def test_get_scientific_context_empty_terms() -> None:
    result = await get_scientific_context([], "test-trace")
    assert result == ""


async def test_get_scientific_context_http_error(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    mock_httpx_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Server Error", request=MagicMock(), response=MagicMock(status_code=500)
    )
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    with patch(
        "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
        return_value=mock_httpx_client,
    ):
        result = await get_scientific_context(["test"], "test-trace")

    assert result == ""


async def test_get_scientific_context_network_error(mock_httpx_client: AsyncMock) -> None:
    mock_httpx_client.get.side_effect = httpx.NetworkError("Network error")

    with patch(
        "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
        return_value=mock_httpx_client,
    ):
        result = await get_scientific_context(["test"], "test-trace")

    assert result == ""


async def test_batch_processing(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    search_responses = []
    for i in range(1, 7):
        search_response = MagicMock()
        search_response.json.return_value = {
            "search": [
                {
                    "id": f"Q{100 + i}",
                    "label": f"term{i}",
                    "description": f"description{i}",
                }
            ]
        }
        search_response.raise_for_status = MagicMock()
        search_responses.append(search_response)

    details_response = MagicMock()
    details_response.json.return_value = {
        "entities": {
            f"Q{100 + i}": {
                "labels": {"en": {"value": f"term{i}"}},
                "descriptions": {"en": {"value": f"description{i}"}},
            }
            for i in range(1, 7)
        }
    }
    details_response.raise_for_status = MagicMock()

    mock_httpx_client.get = AsyncMock(side_effect=[*search_responses, details_response])

    terms = ["term1", "term2", "term3", "term4", "term5", "term6"]

    with patch(
        "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
        return_value=mock_httpx_client,
    ):
        await get_scientific_context(terms, "test-trace")

    assert mock_httpx_client.get.call_count == 7


async def test_expand_scientific_terms_success(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    search_response = MagicMock()
    search_response.json.return_value = {
        "search": [
            {
                "id": "Q123",
                "label": "test",
                "description": "test description",
            }
        ]
    }
    search_response.raise_for_status = MagicMock()

    details_response = MagicMock()
    details_response.json.return_value = {
        "entities": {
            "Q123": {
                "labels": {"en": {"value": "test"}},
                "descriptions": {"en": {"value": "test description"}},
            }
        }
    }
    details_response.raise_for_status = MagicMock()

    mock_httpx_client.get = AsyncMock(side_effect=[search_response, details_response])

    with patch(
        "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
        return_value=mock_httpx_client,
    ):
        result = await expand_scientific_terms(["test"], "test-trace")

    assert len(result) == 1
    assert result[0]["label"] == "test"
    assert result[0]["scientific_field"] == ""


async def test_expand_scientific_terms_empty() -> None:
    result = await expand_scientific_terms([], "test-trace")
    assert result == []


async def test_expand_scientific_terms_http_error(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    mock_httpx_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Server Error", request=MagicMock(), response=MagicMock(status_code=500)
    )
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    with patch(
        "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
        return_value=mock_httpx_client,
    ):
        result = await expand_scientific_terms(["test"], "test-trace")

    assert result == []


async def test_expand_scientific_terms_network_error(mock_httpx_client: AsyncMock) -> None:
    mock_httpx_client.get.side_effect = httpx.NetworkError("Network error")

    with patch(
        "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
        return_value=mock_httpx_client,
    ):
        result = await expand_scientific_terms(["test"], "test-trace")

    assert result == []
