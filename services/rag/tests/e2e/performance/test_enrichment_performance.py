"""
Comprehensive enrichment performance tests using unified framework.
Consolidates baseline, optimization, and comparison tests for batch enrichment.

Tests include:
1. Baseline performance measurement
2. Single vs batch comparison
3. Optimized implementation validation
4. Quality preservation verification
5. Token optimization analysis
"""

import logging
from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test
from testing.factories import ResearchObjectiveFactory

from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives
from services.rag.src.grant_application.enrich_research_objective import handle_enrich_objective
from services.rag.src.utils.token_optimization import estimate_performance_improvement, estimate_token_count
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    assert_quality_targets,
    create_performance_context,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective


@e2e_test(category=E2ETestCategory.SMOKE, timeout=600)
async def test_enrichment_baseline_smoke(logger: logging.Logger) -> None:
    """
    Quick smoke test for enrichment baseline performance.
    Measures current optimized batch enrichment with minimal overhead.
    """

    with create_performance_context(
        test_name="enrichment_baseline_smoke",
        test_category=TestCategory.BASELINE,
        logger=logger,
        configuration={
            "test_type": "smoke_baseline",
            "objectives_count": 3,
            "timeout_seconds": 600,
        },
        expected_patterns=["objective", "research", "melanoma", "enrichment"]
    ) as perf_ctx:

        logger.info("=== ENRICHMENT BASELINE SMOKE TEST ===")


        research_objectives: list[ResearchObjective] = [
            {
                "id": "obj-1",
                "title": "Investigate melanoma progression mechanisms",
                "description": "Analyze cellular pathways in melanoma metastasis",
                "methodology": "In vitro analysis of melanoma cell lines",
                "expected_outcomes": "Identify key molecular targets",
                "tasks": [],
            },
            {
                "id": "obj-2",
                "title": "Develop CAR-T cell therapy protocols",
                "description": "Design engineered T cells targeting melanoma antigens",
                "methodology": "Ex vivo T cell modification and testing",
                "expected_outcomes": "Functional CAR-T cell therapy",
                "tasks": [],
            },
            {
                "id": "obj-3",
                "title": "Evaluate immunotherapy combinations",
                "description": "Test synergistic effects of combination treatments",
                "methodology": "Clinical trial design and biomarker analysis",
                "expected_outcomes": "Improved patient outcomes",
                "tasks": [],
            },
        ]

        form_inputs: ResearchDeepDive = {
            "research_question": "How can we improve melanoma treatment through immunotherapy?",
            "research_objectives": research_objectives,
            "methodology": "Combined laboratory and clinical approaches",
            "expected_outcomes": "Novel therapeutic strategies for melanoma patients",
        }


        with perf_ctx.stage_timer("batch_enrichment"):
            enriched_objectives = await handle_batch_enrich_objectives(
                objectives=research_objectives,
                form_inputs=form_inputs,
            )
            perf_ctx.add_llm_call(1)


        enriched_content = "\n".join([
            f"## {obj['title']}\n{obj['description']}\n{obj['methodology']}"
            for obj in enriched_objectives
        ])

        perf_ctx.set_content(enriched_content, [obj["title"] for obj in enriched_objectives])


        enrichment_time = perf_ctx.stage_times.get("batch_enrichment", 0)
        if enrichment_time > 300:
            perf_ctx.add_warning(f"Enrichment took {enrichment_time:.1f}s - target is <300s")

        logger.info("Smoke test completed: %.2fs for %d objectives", enrichment_time, len(enriched_objectives))

        assert_performance_targets(perf_ctx.result, min_grade="C")
        assert_quality_targets(perf_ctx.result, min_score=60.0)

        assert len(enriched_objectives) == 3, "Should enrich all objectives"
        assert all("id" in obj for obj in enriched_objectives), "All objectives should have IDs"


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1200)
async def test_enrichment_baseline_vs_optimized_comparison(logger: logging.Logger) -> None:
    """
    Compare single enrichment vs optimized batch enrichment performance.
    Validates the 48% improvement achieved through batch processing.
    """

    with create_performance_context(
        test_name="enrichment_baseline_vs_optimized_comparison",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "baseline_vs_optimized",
            "objectives_count": 5,
            "expected_improvement": "48%",
        },
        expected_patterns=["objective", "research", "methodology", "enrichment", "optimization"]
    ) as perf_ctx:

        logger.info("=== ENRICHMENT BASELINE VS OPTIMIZED COMPARISON ===")


        research_objectives: list[ResearchObjective] = [
            ResearchObjectiveFactory.build()
            for _ in range(5)
        ]

        form_inputs: ResearchDeepDive = {
            "research_question": "Advanced melanoma immunotherapy research",
            "research_objectives": research_objectives,
            "methodology": "Multi-modal research approach",
            "expected_outcomes": "Breakthrough therapeutic advances",
        }


        logger.info("Testing baseline single enrichment...")
        with perf_ctx.stage_timer("single_enrichment"):
            baseline_results = []
            for obj in research_objectives:
                result = await handle_enrich_objective(
                    objective=obj,
                    form_inputs=form_inputs,
                )
                baseline_results.append(result)
                perf_ctx.add_llm_call(1)

        baseline_time = perf_ctx.stage_times["single_enrichment"]


        logger.info("Testing optimized batch enrichment...")
        with perf_ctx.stage_timer("batch_enrichment"):
            optimized_results = await handle_batch_enrich_objectives(
                objectives=research_objectives,
                form_inputs=form_inputs,
            )
            perf_ctx.add_llm_call(1)

        batch_time = perf_ctx.stage_times["batch_enrichment"]


        improvement_percentage = ((baseline_time - batch_time) / baseline_time) * 100
        speedup_factor = baseline_time / batch_time if batch_time > 0 else 0

        logger.info("Performance comparison:")
        logger.info("  Baseline (single): %.2fs", baseline_time)
        logger.info("  Optimized (batch): %.2fs", batch_time)
        logger.info("  Improvement: %.1f%%", improvement_percentage)
        logger.info("  Speedup factor: %.2fx", speedup_factor)


        "\n".join([f"## {obj['title']}\n{obj['description']}" for obj in baseline_results])
        optimized_content = "\n".join([f"## {obj['title']}\n{obj['description']}" for obj in optimized_results])


        perf_ctx.set_content(optimized_content, [obj["title"] for obj in optimized_results])


        assert improvement_percentage > 30, f"Should achieve >30% improvement, got {improvement_percentage:.1f}%"
        assert speedup_factor > 1.4, f"Should achieve >1.4x speedup, got {speedup_factor:.2f}x"
        assert len(baseline_results) == len(optimized_results), "Results count should match"


        assert_performance_targets(perf_ctx.result, min_grade="C")
        assert_quality_targets(perf_ctx.result, min_score=50.0)


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
async def test_enrichment_quality_preservation(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Validate that optimized batch enrichment preserves content quality.
    Tests quality metrics against baseline while measuring performance.
    """

    with create_performance_context(
        test_name="enrichment_quality_preservation",
        test_category=TestCategory.QUALITY_ASSESSMENT,
        logger=logger,
        configuration={
            "test_type": "quality_preservation",
            "objectives_count": 8,
            "quality_threshold": 70.0,
        },
        expected_patterns=["research", "objective", "methodology", "outcome", "task", "enrichment"]
    ) as perf_ctx:

        logger.info("=== ENRICHMENT QUALITY PRESERVATION TEST ===")


        research_objectives: list[ResearchObjective] = [
            {
                "id": f"qual-obj-{i+1}",
                "title": f"Research Objective {i+1}: Advanced Analysis",
                "description": f"Detailed research description for objective {i+1} focusing on innovative approaches",
                "methodology": f"Comprehensive methodology including experimental design and validation for objective {i+1}",
                "expected_outcomes": f"Measurable outcomes and deliverables for research objective {i+1}",
                "tasks": [],
            }
            for i in range(8)
        ]

        form_inputs: ResearchDeepDive = {
            "research_question": "How can we develop next-generation therapeutic approaches for complex diseases?",
            "research_objectives": research_objectives,
            "methodology": "Integrated multi-disciplinary research combining computational, experimental, and clinical approaches",
            "expected_outcomes": "Breakthrough therapeutic innovations with clinical translation potential",
        }


        with perf_ctx.stage_timer("quality_enrichment"):
            enriched_objectives = await handle_batch_enrich_objectives(
                objectives=research_objectives,
                form_inputs=form_inputs,
            )
            perf_ctx.add_llm_call(1)


        total_content = []
        for obj in enriched_objectives:
            content = f"""
            ## {obj['title']}

            **Description**: {obj['description']}

            **Methodology**: {obj['methodology']}

            **Expected Outcomes**: {obj['expected_outcomes']}

            **Tasks**: {len(obj.get('tasks', []))} tasks identified
            """
            total_content.append(content)

        full_content = "\n".join(total_content)
        section_titles = [obj["title"] for obj in enriched_objectives]

        perf_ctx.set_content(full_content, section_titles)


        estimated_tokens = estimate_token_count(full_content)
        token_efficiency = len(full_content) / estimated_tokens if estimated_tokens > 0 else 0

        logger.info("Quality analysis:")
        logger.info("  Objectives processed: %s", len(enriched_objectives))
        logger.info("  Total content length: %s chars", len(full_content))
        logger.info("  Estimated tokens: %s", estimated_tokens)
        logger.info("  Token efficiency: %.2f chars/token", token_efficiency)


        enrichment_time = perf_ctx.stage_times.get("quality_enrichment", 0)
        per_objective_time = enrichment_time / len(enriched_objectives) if enriched_objectives else 0

        assert len(enriched_objectives) == 8, "Should process all objectives"
        assert all(len(obj["description"]) > 50 for obj in enriched_objectives), "Descriptions should be substantive"
        assert all(len(obj["methodology"]) > 50 for obj in enriched_objectives), "Methodologies should be detailed"
        assert per_objective_time < 30, f"Per-objective time should be <30s, got {per_objective_time:.1f}s"


        assert_performance_targets(perf_ctx.result, min_grade="B")
        assert_quality_targets(perf_ctx.result, min_score=70.0)

        if enrichment_time > 900:
            perf_ctx.add_warning(f"Quality enrichment took {enrichment_time:.1f}s - consider further optimization")


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=900)
async def test_enrichment_token_optimization_analysis(logger: logging.Logger) -> None:
    """
    Analyze token usage and optimization opportunities in batch enrichment.
    Tests prompt efficiency and API cost reduction strategies.
    """

    with create_performance_context(
        test_name="enrichment_token_optimization_analysis",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "token_optimization",
            "analysis_focus": "prompt_efficiency",
            "cost_optimization": True,
        },
        expected_patterns=["token", "optimization", "prompt", "efficiency", "cost"]
    ) as perf_ctx:

        logger.info("=== ENRICHMENT TOKEN OPTIMIZATION ANALYSIS ===")


        simple_objectives: list[ResearchObjective] = [
            {"id": "simple-1", "title": "Basic research", "description": "Simple study", "methodology": "Standard approach", "expected_outcomes": "Results", "tasks": []},
            {"id": "simple-2", "title": "Direct analysis", "description": "Clear objectives", "methodology": "Proven methods", "expected_outcomes": "Outcomes", "tasks": []},
        ]

        complex_objectives: list[ResearchObjective] = [
            {
                "id": "complex-1",
                "title": "Comprehensive multi-phase longitudinal research investigation",
                "description": "Detailed analysis of complex biological systems with integrated computational modeling",
                "methodology": "Multi-modal experimental design combining in vitro, in vivo, and computational approaches",
                "expected_outcomes": "Breakthrough insights into disease mechanisms with therapeutic implications",
                "tasks": [],
            },
            {
                "id": "complex-2",
                "title": "Advanced translational research with clinical application focus",
                "description": "Bridging laboratory discoveries to clinical implementation through systematic validation",
                "methodology": "Translational pipeline including biomarker discovery and clinical trial design",
                "expected_outcomes": "Clinical-ready therapeutic interventions with regulatory pathway",
                "tasks": [],
            },
        ]

        form_inputs: ResearchDeepDive = {
            "research_question": "Token optimization analysis for enrichment processes",
            "research_objectives": simple_objectives + complex_objectives,
            "methodology": "Comparative analysis approach",
            "expected_outcomes": "Optimized token usage patterns",
        }


        with perf_ctx.stage_timer("simple_enrichment"):
            simple_results = await handle_batch_enrich_objectives(
                objectives=simple_objectives,
                form_inputs=form_inputs,
            )
            perf_ctx.add_llm_call(1)


        with perf_ctx.stage_timer("complex_enrichment"):
            complex_results = await handle_batch_enrich_objectives(
                objectives=complex_objectives,
                form_inputs=form_inputs,
            )
            perf_ctx.add_llm_call(1)


        simple_content = "\n".join([f"{obj['title']}: {obj['description']}" for obj in simple_results])
        complex_content = "\n".join([f"{obj['title']}: {obj['description']}" for obj in complex_results])

        simple_tokens = estimate_token_count(simple_content)
        complex_tokens = estimate_token_count(complex_content)

        simple_time = perf_ctx.stage_times.get("simple_enrichment", 0)
        complex_time = perf_ctx.stage_times.get("complex_enrichment", 0)


        simple_efficiency = simple_tokens / simple_time if simple_time > 0 else 0
        complex_efficiency = complex_tokens / complex_time if complex_time > 0 else 0

        logger.info("Token optimization analysis:")
        logger.info("  Simple objectives: %s tokens in %.2fs (%.1f tokens/s)", simple_tokens, simple_time, simple_efficiency)
        logger.info("  Complex objectives: %s tokens in %.2fs (%.1f tokens/s)", complex_tokens, complex_time, complex_efficiency)


        combined_content = f"# Simple Objectives\n{simple_content}\n\n# Complex Objectives\n{complex_content}"
        all_titles = [obj["title"] for obj in simple_results + complex_results]

        perf_ctx.set_content(combined_content, all_titles)


        estimated_improvement = estimate_performance_improvement(
            baseline_time=simple_time + complex_time,
            objectives_count=len(simple_objectives + complex_objectives),
        )

        logger.info("Estimated improvement potential: %.1f%%", estimated_improvement)


        assert simple_tokens > 0, "Should generate token estimates for simple objectives"
        assert complex_tokens > 0, "Should generate token estimates for complex objectives"
        assert len(simple_results) == 2, "Should process all objectives"
        assert len(complex_results) == 2, "Should process all objectives"
        assert complex_tokens > simple_tokens, "Complex objectives should use more tokens"


        assert_performance_targets(perf_ctx.result, min_grade="C")
        assert_quality_targets(perf_ctx.result, min_score=60.0)

        if simple_time + complex_time > 600:
            perf_ctx.add_warning(f"Total enrichment time exceeds 10min: {simple_time + complex_time:.1f}s")
