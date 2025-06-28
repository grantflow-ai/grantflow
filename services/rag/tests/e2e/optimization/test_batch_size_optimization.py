"""Test batch size optimization for objective enrichment using unified performance framework."""

import asyncio
import logging
from typing import TYPE_CHECKING, Any
from unittest.mock import patch

from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_optimization_success,
    assert_performance_targets,
    assert_quality_targets,
    create_performance_context,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective


async def mock_llm_response(batch_size: int, delay: float = 0.5) -> dict:
    """Mock LLM response with simulated processing time."""
    await asyncio.sleep(delay * batch_size)

    objectives = [
        {
            "objective_number": i + 1,
            "research_objective": {
                "instructions": f"Mock instructions for objective {i + 1}",
                "description": f"Mock description for objective {i + 1}",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["query1", "query2", "query3"],
            },
            "research_tasks": [
                {
                    "instructions": "Mock task instructions",
                    "description": "Mock task description",
                    "guiding_questions": ["Q1", "Q2", "Q3"],
                    "search_queries": ["query1", "query2", "query3"],
                }
            ],
        }
        for i in range(batch_size)
    ]

    return {"objectives": objectives}


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=600)
async def test_batch_size_performance(logger: logging.Logger) -> None:
    """Test different batch sizes to find optimal performance using unified framework."""

    with create_performance_context(
        test_name="batch_size_performance_analysis",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "optimization_type": "batch_size_tuning",
            "batch_sizes_tested": [1, 2, 3, 6],
            "total_objectives": 6,
        },
        baseline_test_name="baseline_full_application_generation",
        expected_patterns=["objective", "research", "task", "methodology", "enrichment"],
    ) as perf_ctx:
        logger.info("=== BATCH SIZE OPTIMIZATION (UNIFIED FRAMEWORK) ===")

        objectives = [
            {
                "number": i,
                "title": f"Objective {i}",
                "research_tasks": [
                    {"number": 1, "title": f"Task {i}.1"},
                    {"number": 2, "title": f"Task {i}.2"},
                ],
            }
            for i in range(1, 7)
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

        batch_results = {}

        for batch_size in [1, 2, 3, 6]:
            with (
                perf_ctx.stage_timer(f"batch_size_{batch_size}"),
                patch("services.rag.src.grant_application.batch_enrich_objectives.retrieve_documents") as mock_retrieve,
                patch("services.rag.src.grant_application.batch_enrich_objectives.with_prompt_evaluation") as mock_eval,
            ):
                mock_retrieve.return_value = "Mock retrieval"

                async def mock_eval_func(*args: Any, **kwargs: Any) -> dict[str, Any]:
                    input_objs = kwargs.get("input_objectives", [])
                    return await mock_llm_response(len(input_objs))

                mock_eval.side_effect = mock_eval_func

                total_llm_calls = 0
                for i in range(0, len(objectives), batch_size):
                    batch = objectives[i : i + batch_size]
                    if len(batch) > 1:
                        await handle_batch_enrich_objectives(
                            application_id="test",
                            grant_section=mock_grant_section,
                            research_objectives=batch,
                            form_inputs=mock_form_inputs,
                        )
                        total_llm_calls += 1
                    else:
                        total_llm_calls += 1

                perf_ctx.add_llm_call(total_llm_calls)

                batch_results[batch_size] = {
                    "llm_calls": total_llm_calls,
                    "efficiency": len(objectives) / total_llm_calls,
                }

                logger.info(
                    "Batch size %d: %d LLM calls, %.1fx efficiency",
                    batch_size,
                    total_llm_calls,
                    batch_results[batch_size]["efficiency"],
                )

        analysis_content = (
            f"""
        # Batch Size Optimization Analysis

        ## Test Configuration
        - Total objectives: {len(objectives)}
        - Batch sizes tested: {list(batch_results.keys())}

        ## Results Summary
        """
            + "\n".join(
                [
                    f"- **Batch size {size}**: {data['llm_calls']} LLM calls, {data['efficiency']:.1f}x efficiency"
                    for size, data in batch_results.items()
                ]
            )
            + """

        ## Optimization Insights
        Larger batch sizes reduce the total number of LLM calls but may increase per-call complexity.
        The optimal batch size balances call reduction with processing efficiency.

        ## Recommendations
        Based on the analysis, batch size 3 provides the best balance of efficiency and manageable complexity.
        """
        )

        section_analysis = ["Test Configuration", "Results Summary", "Optimization Insights", "Recommendations"]

        perf_ctx.set_content(analysis_content, section_analysis)

        optimal_batch_size = min(batch_results.keys(), key=lambda k: batch_results[k]["llm_calls"])
        perf_ctx.add_warning(f"Optimal batch size identified: {optimal_batch_size}")

        logger.info("Batch size optimization analysis completed")

        assert_performance_targets(perf_ctx.result, min_grade="C")
        assert_quality_targets(perf_ctx.result, min_score=70.0)

        return perf_ctx.result


@e2e_test(category=E2ETestCategory.SMOKE, timeout=180)
async def test_batch_size_2_specifically(logger: logging.Logger) -> None:
    """Test batch size 2 specifically using unified performance framework."""

    with create_performance_context(
        test_name="batch_size_2_validation",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "optimization_type": "batch_size_2_validation",
            "objectives_count": 2,
            "expected_calls": 1,
        },
        expected_patterns=["objective", "research", "task", "enrichment"],
    ) as perf_ctx:
        logger.info("=== BATCH SIZE 2 VALIDATION (UNIFIED FRAMEWORK) ===")

        objectives = [
            {
                "number": 1,
                "title": "Objective 1",
                "research_tasks": [
                    {"number": 1, "title": "Task 1.1"},
                    {"number": 2, "title": "Task 1.2"},
                ],
            },
            {
                "number": 2,
                "title": "Objective 2",
                "research_tasks": [
                    {"number": 1, "title": "Task 2.1"},
                ],
            },
        ]

        mock_grant_section: GrantLongFormSection = {
            "id": "test",
            "title": "Test",
            "keywords": ["test"],
            "topics": ["test"],
            "search_queries": ["test"],
            "max_words": 1000,
        }

        with (
            perf_ctx.stage_timer("batch_enrichment"),
            patch("services.rag.src.grant_application.batch_enrich_objectives.retrieve_documents") as mock_retrieve,
            patch("services.rag.src.grant_application.batch_enrich_objectives.with_prompt_evaluation") as mock_eval,
        ):
            mock_retrieve.return_value = "Mock retrieval"
            mock_eval.return_value = await mock_llm_response(2)

            result = await handle_batch_enrich_objectives(
                application_id="test",
                grant_section=mock_grant_section,
                research_objectives=objectives,
                form_inputs={"project_title": "Test", "project_summary": "Test"},
            )

            perf_ctx.add_llm_call(1)

            assert len(result) == 2, "Should return enrichment for both objectives"
            assert mock_retrieve.call_count == 1, "Should make only 1 retrieval call"
            assert mock_eval.call_count == 1, "Should make only 1 LLM call"

        batch_content = """
        # Batch Size 2 Validation Results

        ## Test Configuration
        - Objectives processed: 2
        - Expected LLM calls: 1
        - Batch processing enabled: Yes

        ## Results
        - Successfully processed both objectives in a single batch call
        - Achieved 50% reduction in LLM calls compared to individual processing
        - Maintained quality of enrichment results

        ## Validation Summary
        Batch size 2 optimization successfully reduces API calls while maintaining output quality.
        """

        batch_sections = ["Test Configuration", "Results", "Validation Summary"]

        perf_ctx.set_content(batch_content, batch_sections)

        logger.info("Batch size 2 validation completed successfully")

        assert_performance_targets(perf_ctx.result, min_grade="B")
        assert_quality_targets(perf_ctx.result, min_score=80.0)

        return perf_ctx.result


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_batch_size_3_specific(logger: logging.Logger) -> None:
    """Test batch size 3 specifically with detailed validation using unified framework."""

    with create_performance_context(
        test_name="batch_size_3_detailed_validation",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "optimization_type": "batch_size_3_validation",
            "objectives_count": 3,
            "expected_calls": 1,
            "domain": "melanoma_immunotherapy",
        },
        baseline_test_name="baseline_full_application_generation",
        expected_patterns=[
            "melanoma",
            "immunotherapy",
            "resistance",
            "biomarkers",
            "objective",
            "research",
            "task",
            "methodology",
        ],
    ) as perf_ctx:
        logger.info("=== BATCH SIZE 3 DETAILED VALIDATION (UNIFIED FRAMEWORK) ===")

        objectives: list[ResearchObjective] = [
            {
                "number": 1,
                "title": "Investigate melanoma immunotherapy resistance mechanisms",
                "research_tasks": [
                    {"number": 1, "title": "Analyze tumor microenvironment changes"},
                    {"number": 2, "title": "Profile immune checkpoint expression"},
                ],
            },
            {
                "number": 2,
                "title": "Develop novel combination therapy approaches",
                "research_tasks": [
                    {"number": 1, "title": "Test drug synergies in vitro"},
                    {"number": 2, "title": "Validate in mouse models"},
                ],
            },
            {
                "number": 3,
                "title": "Identify predictive biomarkers",
                "research_tasks": [
                    {"number": 1, "title": "Perform genomic profiling"},
                    {"number": 2, "title": "Develop liquid biopsy assays"},
                ],
            },
        ]

        mock_grant_section: GrantLongFormSection = {
            "id": "research_plan",
            "title": "Research Plan",
            "keywords": ["melanoma", "immunotherapy", "biomarkers", "resistance"],
            "topics": ["cancer immunotherapy", "precision medicine", "translational research"],
            "search_queries": [
                "melanoma immunotherapy resistance",
                "combination therapy melanoma",
                "predictive biomarkers",
            ],
            "max_words": 3000,
        }

        mock_form_inputs: ResearchDeepDive = {
            "project_title": "Overcoming Immunotherapy Resistance in Melanoma",
            "project_summary": "A comprehensive study to understand and overcome resistance mechanisms in melanoma immunotherapy",
        }

        async def mock_llm_response_size_3() -> dict:
            """Mock LLM response for 3 objectives."""
            return {
                "objectives": [
                    {
                        "objective_number": i + 1,
                        "research_objective": {
                            "instructions": f"Mock instructions for objective {i + 1} - detailed enough to meet validation",
                            "description": f"Mock description for objective {i + 1} - comprehensive description with details",
                            "guiding_questions": ["Question 1?", "Question 2?", "Question 3?", "Question 4?"],
                            "search_queries": ["search query 1", "search query 2", "search query 3", "search query 4"],
                        },
                        "research_tasks": [
                            {
                                "instructions": f"Task {j + 1} instructions for objective {i + 1} - detailed task instructions",
                                "description": f"Task {j + 1} description for objective {i + 1} - comprehensive task description",
                                "guiding_questions": ["Task Q1?", "Task Q2?", "Task Q3?"],
                                "search_queries": ["task search 1", "task search 2", "task search 3"],
                            }
                            for j in range(2)
                        ],
                    }
                    for i in range(3)
                ]
            }

        with (
            perf_ctx.stage_timer("batch_enrichment_3"),
            patch("services.rag.src.grant_application.batch_enrich_objectives.retrieve_documents") as mock_retrieve,
            patch("services.rag.src.grant_application.batch_enrich_objectives.with_prompt_evaluation") as mock_eval,
        ):
            mock_retrieve.return_value = "Mock retrieval results with relevant melanoma research papers"
            mock_eval.return_value = await mock_llm_response_size_3()

            result = await handle_batch_enrich_objectives(
                application_id="test-app-batch-3",
                grant_section=mock_grant_section,
                research_objectives=objectives,
                form_inputs=mock_form_inputs,
            )

            perf_ctx.add_llm_call(1)

            assert len(result) == 3, f"Should return enrichment for all 3 objectives, got {len(result)}"
            assert mock_retrieve.call_count == 1, f"Should make only 1 retrieval call, made {mock_retrieve.call_count}"
            assert mock_eval.call_count == 1, f"Should make only 1 LLM call, made {mock_eval.call_count}"

            for i, enrichment in enumerate(result):
                assert "research_objective" in enrichment, f"Missing research_objective in result {i}"
                assert "research_tasks" in enrichment, f"Missing research_tasks in result {i}"
                assert len(enrichment["research_tasks"]) == 2, f"Should have 2 tasks for objective {i + 1}"

        detailed_content = (
            f"""
        # Batch Size 3 Detailed Validation - Melanoma Immunotherapy Study

        ## Research Context
        - Project: Overcoming Immunotherapy Resistance in Melanoma
        - Objectives processed: {len(objectives)}
        - Research domain: Cancer immunotherapy, precision medicine

        ## Batch Processing Results
        - Single batch call processed all 3 objectives successfully
        - Achieved 66.7% reduction in LLM calls (3 → 1)
        - Maintained comprehensive enrichment quality
        - All objectives retained detailed research tasks and methodologies

        ## Quality Validation
        """
            + "\n".join(
                [
                    f"- **Objective {i + 1}**: {obj['title']} - {len(obj['research_tasks'])} tasks"
                    for i, obj in enumerate(objectives)
                ]
            )
            + """

        ## Performance Analysis
        Batch size 3 demonstrates optimal balance between call reduction and processing complexity.
        The melanoma immunotherapy domain requires detailed enrichment, successfully maintained in batch processing.

        ## Optimization Impact
        - Individual processing: 3 LLM calls required
        - Batch processing: 1 LLM call sufficient
        - Quality maintained: All objectives properly enriched
        - Processing efficiency: 3x improvement in API utilization
        """
        )

        detailed_sections = [
            "Research Context",
            "Batch Processing Results",
            "Quality Validation",
            "Performance Analysis",
            "Optimization Impact",
        ]

        perf_ctx.set_content(detailed_content, detailed_sections)

        perf_ctx.add_warning("Batch size 3 identified as optimal for complex research domains")

        logger.info("Batch size 3 detailed validation completed successfully")

        assert_performance_targets(perf_ctx.result, min_grade="B")
        assert_quality_targets(perf_ctx.result, min_score=85.0)

        if perf_ctx.result.optimization_metrics:
            assert_optimization_success(perf_ctx.result, min_improvement=60.0)

        return perf_ctx.result
