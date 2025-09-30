from typing import Any, TypedDict
from unittest.mock import Mock

import pytest
from packages.db.src.json_objects import ResearchObjective
from pytest_mock import MockerFixture

from services.rag.src.utils.search_queries import build_objective_context, handle_create_search_queries


class MockQueryResponse(TypedDict):
    queries: list[dict[str, str]] | list[str]


@pytest.fixture
def mock_handle_completions_request(mocker: MockerFixture) -> Mock:
    async def mock_response(**kwargs: Any) -> MockQueryResponse:
        return {
            "queries": [
                {"text": "query1", "type": "factual", "aspect": "aspect1"},
                {"text": "query2", "type": "conceptual", "aspect": "aspect2"},
                {"text": "query3", "type": "procedural", "aspect": "aspect3"},
            ]
        }

    mock = mocker.patch("services.rag.src.utils.search_queries.handle_completions_request", side_effect=mock_response)

    mocker.patch("services.rag.src.utils.search_queries.deduplicate_queries", side_effect=lambda x, model_name=None: x)
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
    async def mock_response(**kwargs: Any) -> MockQueryResponse:
        return {"queries": [{"text": f"query{i}", "type": "factual", "aspect": f"aspect{i}"} for i in range(15)]}

    mocker.patch("services.rag.src.utils.search_queries.handle_completions_request", side_effect=mock_response)
    mocker.patch("services.rag.src.utils.search_queries.deduplicate_queries", side_effect=lambda x, model_name=None: x)

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

    mocker.patch("services.rag.src.utils.search_queries.deduplicate_queries", side_effect=lambda x, model_name=None: x)

    result = await handle_create_search_queries(user_prompt="test prompt")

    assert len(result) == 4
    assert mock_completions.call_count == 2


def test_build_objective_context_empty() -> None:
    result = build_objective_context([])
    assert result == ""


def test_build_objective_context_single_objective() -> None:
    objectives: list[ResearchObjective] = [
        ResearchObjective(
            number=1,
            title="Develop novel cancer therapy",
            description="Create targeted treatment for glioblastoma",
            research_tasks=[],
        )
    ]

    result = build_objective_context(objectives)

    assert "Objective 1: Develop novel cancer therapy" in result
    assert "Create targeted treatment for glioblastoma" in result
    assert "CRITICAL CONTEXT" in result
    assert "CONSTRAINTS" in result
    assert "EXCLUDE" in result


def test_build_objective_context_multiple_objectives() -> None:
    objectives: list[ResearchObjective] = [
        ResearchObjective(
            number=1,
            title="Study immune response",
            description="Investigate T-cell activation",
            research_tasks=[],
        ),
        ResearchObjective(number=2, title="Develop biomarker assay", research_tasks=[]),
    ]

    result = build_objective_context(objectives)

    assert "Objective 1: Study immune response" in result
    assert "Investigate T-cell activation" in result
    assert "Objective 2: Develop biomarker assay" in result
    assert "- Objective 1:" in result
    assert "- Objective 2:" in result


def test_build_objective_context_no_description() -> None:
    objectives: list[ResearchObjective] = [ResearchObjective(number=1, title="Test objective", research_tasks=[])]

    result = build_objective_context(objectives)

    assert "Objective 1: Test objective" in result
    assert " - " not in result.split("\n")[2]


async def test_handle_create_search_queries_with_objectives(
    mock_handle_completions_request: Mock,
) -> None:
    objectives: list[ResearchObjective] = [
        ResearchObjective(
            number=1,
            title="Develop cancer immunotherapy",
            description="CAR-T cell therapy for solid tumors",
            research_tasks=[],
        )
    ]

    result = await handle_create_search_queries(user_prompt="test prompt", research_objectives=objectives)

    assert len(result) == 3
    assert mock_handle_completions_request.call_count == 1

    call_args = mock_handle_completions_request.call_args
    messages = call_args.kwargs["messages"]
    assert len(messages) >= 2
    assert any("CRITICAL CONTEXT" in msg for msg in messages)
    assert any("Objective 1" in msg for msg in messages)


async def test_handle_create_search_queries_with_none_objectives(
    mock_handle_completions_request: Mock,
) -> None:
    result = await handle_create_search_queries(user_prompt="test prompt", research_objectives=None)

    assert len(result) == 3
    assert mock_handle_completions_request.call_count == 1

    call_args = mock_handle_completions_request.call_args
    messages = call_args.kwargs["messages"]
    assert not any("CRITICAL CONTEXT" in msg for msg in messages)
