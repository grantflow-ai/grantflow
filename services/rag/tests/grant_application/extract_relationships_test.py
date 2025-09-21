from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective, ResearchTask

from services.rag.src.grant_application.extract_relationships import handle_extract_relationships


@pytest.fixture
def sample_research_objectives() -> list[ResearchObjective]:
    return [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        ),
        ResearchObjective(
            number=2,
            title="Create ML model",
            research_tasks=[
                ResearchTask(number=1, title="Design algorithms"),
                ResearchTask(number=2, title="Train model"),
            ],
        ),
        ResearchObjective(
            number=3,
            title="Clinical validation",
            research_tasks=[
                ResearchTask(number=1, title="Recruit patients"),
                ResearchTask(number=2, title="Collect samples"),
            ],
        ),
    ]


@pytest.fixture
def sample_grant_section() -> dict[str, Any]:
    return {
        "id": "research_plan",
        "title": "Research Plan",
        "order": 3,
        "parent_id": None,
        "keywords": ["methodology"],
        "topics": ["methods"],
        "generation_instructions": "Describe methodology",
        "depends_on": [],
        "max_words": 1500,
        "search_queries": ["methodology"],
        "is_detailed_research_plan": True,
        "is_clinical_trial": None,
    }


@pytest.fixture
def sample_form_inputs() -> dict[str, Any]:
    return {
        "background_context": "This is a cancer research project focusing on biomarker discovery",
        "institution": "University of Research",
        "duration": "3 years",
    }


@patch("services.rag.src.grant_application.extract_relationships.retrieve_documents")
@patch("services.rag.src.grant_application.extract_relationships.with_prompt_evaluation")
async def test_handle_extract_relationships_success(
    mock_with_prompt_evaluation: AsyncMock,
    mock_retrieve_documents: AsyncMock,
    sample_research_objectives: list[ResearchObjective],
    sample_grant_section: GrantLongFormSection,
    sample_form_inputs: ResearchDeepDive,
) -> None:
    mock_relationships_response = {
        "relationships": [
            ("1", "2", "The biomarkers identified in objective 1 will be used as features in the ML model"),
            ("1", "3", "Validated biomarkers are needed for clinical validation"),
            ("2", "3", "ML model predictions will guide clinical validation strategy"),
            ("1.1", "1.2", "Biomarker identification must occur before validation"),
            ("1.2", "2.1", "Validation results inform algorithm design"),
            ("2.1", "2.2", "Algorithm design precedes model training"),
            ("2.2", "3.1", "Trained model guides patient recruitment strategy"),
        ]
    }
    mock_with_prompt_evaluation.return_value = mock_relationships_response
    mock_retrieve_documents.return_value = ["Retrieved context document 1", "Retrieved context document 2"]

    test_app_id = str(uuid4())
    test_trace_id = str(uuid4())

    result = await handle_extract_relationships(
        application_id=test_app_id,
        research_objectives=sample_research_objectives,
        grant_section=sample_grant_section,
        form_inputs=sample_form_inputs,
        trace_id=test_trace_id,
    )

    assert isinstance(result, dict)
    assert "1" in result
    assert "2" in result
    assert "1.1" in result
    assert "1.2" in result
    assert "2.1" in result
    assert "2.2" in result

    assert len(result["1"]) == 2
    assert result["1"][0] == ("2", "The biomarkers identified in objective 1 will be used as features in the ML model")
    assert result["1"][1] == ("3", "Validated biomarkers are needed for clinical validation")

    mock_with_prompt_evaluation.assert_called_once()
    mock_retrieve_documents.assert_called_once()

    retrieval_call = mock_retrieve_documents.call_args
    assert retrieval_call.kwargs["application_id"] == test_app_id

    eval_call = mock_with_prompt_evaluation.call_args
    assert eval_call.kwargs["prompt_identifier"] == "extract_relationships"
    assert eval_call.kwargs["research_objectives"] == sample_research_objectives


@patch("services.rag.src.grant_application.extract_relationships.retrieve_documents")
@patch("services.rag.src.grant_application.extract_relationships.with_prompt_evaluation")
async def test_handle_extract_relationships_empty_objectives(
    mock_with_prompt_evaluation: AsyncMock,
    mock_retrieve_documents: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_form_inputs: ResearchDeepDive,
) -> None:
    mock_with_prompt_evaluation.return_value = {"relationships": []}
    mock_retrieve_documents.return_value = []

    result = await handle_extract_relationships(
        application_id=str(uuid4()),
        research_objectives=[],
        grant_section=sample_grant_section,
        form_inputs=sample_form_inputs,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, dict)
    assert len(result) == 0

    mock_with_prompt_evaluation.assert_called_once()
    mock_retrieve_documents.assert_called_once()


