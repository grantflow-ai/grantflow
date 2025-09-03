import types
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from packages.shared_utils.src.pubsub import AutofillRequest

from services.rag.src.autofill.research_deep_dive_handler import generate_research_deep_dive_content


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
def sample_request() -> AutofillRequest:
    return {
        "application_id": "123e4567-e89b-12d3-a456-426614174000",
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
    from packages.db.src.tables import GrantApplication

    from services.rag.src.autofill.research_deep_dive_handler import _generate_field_answer

    with (
        patch("services.rag.src.autofill.research_deep_dive_handler.handle_completions_request") as mock_completion,
        patch("services.rag.src.autofill.research_deep_dive_handler.handle_create_search_queries") as mock_search,
        patch("services.rag.src.autofill.research_deep_dive_handler.retrieve_documents") as mock_retrieve,
    ):
        mock_search.return_value = ["search query 1"]
        mock_retrieve.return_value = ["Document content about medical research"]
        mock_completion.return_value = {
            "answer": "This is a generated answer about research background that provides comprehensive details about the context and motivation for this important medical research project. "
            * 5
        }

        app = GrantApplication(id="test-id", title="Test Application")
        result = await _generate_field_answer(
            application=app, field_name="background_context", objectives_text="Test objectives"
        )

        assert len(result) >= 50
        mock_completion.assert_called_once()


def test_function_import_deep_dive() -> None:
    import inspect

    from services.rag.src.autofill.research_deep_dive_handler import generate_research_deep_dive_content

    sig = inspect.signature(generate_research_deep_dive_content)
    params = list(sig.parameters.keys())

    assert "application" in params
    assert inspect.iscoroutinefunction(generate_research_deep_dive_content)


def test_field_mapping_keys() -> None:
    from services.rag.src.autofill.research_deep_dive_handler import RESEARCH_DEEP_DIVE_FIELD_MAPPING

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


def test_format_research_objectives(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.research_deep_dive_handler import _format_research_objectives

    objectives = [
        {"number": 1, "title": "First Objective", "description": "Description of first objective"},
        {"number": 2, "title": "Second Objective"},
    ]

    result = _format_research_objectives(objectives)

    assert "1. First Objective" in result
    assert "Description of first objective" in result
    assert "2. Second Objective" in result

    result = _format_research_objectives([])
    assert result == ""


def test_validate_answer_response(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.research_deep_dive_handler import _validate_answer_response

    # Valid response (needs ~200-500 words)
    valid_response = {
        "answer": "This is a valid answer that meets the minimum length requirement. " * 30  # ~210 words
    }
    _validate_answer_response(valid_response)

    # Test missing answer field
    with pytest.raises(ValueError, match="Missing 'answer' field"):
        _validate_answer_response({"something_else": "value"})

    # Test non-string answer
    with pytest.raises(ValueError, match="Answer must be a string"):
        _validate_answer_response({"answer": 123})

    # Test answer too short
    with pytest.raises(ValueError, match="Answer too short"):
        _validate_answer_response({"answer": "Too short"})

    # Test answer with too few words
    with pytest.raises(ValueError, match="Answer has too few words"):
        _validate_answer_response({"answer": "word " * 50})  # 50 words, needs ~150+

    # Test answer with too many words
    with pytest.raises(ValueError, match="Answer has too many words"):
        _validate_answer_response({"answer": "word " * 700})  # 700 words, max ~600


def test_field_mapping_completeness(mock_logger: MagicMock) -> None:
    from services.rag.src.autofill.research_deep_dive_handler import RESEARCH_DEEP_DIVE_FIELD_MAPPING

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


async def test_generate_research_deep_dive_content_with_mocks(
    mock_logger: MagicMock, mock_session_maker: AsyncMock, sample_application: dict[str, Any]
) -> None:
    from packages.db.src.tables import GrantApplication

    app = GrantApplication(id="test-id", title="Test Application", research_objectives=[])

    with (
        patch(
            "services.rag.src.autofill.research_deep_dive_handler.handle_create_search_queries", new_callable=AsyncMock
        ) as mock_search,
        patch(
            "services.rag.src.autofill.research_deep_dive_handler.retrieve_documents", new_callable=AsyncMock
        ) as mock_retrieve,
        patch(
            "services.rag.src.autofill.research_deep_dive_handler._generate_field_answer", new_callable=AsyncMock
        ) as mock_generate,
    ):
        mock_search.return_value = ["search query 1", "search query 2"]
        mock_retrieve.return_value = ["Document content 1", "Document content 2"]
        mock_generate.return_value = "Generated answer text " * 30

        result = await generate_research_deep_dive_content(application=app)

        assert isinstance(result, dict)
        assert "background_context" in result
