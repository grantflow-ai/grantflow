import types
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.rag.src.autofill.research_plan_handler import handle_research_plan
from services.rag.src.dto import AutofillRequestDTO


@pytest.fixture
def mock_logger() -> MagicMock:
    return MagicMock()


@pytest.fixture
def mock_session_maker() -> MagicMock:
    session_maker = MagicMock()
    session = AsyncMock()

    class AsyncContextManager:
        async def __aenter__(self) -> Any:
            return session

        async def __aexit__(
            self, exc_type: type[BaseException] | None, exc: BaseException | None, tb: types.TracebackType | None
        ) -> None:
            return None

    session_maker.return_value = AsyncContextManager()
    return session_maker


@pytest.fixture
def sample_request() -> AutofillRequestDTO:
    return {
        "parent_type": "grant_application",
        "parent_id": "123e4567-e89b-12d3-a456-426614174000",
        "autofill_type": "research_plan",
    }


@pytest.fixture
def sample_application() -> dict[str, Any]:
    return {"title": "AI-Powered Medical Diagnosis", "research_objectives": []}


@pytest.fixture
def sample_documents() -> list[str]:
    return [
        "Machine learning approaches to medical diagnosis show promising results in early detection of diseases.",
        "Deep learning in healthcare applications can improve diagnostic accuracy and reduce physician workload.",
    ]


async def test_function_import() -> None:
    """Test that the main function can be imported and has correct signature"""
    import inspect

    from services.rag.src.autofill.research_plan_handler import handle_research_plan

    sig = inspect.signature(handle_research_plan)
    params = list(sig.parameters.keys())

    assert "request" in params
    assert "session_maker" in params
    assert "logger" in params
    assert inspect.iscoroutinefunction(handle_research_plan)


async def test_validation_failure(
    mock_logger: MagicMock, mock_session_maker: MagicMock, sample_request: AutofillRequestDTO
) -> None:
    """Test handling of validation failures"""
    with patch(
        "services.rag.src.autofill.research_plan_handler.verify_rag_sources_indexed", new_callable=AsyncMock
    ) as mock_validate:
        mock_validate.side_effect = Exception("Indexing incomplete")
        response = await handle_research_plan(sample_request, mock_session_maker, mock_logger)

        assert not response["success"]
        assert "Indexing incomplete" in response["error"]


def test_parse_research_objectives_validation(mock_logger: MagicMock) -> None:
    """Test objective parsing and validation"""
    from services.rag.src.autofill.research_plan_handler import parse_and_validate_objectives

    valid_response = {
        "research_objectives": [
            {"number": 1, "title": "Test Objective", "research_tasks": [{"number": 1, "title": "Test Task"}]}
        ]
    }

    result = parse_and_validate_objectives(valid_response, mock_logger)
    assert len(result) == 1

    invalid_response = {"research_objectives": [{"number": 1}]}

    with pytest.raises(ValueError, match="Invalid objective structure"):
        parse_and_validate_objectives(invalid_response, mock_logger)


def test_format_documents_for_context(mock_logger: MagicMock) -> None:
    """Test document formatting"""
    from services.rag.src.autofill.research_plan_handler import format_documents_for_research_plan_context

    documents = ["Short content", "A" * 500]

    result = format_documents_for_research_plan_context(documents)

    assert "Document 1:" in result
    assert "Document 2:" in result
    assert len(result.split("\n")) == 2

    result = format_documents_for_research_plan_context([])
    assert result == "No research documents available."


def test_format_existing_objectives(mock_logger: MagicMock) -> None:
    """Test existing objectives formatting"""
    from services.rag.src.autofill.research_plan_handler import format_existing_objectives_text

    objectives = [
        {
            "number": 1,
            "title": "First Objective",
            "description": "Description of first objective",
            "research_tasks": [{"number": 1, "title": "First Task"}],
        }
    ]

    result = format_existing_objectives_text(objectives)

    assert "Objective 1: First Objective" in result
    assert "Description: Description of first objective" in result
    assert "Task 1: First Task" in result

    result = format_existing_objectives_text([])
    assert result == "None"


def test_no_objectives_generated_error(mock_logger: MagicMock) -> None:
    """Test error when no objectives are generated"""
    from services.rag.src.autofill.research_plan_handler import parse_and_validate_objectives

    empty_response: dict[str, Any] = {"research_objectives": []}

    with pytest.raises(ValueError, match="No research objectives generated"):
        parse_and_validate_objectives(empty_response, mock_logger)


def test_objective_without_tasks_error(mock_logger: MagicMock) -> None:
    """Test error when objective has no research tasks"""
    from services.rag.src.autofill.research_plan_handler import parse_and_validate_objectives

    response_without_tasks = {
        "research_objectives": [{"number": 1, "title": "Objective without tasks", "research_tasks": []}]
    }

    with pytest.raises(ValueError, match="Objective 1 has no research tasks"):
        parse_and_validate_objectives(response_without_tasks, mock_logger)