@patch("services.rag.src.grant_application.extract_relationships.retrieve_documents")
@patch("services.rag.src.grant_application.extract_relationships.with_prompt_evaluation")
async def test_handle_extract_relationships_single_objective(
    mock_with_prompt_evaluation: AsyncMock,
    mock_retrieve_documents: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_form_inputs: ResearchDeepDive,
) -> None:
    single_objective = [
        ResearchObjective(
            number=1,
            title="Single objective",
            research_tasks=[
                ResearchTask(number=1, title="Single task"),
            ],
        )
    ]

    mock_relationships_response: dict[str, list[Any]] = {
        "relationships": []
    }
    mock_with_prompt_evaluation.return_value = mock_relationships_response
    mock_retrieve_documents.return_value = []

    result = await handle_extract_relationships(
        application_id=str(uuid4()),
        research_objectives=single_objective,
        grant_section=sample_grant_section,
        form_inputs=sample_form_inputs,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, dict)
    assert len(result) == 0

    mock_with_prompt_evaluation.assert_called_once()
    mock_retrieve_documents.assert_called_once()


@patch("services.rag.src.grant_application.extract_relationships.retrieve_documents")
@patch("services.rag.src.grant_application.extract_relationships.with_prompt_evaluation")
async def test_handle_extract_relationships_complex_dependencies(
    mock_with_prompt_evaluation: AsyncMock,
    mock_retrieve_documents: AsyncMock,
    sample_research_objectives: list[ResearchObjective],
    sample_grant_section: GrantLongFormSection,
    sample_form_inputs: ResearchDeepDive,
) -> None:
    mock_relationships_response = {
        "relationships": [
            ("1", "2", "Biomarkers serve as ML features"),
            ("1", "3", "Biomarkers enable clinical validation"),
            ("2", "3", "ML predictions guide clinical studies"),
            ("2", "1", "ML model depends on biomarker data quality"),
            ("3", "1", "Clinical validation confirms biomarker utility"),
            ("3", "2", "Clinical studies evaluate ML model performance"),
            ("1.1", "1.2", "Identification precedes validation"),
            ("1.1", "2.1", "Biomarker identification informs algorithm design"),
            ("1.2", "2.2", "Validation enables model training"),
            ("1.2", "3.1", "Validation guides patient recruitment"),
            ("2.1", "2.2", "Design precedes training"),
            ("2.1", "3.2", "Algorithm design defines data collection requirements"),
        ]
    }
    mock_with_prompt_evaluation.return_value = mock_relationships_response
    mock_retrieve_documents.return_value = []

    result = await handle_extract_relationships(
        application_id=str(uuid4()),
        research_objectives=sample_research_objectives,
        grant_section=sample_grant_section,
        form_inputs=sample_form_inputs,
        trace_id=str(uuid4()),
    )

    assert len(result["1"]) == 2
    assert len(result["2"]) == 2
    assert len(result["3"]) == 2
    assert len(result["1.1"]) == 2
    assert len(result["1.2"]) == 2
    assert len(result["2.1"]) == 2

    assert ("2", "Biomarkers serve as ML features") in result["1"]
    assert ("1", "ML model depends on biomarker data quality") in result["2"]


@patch("services.rag.src.grant_application.extract_relationships.retrieve_documents")
@patch("services.rag.src.grant_application.extract_relationships.with_prompt_evaluation")
async def test_handle_extract_relationships_no_form_inputs(
    mock_with_prompt_evaluation: AsyncMock,
    mock_retrieve_documents: AsyncMock,
    sample_research_objectives: list[ResearchObjective],
    sample_grant_section: GrantLongFormSection,
) -> None:
    mock_relationships_response = {
        "relationships": [
            ("1", "2", "Basic relationship without context"),
        ]
    }
    mock_with_prompt_evaluation.return_value = mock_relationships_response
    mock_retrieve_documents.return_value = []

    result = await handle_extract_relationships(
        application_id=str(uuid4()),
        research_objectives=sample_research_objectives,
        grant_section=sample_grant_section,
        form_inputs={},
        trace_id=str(uuid4()),
    )

    assert isinstance(result, dict)
    assert len(result["1"]) == 1
    assert result["1"][0] == ("2", "Basic relationship without context")

    mock_with_prompt_evaluation.assert_called_once()
    mock_retrieve_documents.assert_called_once()


@patch("services.rag.src.grant_application.extract_relationships.retrieve_documents")
@patch("services.rag.src.grant_application.extract_relationships.with_prompt_evaluation")
async def test_handle_extract_relationships_error_handling(
    mock_with_prompt_evaluation: AsyncMock,
    mock_retrieve_documents: AsyncMock,
    sample_research_objectives: list[ResearchObjective],
    sample_grant_section: GrantLongFormSection,
    sample_form_inputs: ResearchDeepDive,
) -> None:
    mock_with_prompt_evaluation.side_effect = Exception("Relationship extraction service error")
    mock_retrieve_documents.return_value = []

    with pytest.raises(Exception, match="Relationship extraction service error"):
        await handle_extract_relationships(
            application_id=str(uuid4()),
            research_objectives=sample_research_objectives,
            grant_section=sample_grant_section,
            form_inputs=sample_form_inputs,
            trace_id=str(uuid4()),
        )

    mock_with_prompt_evaluation.assert_called_once()
    mock_retrieve_documents.assert_called_once()
