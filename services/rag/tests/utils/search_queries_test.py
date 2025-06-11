from typing import TypedDict
from unittest.mock import Mock

import pytest
from pytest_mock import MockerFixture

from services.rag.src.utils.search_queries import handle_create_search_queries


class MockQueryResponse(TypedDict):
    queries: list[dict[str, str]] | list[str]


@pytest.fixture
def mock_handle_completions_request(mocker: MockerFixture) -> Mock:
    async def mock_response(*args: str, **kwargs: str) -> MockQueryResponse:
        return {
            "queries": [
                {"text": "query1", "type": "factual", "aspect": "aspect1"},
                {"text": "query2", "type": "conceptual", "aspect": "aspect2"},
                {"text": "query3", "type": "procedural", "aspect": "aspect3"},
            ]
        }

    mock = mocker.patch("services.rag.src.utils.search_queries.handle_completions_request", side_effect=mock_response)

    mocker.patch("services.rag.src.utils.search_queries.deduplicate_queries", side_effect=lambda x: x)
    return mock


async def test_handle_create_search_queries_basic(
    mock_handle_completions_request: Mock,
) -> None:
    result = await handle_create_search_queries(user_prompt="test prompt")

    assert len(result) == 3
    assert all(isinstance(query, str) for query in result)
    mock_handle_completions_request.assert_called_once()


async def test_handle_create_search_queries_with_kwargs(
    mock_handle_completions_request: Mock,
) -> None:
    result = await handle_create_search_queries(user_prompt="test prompt", keywords=["test", "example"])

    assert len(result) == 3
    assert all(isinstance(query, str) for query in result)
    assert mock_handle_completions_request.call_count == 1


async def test_handle_create_search_queries_max_queries(mocker: MockerFixture) -> None:
    async def mock_response(*args: str, **kwargs: str) -> MockQueryResponse:
        return {"queries": [{"text": f"query{i}", "type": "factual", "aspect": f"aspect{i}"} for i in range(15)]}

    mocker.patch("services.rag.src.utils.search_queries.handle_completions_request", side_effect=mock_response)
    mocker.patch("services.rag.src.utils.search_queries.deduplicate_queries", side_effect=lambda x: x)

    result = await handle_create_search_queries(user_prompt="test prompt")
    assert len(result) == 10


async def test_handle_create_search_queries_retries_until_minimum(mocker: MockerFixture) -> None:
    responses = [
        {"queries": [{"text": "query1", "type": "factual", "aspect": "aspect1"}]},
        {
            "queries": [
                {"text": "query2", "type": "conceptual", "aspect": "aspect2"},
                {"text": "query3", "type": "procedural", "aspect": "aspect3"},
                {"text": "query4", "type": "comparative", "aspect": "aspect4"},
            ]
        },
    ]

    mock_completions = mocker.patch(
        "services.rag.src.utils.search_queries.handle_completions_request",
        side_effect=list(responses),
    )

    mocker.patch("services.rag.src.utils.search_queries.deduplicate_queries", side_effect=lambda x: x)

    result = await handle_create_search_queries(user_prompt="test prompt")

    assert len(result) == 4
    assert mock_completions.call_count == 2
