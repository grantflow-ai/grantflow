from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.rag.src.autofill.research_deep_dive_handler import ResearchDeepDiveHandler
from services.rag.src.dto import AutofillRequestDTO


@pytest.fixture
def mock_logger() -> MagicMock:
    return MagicMock()


@pytest.fixture
def sample_request() -> AutofillRequestDTO:
    return {
        "parent_type": "grant_application",
        "parent_id": "app-123",
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
                "description": "Create machine learning models for medical diagnosis"
            }
        ],
        "form_inputs": {}
    }


async def test_generate_field_answer(mock_logger: MagicMock) -> None:
    """Test single field answer generation"""
    handler = ResearchDeepDiveHandler(mock_logger)

    with patch("services.rag.src.autofill.research_deep_dive_handler.handle_completions_request") as mock_completion:
        mock_completion.return_value = "This is a generated answer about research background that provides comprehensive details about the context and motivation for this important medical research project."

        result = await handler._generate_field_answer(
            field_name="background_context",
            application_title="Test Application",
            research_objectives=[],
            documents=[{"content": "Sample document content about medical research"}],
            existing_answers={}
        )

        assert len(result) >= 50  
        assert "research background" in result.lower()
        mock_completion.assert_called_once()


async def test_skip_existing_answers(mock_logger: MagicMock, sample_request: AutofillRequestDTO) -> None:
    """Test that existing answers are skipped"""
    handler = ResearchDeepDiveHandler(mock_logger)
    handler._validate_indexing_complete = AsyncMock()

    sample_application = {
        "title": "Test",
        "research_objectives": [],
        "form_inputs": {
            "background_context": "Existing answer that should be preserved"
        }
    }

    with patch("services.rag.src.autofill.research_deep_dive_handler.retrieve_documents") as mock_retrieve:
        mock_retrieve.return_value = []

        result = await handler._generate_content(sample_request, sample_application)

        
        
        assert len(result["form_inputs"]) == 0 or "background_context" not in result["form_inputs"]


async def test_single_field_generation(mock_logger: MagicMock, sample_application: dict[str, Any]) -> None:
    """Test generation of single field only"""
    handler = ResearchDeepDiveHandler(mock_logger)
    handler._validate_indexing_complete = AsyncMock()

    sample_request: AutofillRequestDTO = {
        "parent_type": "grant_application",
        "parent_id": "app-123",
        "autofill_type": "research_deep_dive",
        "field_name": "hypothesis"
    }

    with patch("services.rag.src.autofill.research_deep_dive_handler.retrieve_documents") as mock_retrieve:
        mock_retrieve.return_value = []

        with patch.object(handler, "_generate_field_answer") as mock_generate:
            mock_generate.return_value = "Generated hypothesis about the research question and expected outcomes based on the available evidence."

            result = await handler._generate_content(sample_request, sample_application)

            assert result["form_inputs"]["hypothesis"] == "Generated hypothesis about the research question and expected outcomes based on the available evidence."
            assert len(result["form_inputs"]) == 1


def test_format_documents_for_context(mock_logger: MagicMock) -> None:
    """Test document formatting for context"""
    handler = ResearchDeepDiveHandler(mock_logger)

    documents = [
        {"content": "Medical research shows promising results"},
        {"content": "A" * 400}  
    ]

    result = handler._format_documents_for_context(documents)

    assert "- Medical research shows promising results..." in result
    assert result.count("- ") == 2  

    
    result = handler._format_documents_for_context([])
    assert result == "No research documents available."


def test_format_research_objectives(mock_logger: MagicMock) -> None:
    """Test research objectives formatting"""
    handler = ResearchDeepDiveHandler(mock_logger)

    objectives = [
        {
            "number": 1,
            "title": "First Objective",
            "description": "Description of first objective"
        },
        {
            "number": 2,
            "title": "Second Objective"
        }
    ]

    result = handler._format_research_objectives(objectives)

    assert "1. First Objective" in result
    assert "   Description of first objective" in result
    assert "2. Second Objective" in result

    
    result = handler._format_research_objectives([])
    assert result == "No research objectives defined."


def test_format_existing_answers(mock_logger: MagicMock) -> None:
    """Test existing answers formatting"""
    handler = ResearchDeepDiveHandler(mock_logger)

    existing_answers = {
        "background_context": "Previous answer about background",
        "hypothesis": "A" * 150,  
        "rationale": ""  
    }

    result = handler._format_existing_answers(existing_answers, "impact")  

    assert "What is the context" in result
    assert "Previous answer about background" in result
    assert "..." in result  
    assert "rationale" not in result.lower()  

    
    result = handler._format_existing_answers({}, "impact")
    assert result == "None"


async def test_answer_too_short_validation(mock_logger: MagicMock) -> None:
    """Test that very short answers are rejected"""
    handler = ResearchDeepDiveHandler(mock_logger)

    with patch("services.rag.src.autofill.research_deep_dive_handler.handle_completions_request") as mock_completion:
        mock_completion.return_value = "Short"  

        with pytest.raises(ValueError, match="Generated answer too short"):
            await handler._generate_field_answer(
                field_name="background_context",
                application_title="Test",
                research_objectives=[],
                documents=[],
                existing_answers={}
            )


def test_field_mapping_completeness(mock_logger: MagicMock) -> None:
    """Test that all expected fields are in FIELD_MAPPING"""
    handler = ResearchDeepDiveHandler(mock_logger)

    expected_fields = [
        "background_context", "hypothesis", "rationale",
        "novelty_and_innovation", "impact", "team_excellence",
        "research_feasibility", "preliminary_data"
    ]

    for field in expected_fields:
        assert field in handler.FIELD_MAPPING
        assert len(handler.FIELD_MAPPING[field]) > 10  


async def test_validation_failure_handling(mock_logger: MagicMock, sample_request: AutofillRequestDTO) -> None:
    """Test handling of validation failures"""
    handler = ResearchDeepDiveHandler(mock_logger)
    handler._validate_indexing_complete = AsyncMock(side_effect=Exception("Indexing incomplete"))

    response = await handler.handle_request(sample_request)

    assert not response["success"]
    assert "Indexing incomplete" in response["error"]
