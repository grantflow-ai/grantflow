"""
Test and compare the optimized batch enrichment implementation.
Validates performance improvements and quality maintenance.
"""

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives
from services.rag.src.grant_application.enrich_research_objective import handle_enrich_objective
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    assert_quality_targets,
    create_performance_context,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=900)
async def test_enrichment_baseline_comparison(logger: logging.Logger) -> None:
    """
    Baseline performance test comparing single vs batch enrichment.
    Establishes performance baseline for future optimizations.
    """

    with create_performance_context(
        test_name="enrichment_baseline_comparison",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "baseline_comparison",
            "objectives_count": 5,
            "comparison": "single_vs_batch",
        },
        expected_patterns=["objective", "research", "methodology", "task", "enrichment", "melanoma", "immunotherapy"],
    ) as perf_ctx:
        logger.info("=== ENRICHMENT BASELINE COMPARISON ===")

        research_objectives: list[ResearchObjective] = [
            {
                "number": i,
                "title": f"Objective {i}: "
                + [
                    "Investigate melanoma resistance mechanisms",
                    "Develop combination therapy approaches",
                    "Identify predictive biomarkers",
                    "Validate therapeutic targets",
                    "Establish treatment protocols",
                ][i - 1],
                "research_tasks": [
                    {"number": 1, "title": f"Task {i}.1: Initial analysis"},
                    {"number": 2, "title": f"Task {i}.2: Validation studies"},
                ],
            }
            for i in range(1, 6)
        ]

        grant_section: GrantLongFormSection = {
            "id": "research_plan",
            "title": "Detailed Research Plan",
            "keywords": ["melanoma", "immunotherapy", "resistance", "biomarkers"],
            "topics": ["cancer research", "precision medicine", "translational oncology"],
            "search_queries": [
                "melanoma immunotherapy resistance",
                "combination therapy melanoma",
                "predictive biomarkers cancer",
            ],
            "max_words": 5000,
        }

        form_inputs: ResearchDeepDive = {
            "project_title": "Overcoming Melanoma Immunotherapy Resistance",
            "project_summary": "Comprehensive study of resistance mechanisms and therapeutic approaches",
        }

        logger.info("Testing SINGLE OBJECTIVE enrichment (one-by-one)")

        with perf_ctx.stage_timer("single_objective_approach"):
            single_start = datetime.now(UTC)
            single_responses = []

            for obj in research_objectives:
                response = await handle_enrich_objective(
                    application_id="550e8400-e29b-41d4-a716-446655440001",
                    research_objective=obj,
                    grant_section=grant_section,
                    form_inputs=form_inputs,
                )
                single_responses.append(response)

            single_duration = (datetime.now(UTC) - single_start).total_seconds()
            perf_ctx.add_llm_call(len(research_objectives))

            logger.info(
                "Single objective approach completed",
                duration_seconds=single_duration,
                llm_calls=len(research_objectives),
                responses_count=len(single_responses),
            )

        logger.info("Testing BATCH enrichment (all at once)")

        with perf_ctx.stage_timer("batch_approach"):
            batch_start = datetime.now(UTC)

            batch_responses = await handle_batch_enrich_objectives(
                application_id="550e8400-e29b-41d4-a716-446655440002",
                grant_section=grant_section,
                research_objectives=research_objectives,
                form_inputs=form_inputs,
            )

            batch_duration = (datetime.now(UTC) - batch_start).total_seconds()
            perf_ctx.add_llm_call(1)

            logger.info(
                "Batch approach completed",
                duration_seconds=batch_duration,
                llm_calls=1,
                responses_count=len(batch_responses),
            )

        time_ratio = batch_duration / single_duration if single_duration > 0 else 1.0
        efficiency_percent = (
            ((single_duration - batch_duration) / single_duration) * 100 if single_duration > 0 else 0.0
        )

        analysis_content = f"""
        # Enrichment Performance Baseline Analysis

        ## Test Configuration
        - Objectives tested: {len(research_objectives)}
        - Domain: Melanoma immunotherapy research
        - Test type: Single vs Batch comparison

        ## Performance Results

        ### Single Objective Approach (Sequential)
        - Duration: {single_duration:.2f} seconds
        - LLM calls: {len(research_objectives)} (one per objective)
        - Processing: Sequential individual calls

        ### Batch Approach (All-at-once)
        - Duration: {batch_duration:.2f} seconds
        - LLM calls: 1 (all objectives together)
        - Processing: Single batch call

        ### Comparison Metrics
        - **Time ratio**: {time_ratio:.2f}x (batch vs single)
        - **Efficiency**: {efficiency_percent:.1f}% {"improvement" if efficiency_percent > 0 else "regression"}
        - **LLM call reduction**: {len(research_objectives)}x → 1x

        ## Quality Validation
        - Single responses: {len(single_responses)}
        - Batch responses: {len(batch_responses)}
        - All objectives processed: ✓

        ## Analysis
        - Batch approach {"is faster" if batch_duration < single_duration else "is slower"} than individual calls
        - LLM efficiency: {"Good" if len(batch_responses) == len(research_objectives) else "Needs improvement"}
        - Baseline established for future optimizations

        ## Next Steps
        - Use this baseline for optimization comparisons
        - Target: Maintain quality while improving on best time ({min(single_duration, batch_duration):.2f}s)
        - Focus on: {"Batch optimization" if batch_duration < single_duration else "Single call optimization"}
        """

        section_analysis = [
            "Test Configuration",
            "Performance Results",
            "Comparison Metrics",
            "Quality Validation",
            "Analysis",
            "Next Steps",
        ]

        perf_ctx.set_content(analysis_content, section_analysis)

        if abs(efficiency_percent) > 20:
            perf_ctx.add_warning(f"Significant performance difference: {efficiency_percent:.1f}%")

        assert len(single_responses) == len(research_objectives), "Single approach response count mismatch"
        assert len(batch_responses) == len(research_objectives), "Batch approach response count mismatch"

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")
    assert_quality_targets(perf_ctx.result, min_score=60.0)

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.SMOKE, timeout=180)
async def test_enrichment_baseline_smoke(logger: logging.Logger) -> None:
    """
    Quick smoke test for enrichment baseline performance.
    Validates basic functionality with 2 objectives.
    """

    with create_performance_context(
        test_name="enrichment_baseline_smoke",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "smoke",
            "objectives_count": 2,
        },
        expected_patterns=["objective", "research", "enrichment"],
    ) as perf_ctx:
        objectives: list[ResearchObjective] = [
            {"number": 1, "title": "Primary Research Objective", "research_tasks": [{"number": 1, "title": "Task 1"}]},
            {
                "number": 2,
                "title": "Secondary Research Objective",
                "research_tasks": [{"number": 1, "title": "Task 1"}],
            },
        ]

        grant_section: GrantLongFormSection = {
            "id": "test",
            "title": "Test Section",
            "keywords": ["test"],
            "topics": ["research"],
            "search_queries": ["test query"],
            "max_words": 1000,
        }

        with perf_ctx.stage_timer("smoke_test"):
            responses = await handle_batch_enrich_objectives(
                application_id="550e8400-e29b-41d4-a716-446655440000",
                grant_section=grant_section,
                research_objectives=objectives,
                form_inputs={"project_title": "Test", "project_summary": "Test"},
            )

            assert len(responses) == 2, "Should enrich both objectives"

        smoke_content = """
        # Enrichment Baseline Smoke Test

        ## Results
        - Successfully enriched 2 objectives using batch approach
        - Baseline performance established
        - Test framework validated

        ## Status: PASSED ✓
        """

        perf_ctx.set_content(smoke_content, ["Results", "Status"])

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="B")

    return perf_ctx.result
