import types
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.rag.src.autofill.research_deep_dive_handler import handle_research_deep_dive
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
        "autofill_type": "research_deep_dive",
    }


@pytest.fixture
def sample_application() -> dict[str, Any]:
    return {
        "title": "AI-Powered Medical Diagnosis",
        "research_objectives": [
            {
                "number": 1,
                "title": "Develop ML Models",
                "description": "Create machine learning models for medical diagnosis",
            }
        ],
        "form_inputs": {},
    }


async def test_generate_field_answer(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.research_deep_dive_handler import generate_field_answer

    with patch("services.rag.src.autofill.research_deep_dive_handler.handle_completions_request") as mock_completion:
        mock_completion.return_value = "This is a generated answer about research background that provides comprehensive details about the context and motivation for this important medical research project."

        result = await generate_field_answer(
            field_name="background_context",
            application_title="Test Application",
            research_objectives=[],
            documents=["Sample document content about medical research"],
            existing_answers={},
        )

        assert len(result) >= 50
        assert "research background" in result.lower()
        mock_completion.assert_called_once()


def test_function_import_deep_dive() -> None:
    import inspect

    from services.rag.src.autofill.research_deep_dive_handler import handle_research_deep_dive

    sig = inspect.signature(handle_research_deep_dive)
    params = list(sig.parameters.keys())

    assert "request" in params
    assert "session_maker" in params
    assert "logger" in params
    assert inspect.iscoroutinefunction(handle_research_deep_dive)


def test_field_mapping_keys() -> None:
    from services.rag.src.autofill.constants import RESEARCH_DEEP_DIVE_FIELD_MAPPING

    expected_fields = {
        "background_context",
        "hypothesis",
        "rationale",
        "novelty_and_innovation",
        "impact",
        "team_excellence",
        "research_feasibility",
        "preliminary_data",
    }

    actual_fields = set(RESEARCH_DEEP_DIVE_FIELD_MAPPING.keys())
    assert actual_fields == expected_fields

    for description in RESEARCH_DEEP_DIVE_FIELD_MAPPING.values():
        assert len(description.strip()) > 0
        assert "?" in description


def test_format_documents_for_context(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.research_deep_dive_handler import format_documents_for_context

    documents = ["Medical research shows promising results", "A" * 400]

    result = format_documents_for_context(documents)

    assert "- Medical research shows promising results..." in result
    assert result.count("- ") == 2

    result = format_documents_for_context([])
    assert result == "No research documents available."


def test_format_research_objectives(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.research_deep_dive_handler import format_research_objectives

    objectives = [
        {"number": 1, "title": "First Objective", "description": "Description of first objective"},
        {"number": 2, "title": "Second Objective"},
    ]

    result = format_research_objectives(objectives)

    assert "1. First Objective" in result
    assert "   Description of first objective" in result
    assert "2. Second Objective" in result

    result = format_research_objectives([])
    assert result == "No research objectives defined."


def test_format_existing_answers(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.research_deep_dive_handler import format_existing_answers

    existing_answers = {
        "background_context": "Previous answer about background",
        "hypothesis": "A" * 150,
        "rationale": "",
    }

    result = format_existing_answers(existing_answers, "impact")

    assert "What is the context" in result
    assert "Previous answer about background" in result
    assert "..." in result
    assert "rationale" not in result.lower()

    result = format_existing_answers({}, "impact")
    assert result == "None"


async def test_answer_too_short_validation(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.research_deep_dive_handler import generate_field_answer

    with patch("services.rag.src.autofill.research_deep_dive_handler.handle_completions_request") as mock_completion:
        mock_completion.return_value = "Short"

        with pytest.raises(ValueError, match="Generated answer too short"):
            await generate_field_answer(
                field_name="background_context",
                application_title="Test",
                research_objectives=[],
                documents=[],
                existing_answers={},
            )


def test_field_mapping_completeness(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.constants import RESEARCH_DEEP_DIVE_FIELD_MAPPING

    expected_fields = [
        "background_context",
        "hypothesis",
        "rationale",
        "novelty_and_innovation",
        "impact",
        "team_excellence",
        "research_feasibility",
        "preliminary_data",
    ]

    for field in expected_fields:
        assert field in RESEARCH_DEEP_DIVE_FIELD_MAPPING
        assert len(RESEARCH_DEEP_DIVE_FIELD_MAPPING[field]) > 10


async def test_validation_failure_handling(
    mock_logger: MagicMock, mock_session_maker: AsyncMock, sample_request: AutofillRequestDTO
) -> None:
    with patch(
        "services.rag.src.autofill.research_deep_dive_handler.verify_rag_sources_indexed", new_callable=AsyncMock
    ) as mock_validate:
        mock_validate.side_effect = Exception("Indexing incomplete")
        response = await handle_research_deep_dive(sample_request, mock_session_maker, mock_logger)

        assert not response["success"]
        assert "Indexing incomplete" in response["error"]
