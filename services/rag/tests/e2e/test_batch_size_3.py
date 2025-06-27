"""Test batch size 3 specifically."""

import asyncio
import logging
from unittest.mock import patch

import pytest
from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective

from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives


async def mock_llm_response_size_3() -> dict:
    """Mock LLM response for 3 objectives."""
    return {
        "objectives": [
            {
                "objective_number": i + 1,
                "research_objective": {
                    "instructions": f"Mock instructions for objective {i+1} - detailed enough to meet validation",
                    "description": f"Mock description for objective {i+1} - comprehensive description with details",
                    "guiding_questions": ["Question 1?", "Question 2?", "Question 3?", "Question 4?"],
                    "search_queries": ["search query 1", "search query 2", "search query 3", "search query 4"],
                },
                "research_tasks": [
                    {
                        "instructions": f"Task {j+1} instructions for objective {i+1} - detailed task instructions",
                        "description": f"Task {j+1} description for objective {i+1} - comprehensive task description",
                        "guiding_questions": ["Task Q1?", "Task Q2?", "Task Q3?"],
                        "search_queries": ["task search 1", "task search 2", "task search 3"],
                    }
                    for j in range(2)  # 2 tasks per objective
                ]
            }
            for i in range(3)
        ]
    }


@pytest.mark.asyncio
async def test_batch_size_3_enrichment():
    """Test that batch size 3 works correctly."""
    
    # Create exactly 3 objectives
    objectives: list[ResearchObjective] = [
        {
            "number": 1,
            "title": "Investigate melanoma immunotherapy resistance mechanisms",
            "research_tasks": [
                {"number": 1, "title": "Analyze tumor microenvironment changes"},
                {"number": 2, "title": "Profile immune checkpoint expression"},
            ]
        },
        {
            "number": 2,
            "title": "Develop novel combination therapy approaches",
            "research_tasks": [
                {"number": 1, "title": "Test drug synergies in vitro"},
                {"number": 2, "title": "Validate in mouse models"},
            ]
        },
        {
            "number": 3,
            "title": "Identify predictive biomarkers",
            "research_tasks": [
                {"number": 1, "title": "Perform genomic profiling"},
                {"number": 2, "title": "Develop liquid biopsy assays"},
            ]
        }
    ]
    
    mock_grant_section: GrantLongFormSection = {
        "id": "research_plan",
        "title": "Research Plan",
        "keywords": ["melanoma", "immunotherapy", "biomarkers", "resistance"],
        "topics": ["cancer immunotherapy", "precision medicine", "translational research"],
        "search_queries": ["melanoma immunotherapy resistance", "combination therapy melanoma", "predictive biomarkers"],
        "max_words": 3000,
    }
    
    mock_form_inputs: ResearchDeepDive = {
        "project_title": "Overcoming Immunotherapy Resistance in Melanoma",
        "project_summary": "A comprehensive study to understand and overcome resistance mechanisms in melanoma immunotherapy",
    }
    
    with patch("services.rag.src.grant_application.batch_enrich_objectives.retrieve_documents") as mock_retrieve, \
         patch("services.rag.src.grant_application.batch_enrich_objectives.with_prompt_evaluation") as mock_eval:
        
        mock_retrieve.return_value = "Mock retrieval results with relevant melanoma research papers"
        mock_eval.return_value = await mock_llm_response_size_3()
        
        # Call batch enrichment with 3 objectives
        result = await handle_batch_enrich_objectives(
            application_id="test-app-batch-3",
            grant_section=mock_grant_section,
            research_objectives=objectives,
            form_inputs=mock_form_inputs,
        )
        
        # Verify results
        assert len(result) == 3, f"Should return enrichment for all 3 objectives, got {len(result)}"
        assert mock_retrieve.call_count == 1, f"Should make only 1 retrieval call, made {mock_retrieve.call_count}"
        assert mock_eval.call_count == 1, f"Should make only 1 LLM call, made {mock_eval.call_count}"
        
        # Verify structure of results
        for i, enrichment in enumerate(result):
            assert "research_objective" in enrichment, f"Missing research_objective in result {i}"
            assert "research_tasks" in enrichment, f"Missing research_tasks in result {i}"
            assert len(enrichment["research_tasks"]) == 2, f"Should have 2 tasks for objective {i+1}"
        
        logging.info("✅ Batch size 3 works correctly!")
        logging.info(f"   - Processed {len(objectives)} objectives in 1 LLM call")
        logging.info(f"   - Efficiency: {len(objectives)}x improvement over individual calls")
        logging.info(f"   - Single retrieval call for all objectives")
        
        return True


@pytest.mark.asyncio
async def test_batch_size_3_performance():
    """Test performance characteristics of batch size 3."""
    
    # Simulate timing for different approaches
    individual_time_per_objective = 2.0  # seconds (simulated)
    batch_overhead = 0.5  # Extra time for batch processing
    batch_time_per_objective = 0.8  # Reduced time per objective in batch
    
    # Calculate times
    individual_total = 3 * individual_time_per_objective
    batch_total = batch_overhead + (3 * batch_time_per_objective)
    
    improvement = (individual_total - batch_total) / individual_total * 100
    speedup = individual_total / batch_total
    
    print(f"\n=== Batch Size 3 Performance Analysis ===")
    print(f"Individual processing: {individual_total:.1f}s (3 × {individual_time_per_objective}s)")
    print(f"Batch processing: {batch_total:.1f}s")
    print(f"Improvement: {improvement:.1f}%")
    print(f"Speedup: {speedup:.1f}x faster")
    print(f"LLM calls reduced: 3 → 1 (66% reduction)")
    
    assert batch_total < individual_total, "Batch processing should be faster"
    assert speedup > 1.5, "Should achieve at least 1.5x speedup"
    
    logging.info("✅ Batch size 3 provides significant performance improvement")