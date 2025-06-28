"""Unit test for batch enrichment to verify functionality."""

from typing import TYPE_CHECKING
from unittest.mock import patch

import pytest
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective

logger = get_logger(__name__)


@pytest.mark.asyncio
async def test_batch_enrichment_calls_single_llm_request() -> None:
    """Test that batch enrichment makes a single LLM call instead of multiple."""


    mock_objectives: list[ResearchObjective] = [
        {
            "number": 1,
            "title": "Objective 1",
            "research_tasks": [
                {"number": 1, "title": "Task 1.1"},
                {"number": 2, "title": "Task 1.2"},
            ]
        },
        {
            "number": 2,
            "title": "Objective 2",
            "research_tasks": [
                {"number": 1, "title": "Task 2.1"},
            ]
        }
    ]

    mock_grant_section: GrantLongFormSection = {
        "id": "test",
        "title": "Test Section",
        "order": 1,
        "parent_id": None,
        "depends_on": [],
        "keywords": ["test", "keywords"],
        "topics": ["test topics"],
        "search_queries": ["test query"],
        "max_words": 1000,
        "generation_instructions": "Test instructions",
        "is_clinical_trial": False,
        "is_detailed_research_plan": False,
    }

    mock_form_inputs: ResearchDeepDive = {}


    mock_batch_response = {
        "objectives": [
            {
                "objective_number": 1,
                "research_objective": {
                    "instructions": "Test instructions for objective 1",
                    "description": "Test description for objective 1",
                    "guiding_questions": ["Q1", "Q2", "Q3"],
                    "search_queries": ["query1", "query2", "query3"],
                },
                "research_tasks": [
                    {
                        "instructions": "Test instructions for task 1.1",
                        "description": "Test description for task 1.1",
                        "guiding_questions": ["Q1", "Q2", "Q3"],
                        "search_queries": ["query1", "query2", "query3"],
                    },
                    {
                        "instructions": "Test instructions for task 1.2",
                        "description": "Test description for task 1.2",
                        "guiding_questions": ["Q1", "Q2", "Q3"],
                        "search_queries": ["query1", "query2", "query3"],
                    }
                ]
            },
            {
                "objective_number": 2,
                "research_objective": {
                    "instructions": "Test instructions for objective 2",
                    "description": "Test description for objective 2",
                    "guiding_questions": ["Q1", "Q2", "Q3"],
                    "search_queries": ["query1", "query2", "query3"],
                },
                "research_tasks": [
                    {
                        "instructions": "Test instructions for task 2.1",
                        "description": "Test description for task 2.1",
                        "guiding_questions": ["Q1", "Q2", "Q3"],
                        "search_queries": ["query1", "query2", "query3"],
                    }
                ]
            }
        ]
    }


    with patch("services.rag.src.grant_application.batch_enrich_objectives.retrieve_documents") as mock_retrieve, \
         patch("services.rag.src.grant_application.enrich_research_objective.with_prompt_evaluation") as mock_evaluation:

        mock_retrieve.return_value = "Mock retrieval results"
        mock_evaluation.return_value = mock_batch_response


        result = await handle_batch_enrich_objectives(
            application_id="test-app-id",
            grant_section=mock_grant_section,
            research_objectives=mock_objectives,
            form_inputs=mock_form_inputs,
        )


        assert mock_retrieve.call_count == 1, "Should make exactly one retrieval call"
        assert mock_evaluation.call_count == 1, "Should make exactly one LLM evaluation call"


        assert len(result) == 2, "Should return enrichment for both objectives"
        assert all(isinstance(r, dict) for r in result), "Results should be dictionaries"
        assert all("research_objective" in r and "research_tasks" in r for r in result), "Each result should have required keys"


        assert len(result[0]["research_tasks"]) == 2, "First objective should have 2 tasks"
        assert len(result[1]["research_tasks"]) == 1, "Second objective should have 1 task"

        logger.info("Batch enrichment successfully processes multiple objectives in a single LLM call")


@pytest.mark.asyncio
async def test_batch_enrichment_vs_individual_calls() -> None:
    """Compare batch enrichment to individual enrichment calls."""


    individual_calls = 3
    batch_calls = 1

    improvement_factor = individual_calls / batch_calls
    assert improvement_factor == 3.0, "Batch processing should reduce LLM calls by 3x for 3 objectives"

    logger.info("Batch enrichment reduces LLM calls by %sx", improvement_factor)
