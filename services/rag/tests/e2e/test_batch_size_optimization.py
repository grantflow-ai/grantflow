"""Test to find optimal batch size for objective enrichment."""

import logging
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective

from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives
from services.rag.src.grant_application.enrich_research_objective import handle_enrich_objective


async def mock_llm_response(batch_size: int, delay: float = 0.5) -> dict:
    """Mock LLM response with simulated processing time."""
    await asyncio.sleep(delay * batch_size)  # Simulate processing time proportional to batch size
    
    objectives = []
    for i in range(batch_size):
        objectives.append({
            "objective_number": i + 1,
            "research_objective": {
                "instructions": f"Mock instructions for objective {i+1}",
                "description": f"Mock description for objective {i+1}",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["query1", "query2", "query3"],
            },
            "research_tasks": [
                {
                    "instructions": f"Mock task instructions",
                    "description": f"Mock task description",
                    "guiding_questions": ["Q1", "Q2", "Q3"],
                    "search_queries": ["query1", "query2", "query3"],
                }
            ]
        })
    
    return {"objectives": objectives}


@pytest.mark.asyncio
async def test_batch_size_performance():
    """Test different batch sizes to find optimal performance."""
    
    # Test data
    objectives = [
        {
            "number": i,
            "title": f"Objective {i}",
            "research_tasks": [
                {"number": 1, "title": f"Task {i}.1"},
                {"number": 2, "title": f"Task {i}.2"},
            ]
        }
        for i in range(1, 7)  # 6 objectives total
    ]
    
    mock_grant_section: GrantLongFormSection = {
        "id": "test",
        "title": "Test Section",
        "keywords": ["test"],
        "topics": ["test"],
        "search_queries": ["test"],
        "max_words": 1000,
    }
    
    mock_form_inputs: ResearchDeepDive = {
        "project_title": "Test",
        "project_summary": "Test",
    }
    
    results = {}
    
    # Test different batch sizes
    for batch_size in [1, 2, 3, 6]:
        with patch("services.rag.src.grant_application.batch_enrich_objectives.retrieve_documents") as mock_retrieve, \
             patch("services.rag.src.grant_application.batch_enrich_objectives.with_prompt_evaluation") as mock_eval:
            
            mock_retrieve.return_value = "Mock retrieval"
            
            # Mock responses based on batch size
            async def mock_eval_func(*args, **kwargs):
                input_objs = kwargs.get('input_objectives', [])
                return await mock_llm_response(len(input_objs))
            
            mock_eval.side_effect = mock_eval_func
            
            start_time = time.time()
            
            # Simulate processing in batches
            total_llm_calls = 0
            for i in range(0, len(objectives), batch_size):
                batch = objectives[i:i + batch_size]
                if len(batch) > 1:
                    # Batch call
                    await handle_batch_enrich_objectives(
                        application_id="test",
                        grant_section=mock_grant_section,
                        research_objectives=batch,
                        form_inputs=mock_form_inputs,
                    )
                    total_llm_calls += 1
                else:
                    # Individual call
                    total_llm_calls += 1
            
            end_time = time.time()
            duration = end_time - start_time
            
            results[batch_size] = {
                "duration": duration,
                "llm_calls": total_llm_calls,
                "efficiency": len(objectives) / total_llm_calls,
            }
            
            logging.info(
                "Batch size %d: %.2fs, %d LLM calls, %.1fx efficiency",
                batch_size, duration, total_llm_calls, results[batch_size]["efficiency"]
            )
    
    # Analyze results
    print("\n=== Batch Size Performance Analysis ===")
    print(f"Total objectives: {len(objectives)}")
    print("\nResults:")
    for batch_size, metrics in results.items():
        print(f"  Batch size {batch_size}:")
        print(f"    - Duration: {metrics['duration']:.2f}s")
        print(f"    - LLM calls: {metrics['llm_calls']}")
        print(f"    - Efficiency: {metrics['efficiency']:.1f}x")
    
    # Find optimal batch size
    optimal_batch = min(results.keys(), key=lambda k: results[k]["duration"])
    print(f"\n✅ Optimal batch size: {optimal_batch}")
    print(f"   Best performance: {results[optimal_batch]['duration']:.2f}s")
    print(f"   LLM call reduction: {results[optimal_batch]['efficiency']:.1f}x")
    
    return results


@pytest.mark.asyncio
async def test_batch_size_2_specifically():
    """Test batch size 2 specifically for the optimization."""
    
    # Create exactly 2 objectives
    objectives = [
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
        "title": "Test",
        "keywords": ["test"],
        "topics": ["test"],
        "search_queries": ["test"],
        "max_words": 1000,
    }
    
    with patch("services.rag.src.grant_application.batch_enrich_objectives.retrieve_documents") as mock_retrieve, \
         patch("services.rag.src.grant_application.batch_enrich_objectives.with_prompt_evaluation") as mock_eval:
        
        mock_retrieve.return_value = "Mock retrieval"
        mock_eval.return_value = await mock_llm_response(2)
        
        result = await handle_batch_enrich_objectives(
            application_id="test",
            grant_section=mock_grant_section,
            research_objectives=objectives,
            form_inputs={"project_title": "Test", "project_summary": "Test"},
        )
        
        # Verify we got results for both objectives
        assert len(result) == 2, "Should return enrichment for both objectives"
        assert mock_retrieve.call_count == 1, "Should make only 1 retrieval call"
        assert mock_eval.call_count == 1, "Should make only 1 LLM call"
        
        print("✅ Batch size 2 works correctly!")
        print(f"   - Processed {len(objectives)} objectives in 1 LLM call")
        print(f"   - Efficiency: {len(objectives)}x improvement over individual calls")


# Add missing import
import asyncio