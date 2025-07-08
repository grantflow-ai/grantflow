from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.rag.src.autofill.research_plan_handler import ResearchPlanHandler
from services.rag.src.dto import AutofillRequestDTO


@pytest.fixture
def mock_logger() -> MagicMock:
    return MagicMock()


@pytest.fixture
def sample_request() -> AutofillRequestDTO:
    return {
        "parent_type": "grant_application",
        "parent_id": "app-123",
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


async def test_generate_content_success(
    mock_logger: MagicMock,
    sample_request: AutofillRequestDTO,
    sample_application: dict[str, Any],
    sample_documents: list[str],
) -> None:
    """Test successful content generation"""
    handler = ResearchPlanHandler(mock_logger)
    with (
        patch.object(handler, "_validate_indexing_complete", new_callable=AsyncMock),
        patch("services.rag.src.autofill.research_plan_handler.handle_create_search_queries") as mock_search,
        patch("services.rag.src.autofill.research_plan_handler.retrieve_documents") as mock_retrieve,
        patch("services.rag.src.autofill.research_plan_handler.handle_completions_request") as mock_completion,
    ):
        mock_search.return_value = ["machine learning medical diagnosis", "AI healthcare applications"]
        mock_retrieve.return_value = sample_documents
        mock_completion.return_value = {
            "research_objectives": [
                {
                    "number": 1,
                    "title": "Develop ML Models",
                    "description": "Create machine learning models for diagnosis",
                    "research_tasks": [
                        {"number": 1, "title": "Data Collection", "description": "Collect medical imaging data"}
                    ],
                }
            ]
        }

        result = await handler._generate_content(sample_request, sample_application)

        assert "research_objectives" in result
        assert len(result["research_objectives"]) == 1
        assert result["research_objectives"][0]["title"] == "Develop ML Models"


async def test_validation_failure(mock_logger: MagicMock, sample_request: AutofillRequestDTO) -> None:
    """Test handling of validation failures"""
    handler = ResearchPlanHandler(mock_logger)
    with patch.object(handler, "_validate_indexing_complete", new_callable=AsyncMock) as mock_validate:
        mock_validate.side_effect = Exception("Indexing incomplete")
        response = await handler.handle_request(sample_request)

        assert not response["success"]
        assert "Indexing incomplete" in response["error"]


def test_parse_research_objectives_validation(mock_logger: MagicMock) -> None:
    """Test objective parsing and validation"""
    handler = ResearchPlanHandler(mock_logger)

    valid_response = {
        "research_objectives": [
            {"number": 1, "title": "Test Objective", "research_tasks": [{"number": 1, "title": "Test Task"}]}
        ]
    }

    result = handler._parse_and_validate_objectives(valid_response)
    assert len(result) == 1

    invalid_response = {"research_objectives": [{"number": 1}]}

    with pytest.raises(ValueError, match="Invalid objective structure"):
        handler._parse_and_validate_objectives(invalid_response)


def test_format_documents_for_context(mock_logger: MagicMock) -> None:
    """Test document formatting"""
    handler = ResearchPlanHandler(mock_logger)

    documents = ["Short content", "A" * 500]

    result = handler._format_documents_for_context(documents)

    assert "Document 1:" in result
    assert "Document 2:" in result
    assert len(result.split("\n")) == 2

    result = handler._format_documents_for_context([])
    assert result == "No research documents available."


def test_format_existing_objectives(mock_logger: MagicMock) -> None:
    """Test existing objectives formatting"""
    handler = ResearchPlanHandler(mock_logger)

    objectives = [
        {
            "number": 1,
            "title": "First Objective",
            "description": "Description of first objective",
            "research_tasks": [{"number": 1, "title": "First Task"}],
        }
    ]

    result = handler._format_existing_objectives(objectives)

    assert "Objective 1: First Objective" in result
    assert "Description: Description of first objective" in result
    assert "Task 1: First Task" in result

    result = handler._format_existing_objectives([])
    assert result == "None"


def test_no_objectives_generated_error(mock_logger: MagicMock) -> None:
    """Test error when no objectives are generated"""
    handler = ResearchPlanHandler(mock_logger)

    empty_response: dict[str, Any] = {"research_objectives": []}

    with pytest.raises(ValueError, match="No research objectives generated"):
        handler._parse_and_validate_objectives(empty_response)


def test_objective_without_tasks_error(mock_logger: MagicMock) -> None:
    """Test error when objective has no research tasks"""
    handler = ResearchPlanHandler(mock_logger)

    response_without_tasks = {
        "research_objectives": [{"number": 1, "title": "Objective without tasks", "research_tasks": []}]
    }

    with pytest.raises(ValueError, match="Objective 1 has no research tasks"):
        handler._parse_and_validate_objectives(response_without_tasks)
