from unittest.mock import Mock

import pytest
from pytest_mock import MockerFixture

from src.rag.search_queries import ToolResponse, handle_create_search_queries


@pytest.fixture
def mock_handle_completions_request(mocker: MockerFixture) -> Mock:
    async def mock_response(*args: str, **kwargs: str) -> ToolResponse:
        return {"queries": ["query1", "query2", "query3"]}

    return mocker.patch("src.rag.search_queries.handle_completions_request", side_effect=mock_response)


async def test_handle_create_search_queries_basic(
    mock_handle_completions_request: Mock,
) -> None:
    result = await handle_create_search_queries(user_prompt="test prompt")

    assert len(result) == 3
    assert all(isinstance(query, str) for query in result)
    mock_handle_completions_request.assert_called_once()


async def test_handle_create_search_queries_with_existing_queries(
    mock_handle_completions_request: Mock,
) -> None:
    existing_queries = ["existing1", "existing2"]
    result = await handle_create_search_queries(user_prompt="test prompt", search_queries=existing_queries)

    assert len(result) == 3
    assert all(isinstance(query, str) for query in result)
    mock_handle_completions_request.assert_called_once()


async def test_handle_create_search_queries_max_queries(mocker: MockerFixture) -> None:
    async def mock_response(*args: str, **kwargs: str) -> ToolResponse:
        return {"queries": [f"query{i}" for i in range(15)]}

    mocker.patch("src.rag.search_queries.handle_completions_request", side_effect=mock_response)

    result = await handle_create_search_queries(user_prompt="test prompt")
    assert len(result) == 10


async def test_handle_create_search_queries_retries_until_minimum(mocker: MockerFixture) -> None:
    responses = [
        {"queries": ["query1"]},
        {"queries": ["query2", "query3", "query4"]},
    ]

    mock_completions = mocker.patch(
        "src.rag.search_queries.handle_completions_request",
        side_effect=[ToolResponse(queries=r["queries"]) for r in responses],
    )

    result = await handle_create_search_queries(user_prompt="test prompt")

    assert len(result) == 4
    assert mock_completions.call_count == 2
