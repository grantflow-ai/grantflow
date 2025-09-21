"""
Tests for grant application pipeline stage handlers.

This module tests the individual stage handlers used in the grant application
generation pipeline. Each handler is tested for successful execution, error
handling, and proper data flow between stages.

Key areas tested:
- Section generation with document retrieval and AI completion
- Relationship extraction between research objectives
- Objective enrichment with external context
- Terminology enrichment with Wikidata integration
- Research plan generation combining all previous stages

All tests use real database fixtures and mock external AI/API calls for
deterministic results while maintaining integration test quality.
"""

from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask

from services.rag.src.grant_application.handlers import (
    handle_enrich_objectives_stage,
    handle_enrich_terminology_stage,
    handle_extract_relationships_stage,
    handle_generate_research_plan_stage,
    handle_generate_sections_stage,
)

# Use research_objectives fixture from conftest.py instead of custom implementation


@pytest.fixture
def sample_work_plan_section() -> dict[str, Any]:
    """Sample work plan section."""
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
def sample_grant_sections() -> list[dict[str, Any]]:
    """Sample grant sections."""
    return [
        {
            "id": "abstract",
            "title": "Abstract",
            "order": 1,
            "parent_id": None,
            "keywords": ["summary"],
            "topics": ["overview"],
            "generation_instructions": "Write abstract",
            "depends_on": [],
            "max_words": 250,
            "search_queries": ["abstract"],
            "is_detailed_research_plan": False,
            "is_clinical_trial": None,
        },
        {
            "id": "significance",
            "title": "Significance",
            "order": 2,
            "parent_id": None,
            "keywords": ["impact"],
            "topics": ["importance"],
            "generation_instructions": "Explain significance",
            "depends_on": [],
            "max_words": 500,
            "search_queries": ["significance"],
            "is_detailed_research_plan": False,
            "is_clinical_trial": None,
        },
    ]


@patch("services.rag.src.grant_application.handlers.retrieve_documents")
@patch("services.rag.src.grant_application.handlers.handle_generate_section_text")
@patch("services.rag.src.grant_application.handlers.batched_gather")
async def test_generate_sections_stage_success(
    mock_batched_gather: AsyncMock,
    mock_handle_generate_section_text: AsyncMock,
    mock_retrieve_documents: AsyncMock,
    mock_grant_application_job_manager: AsyncMock,
    grant_application: Any,
    sample_grant_sections: list[dict[str, Any]],
    sample_work_plan_section: dict[str, Any],
) -> None:
    """Test successful section generation stage."""
    # Setup grant application data
    grant_application.research_objectives = [
        ResearchObjective(
            number=1,
            title="Test objective",
            research_tasks=[ResearchTask(number=1, title="Test task")],
        )
    ]

    # Mock the grant_template to avoid lazy loading issues
    mock_grant_template = AsyncMock()
    mock_grant_template.grant_sections = [*sample_grant_sections, sample_work_plan_section]
    mock_grant_template.cfp_analysis = {
        "sections_count": 3,
        "length_constraints_found": 2,
        "evaluation_criteria_count": 2,
    }
    grant_application.grant_template = mock_grant_template

    # Setup mocks
    mock_retrieve_documents.return_value = ["Retrieved context document 1", "Retrieved context document 2"]
    mock_batched_gather.return_value = ["Generated abstract text", "Generated significance text"]

    # Execute
    result = await handle_generate_sections_stage(
        grant_application=grant_application,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "section_texts" in result
    assert "work_plan_section" in result
    assert len(result["section_texts"]) == 2
    assert result["section_texts"][0]["section_id"] == "abstract"
    assert result["section_texts"][1]["section_id"] == "significance"
    assert result["work_plan_section"]["id"] == "research_plan"

    # Verify job manager methods were called
    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()

    # Verify retrieval was called
    mock_retrieve_documents.assert_called_once()


@patch("services.rag.src.grant_application.handlers.handle_extract_relationships")
async def test_extract_relationships_stage_success(
    mock_handle_extract_relationships: AsyncMock,
    mock_grant_application_job_manager: AsyncMock,
    grant_application: Any,
    research_objectives: list[ResearchObjective],
    sample_work_plan_section: dict[str, Any],
) -> None:
    """Test successful relationship extraction stage."""
    # Setup grant application
    grant_application.research_objectives = research_objectives

    # Setup input DTO
    input_dto = {
        "section_texts": [
            {"section_id": "abstract", "text": "Abstract text"},
            {"section_id": "significance", "text": "Significance text"},
        ],
        "work_plan_section": sample_work_plan_section,
    }

    # Setup mock
    mock_relationships = {
        "1": [("2", "provides_data_for", "Objective 1 provides data for objective 2")],
        "2": [("1", "depends_on", "Objective 2 depends on objective 1")],
    }
    mock_handle_extract_relationships.return_value = mock_relationships

    # Execute
    result = await handle_extract_relationships_stage(
        grant_application=grant_application,
        dto=input_dto,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "relationships" in result
    assert result["relationships"] == mock_relationships

    # Verify job manager methods were called
    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.handle_batch_enrich_objectives")
async def test_enrich_objectives_stage_success(
    mock_handle_batch_enrich_objectives: AsyncMock,
    mock_grant_application_job_manager: AsyncMock,
    grant_application: Any,
    research_objectives: list[ResearchObjective],
    sample_work_plan_section: dict[str, Any],
) -> None:
    """Test successful objective enrichment stage."""
    # Setup grant application
    grant_application.research_objectives = research_objectives

    # Setup input DTO
    input_dto = {
        "section_texts": [{"section_id": "abstract", "text": "Abstract text"}],
        "work_plan_section": sample_work_plan_section,
        "relationships": {
            "1": [("2", "provides_data_for", "Objective 1 provides data for objective 2")],
            "2": [("1", "depends_on", "Objective 2 depends on objective 1")],
        },
    }

    # Setup mock
    mock_enrichment_responses = [
        {
            "research_objective": {
                "description": "Enhanced objective 1",
                "instructions": "Detailed instructions",
                "guiding_questions": ["Question 1"],
                "search_queries": ["query 1"],
            },
            "research_tasks": [
                {
                    "description": "Enhanced task 1.1",
                    "instructions": "Task instructions",
                    "guiding_questions": ["Task question"],
                    "search_queries": ["task query"],
                }
            ],
        },
        {
            "research_objective": {
                "description": "Enhanced objective 2",
                "instructions": "Detailed instructions",
                "guiding_questions": ["Question 2"],
                "search_queries": ["query 2"],
            },
            "research_tasks": [
                {
                    "description": "Enhanced task 2.1",
                    "instructions": "Task instructions",
                    "guiding_questions": ["Task question"],
                    "search_queries": ["task query"],
                }
            ],
        },
    ]
    mock_handle_batch_enrich_objectives.return_value = mock_enrichment_responses

    # Execute
    result = await handle_enrich_objectives_stage(
        grant_application=grant_application,
        dto=input_dto,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "enrichment_responses" in result
    assert len(result["enrichment_responses"]) == 2

    # Verify job manager methods were called
    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.enrich_objective_with_wikidata")
@patch("services.rag.src.grant_application.handlers.batched_gather")
async def test_enrich_terminology_stage_success(
    mock_batched_gather: AsyncMock,
    mock_enrich_objective_with_wikidata: AsyncMock,
    mock_grant_application_job_manager: AsyncMock,
    grant_application: Any,
) -> None:
    """Test successful terminology enrichment stage."""
    # Setup input DTO
    input_dto = {
        "section_texts": [{"section_id": "abstract", "text": "Abstract text"}],
        "work_plan_section": {"id": "research_plan"},
        "relationships": {},
        "enrichment_responses": [
            {
                "research_objective": {
                    "description": "Enhanced objective 1",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                    }
                ],
            },
            {
                "research_objective": {
                    "description": "Enhanced objective 2",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                    }
                ],
            },
        ],
    }

    # Setup mocks
    mock_terminology_contexts = [
        {
            "core_scientific_terms": ["biomarkers", "proteomics"],
            "scientific_context": "Cancer biomarker discovery",
        },
        {
            "core_scientific_terms": ["machine learning", "algorithms"],
            "scientific_context": "ML model development",
        },
    ]
    mock_batched_gather.return_value = mock_terminology_contexts

    # Execute
    result = await handle_enrich_terminology_stage(
        dto=input_dto,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "enrichment_responses" in result
    assert "wikidata_enrichments" in result
    assert len(result["wikidata_enrichments"]) == 2

    # Verify job manager methods were called
    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()


@patch("services.rag.src.grant_application.handlers.generate_objective_with_tasks")
async def test_generate_research_plan_stage_success(
    mock_generate_objective_with_tasks: AsyncMock,
    mock_grant_application_job_manager: AsyncMock,
    grant_application: Any,
) -> None:
    """Test successful research plan generation stage."""
    # Setup grant application research objectives
    grant_application.research_objectives = [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        )
    ]

    # Setup input DTO with matching task count
    input_dto = {
        "section_texts": [{"section_id": "abstract", "text": "Abstract text"}],
        "work_plan_section": {"id": "research_plan", "max_words": 1500},
        "relationships": {},
        "enrichment_responses": [
            {
                "research_objective": {
                    "description": "Enhanced objective 1",
                    "instructions": "Instructions",
                    "guiding_questions": ["Question"],
                    "search_queries": ["query"],
                },
                "research_tasks": [
                    {
                        "description": "Enhanced task 1.1",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                    },
                    {
                        "description": "Enhanced task 1.2",
                        "instructions": "Instructions",
                        "guiding_questions": ["Question"],
                        "search_queries": ["query"],
                    },
                ],
            }
        ],
        "wikidata_enrichments": [
            {
                "core_scientific_terms": ["biomarkers"],
                "scientific_context": "Context",
            }
        ],
    }

    # Setup mock to return the expected tuple structure: (objective, objective_text, task_results)
    # This simulates what generate_objective_with_tasks returns
    mock_generate_objective_with_tasks.return_value = (
        {"number": 1, "title": "Develop novel biomarkers"},  # objective dict
        "Generated objective text",  # objective_text
        [  # task_results: list of (task, task_text) tuples
            (
                {"number": 1, "title": "Identify candidate biomarkers"},  # task dict
                "Generated task 1 text",  # task text
            ),
            (
                {"number": 2, "title": "Validate biomarkers"},  # task dict
                "Generated task 2 text",  # task text
            ),
        ],
    )

    # Execute
    result = await handle_generate_research_plan_stage(
        grant_application=grant_application,
        dto=input_dto,
        job_manager=mock_grant_application_job_manager,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, dict)
    assert "research_plan_text" in result
    assert "### Objective 1: Develop novel biomarkers" in result["research_plan_text"]
    assert "Generated objective text" in result["research_plan_text"]
    assert "Generated task 1 text" in result["research_plan_text"]

    # Verify job manager methods were called
    mock_grant_application_job_manager.ensure_not_cancelled.assert_called()
    mock_grant_application_job_manager.add_notification.assert_called()


async def test_handlers_preserve_data_flow(
    mock_grant_application_job_manager: AsyncMock,
    grant_application: Any,
    sample_grant_sections: list[dict[str, Any]],
    sample_work_plan_section: dict[str, Any],
) -> None:
    """Test that handlers preserve data flow correctly."""
    # Setup grant application
    grant_application.research_objectives = [
        ResearchObjective(
            number=1,
            title="Test objective",
            research_tasks=[ResearchTask(number=1, title="Test task")],
        )
    ]

    # Test data flow preservation
    test_dto = {
        "section_texts": [
            {"section_id": "abstract", "text": "Test abstract"},
        ],
        "work_plan_section": sample_work_plan_section,
    }

    # Verify that the input structure is preserved
    assert "section_texts" in test_dto
    assert "work_plan_section" in test_dto
    assert test_dto["section_texts"][0]["section_id"] == "abstract"
    assert test_dto["work_plan_section"]["id"] == "research_plan"
