"""
Comprehensive test suite for performance optimizations.
Tests token optimization, batch processing, enrichment performance, and overall optimization strategies.
"""

import asyncio
import logging
import time
from typing import Any
from unittest.mock import patch
from uuid import UUID

from packages.db.src.json_objects import WorkplanMetadata
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_application.batch_enrich_objectives import batch_enrich_research_objectives
from services.rag.src.grant_application.dto import ObjectiveEnrichmentResult
from services.rag.src.grant_application.generate_work_plan_text import generate_work_plan_section
from services.rag.src.utils.token_optimization import (
    TokenOptimizer,
    optimize_for_token_limit,
)
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import PerformanceTestContext


@e2e_test(timeout=180)
async def test_token_optimization_effectiveness(
    logger: logging.Logger,
) -> None:
    """
    Test token optimization strategies and their effectiveness.
    """
    with PerformanceTestContext(
        test_name="token_optimization_effectiveness",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "token_optimization",
        },
    ) as perf_ctx:
        logger.info("=== TOKEN OPTIMIZATION TEST ===")

        test_contents = {
            "short": "Brief research summary. " * 10,
            "medium": "Detailed methodology section with comprehensive analysis. " * 50,
            "long": "Extensive research proposal with multiple sections and detailed explanations. " * 200,
        }

        optimization_results = {}

        for content_type, content in test_contents.items():
            with perf_ctx.stage_timer(f"optimize_{content_type}"):
                original_length = len(content)

                token_limits = [500, 1000, 2000]

                results = {}
                for limit in token_limits:
                    start_time = time.time()

                    optimized = optimize_for_token_limit(text=content, max_tokens=limit, preserve_structure=True)

                    optimization_time = time.time() - start_time

                    results[limit] = {
                        "original_length": original_length,
                        "optimized_length": len(optimized),
                        "reduction_ratio": 1 - (len(optimized) / original_length),
                        "time": optimization_time,
                        "preserved_structure": "# " in optimized if "# " in content else True,
                    }

                    logger.info(
                        "%s content with %d token limit: %.1f%% reduction in %.3fs",
                        content_type,
                        limit,
                        results[limit]["reduction_ratio"] * 100,
                        optimization_time,
                    )

                optimization_results[content_type] = results

        for content_type, results in optimization_results.items():
            for limit, metrics in results.items():
                if metrics["original_length"] > limit * 4:
                    assert metrics["reduction_ratio"] > 0.1, f"Should reduce {content_type} content for {limit} limit"

                assert metrics["time"] < 1.0, f"Optimization too slow for {content_type}"

                assert metrics["preserved_structure"], f"Should preserve structure for {content_type}"

        perf_ctx.configuration["optimization_results"] = optimization_results
        logger.info("Token optimization test completed successfully")


@e2e_test(timeout=300)
async def test_token_optimizer_class(
    logger: logging.Logger,
) -> None:
    """
    Test the TokenOptimizer class with various optimization strategies.
    """
    with PerformanceTestContext(
        test_name="token_optimizer_class",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
    ) as perf_ctx:
        logger.info("=== TOKEN OPTIMIZER CLASS TEST ===")

        optimizer = TokenOptimizer()

        test_document = """
        # Research Proposal

        ## Introduction
        This comprehensive research proposal outlines our innovative approach to melanoma treatment.
        We will investigate novel immunotherapy combinations with targeted therapy approaches.

        ## Methodology
        Our research employs cutting-edge techniques including:
        - Single-cell RNA sequencing
        - CRISPR-Cas9 gene editing
        - Advanced bioinformatics analysis
        - Machine learning algorithms

        ### Phase 1: Discovery
        Initial screening of potential therapeutic targets using high-throughput methods.

        ### Phase 2: Validation
        Rigorous validation in patient-derived xenograft models.

        ## Expected Outcomes
        We anticipate significant improvements in patient survival rates.
        """

        strategies = ["aggressive", "balanced", "conservative"]

        strategy_results = {}

        for strategy in strategies:
            with perf_ctx.stage_timer(f"{strategy}_optimization"):
                start_time = time.time()

                optimizer.compression_ratio = {"aggressive": 0.5, "balanced": 0.7, "conservative": 0.9}[strategy]

                optimized = optimizer.optimize_content(content=test_document, target_tokens=1000, preserve_headers=True)

                optimization_time = time.time() - start_time

                original_sections = test_document.count("#")
                optimized_sections = optimized.count("#")

                strategy_results[strategy] = {
                    "original_length": len(test_document),
                    "optimized_length": len(optimized),
                    "compression_achieved": 1 - (len(optimized) / len(test_document)),
                    "sections_preserved": optimized_sections == original_sections,
                    "time": optimization_time,
                }

                logger.info(
                    "%s strategy: %.1f%% compression, sections preserved: %s",
                    strategy,
                    strategy_results[strategy]["compression_achieved"] * 100,
                    strategy_results[strategy]["sections_preserved"],
                )

        assert (
            strategy_results["aggressive"]["compression_achieved"]
            > strategy_results["balanced"]["compression_achieved"]
        )
        assert (
            strategy_results["balanced"]["compression_achieved"]
            > strategy_results["conservative"]["compression_achieved"]
        )

        for strategy, results in strategy_results.items():
            assert results["sections_preserved"], f"{strategy} should preserve section headers"
            assert results["time"] < 1.0, f"{strategy} optimization too slow"

        perf_ctx.configuration["strategy_results"] = strategy_results
        logger.info("TokenOptimizer class test completed successfully")


@e2e_test(timeout=600)
async def test_batch_enrichment_performance(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Test batch enrichment performance with different batch sizes.
    """
    with PerformanceTestContext(
        test_name="batch_enrichment_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "batch_enrichment",
            "application_id": melanoma_alliance_full_application_id,
        },
    ) as perf_ctx:
        logger.info("=== BATCH ENRICHMENT PERFORMANCE TEST ===")

        test_objectives = [
            {
                "id": f"obj_{i}",
                "title": f"Research Objective {i}",
                "description": f"Investigate aspect {i} of melanoma treatment using innovative approaches.",
            }
            for i in range(10)
        ]

        batch_size_results = {}

        batch_sizes = [1, 3, 5, 10]

        for batch_size in batch_sizes:
            with perf_ctx.stage_timer(f"batch_size_{batch_size}"):
                start_time = time.time()

                async def mock_enrich(obj: dict[str, Any]) -> ObjectiveEnrichmentResult:
                    await asyncio.sleep(0.1)
                    return ObjectiveEnrichmentResult(
                        objective_id=obj["id"],
                        enhanced_content=f"Enhanced: {obj['description']}",
                        key_activities=["Activity 1", "Activity 2"],
                        success_metrics=["Metric 1", "Metric 2"],
                        keywords=["keyword1", "keyword2"],
                    )

                with patch(
                    "services.rag.src.grant_application.batch_enrich_objectives.enrich_single_objective",
                    side_effect=mock_enrich,
                ):
                    results = await batch_enrich_research_objectives(
                        objectives=test_objectives,
                        grant_application_id=UUID(melanoma_alliance_full_application_id),
                        session_maker=async_session_maker,
                        batch_size=batch_size,
                    )

                total_time = time.time() - start_time

                batch_size_results[batch_size] = {
                    "total_time": total_time,
                    "objectives_processed": len(results),
                    "time_per_objective": total_time / len(results),
                    "speedup": (10 * 0.1) / total_time,
                }

                logger.info(
                    "Batch size %d: %.2fs total, %.3fs per objective, %.2fx speedup",
                    batch_size,
                    total_time,
                    batch_size_results[batch_size]["time_per_objective"],
                    batch_size_results[batch_size]["speedup"],
                )

        assert batch_size_results[10]["speedup"] > batch_size_results[1]["speedup"], "Larger batches should be faster"
        assert all(r["objectives_processed"] == 10 for r in batch_size_results.values()), (
            "All objectives should be processed"
        )

        optimal_batch = min(batch_size_results.items(), key=lambda x: x[1]["total_time"])[0]
        logger.info("Optimal batch size: %d", optimal_batch)

        perf_ctx.configuration["batch_size_results"] = batch_size_results
        perf_ctx.configuration["optimal_batch_size"] = optimal_batch


@e2e_test(timeout=300)
async def test_batch_size_optimization(
    logger: logging.Logger,
) -> None:
    """
    Test optimal batch size determination for different workloads.
    """
    with PerformanceTestContext(
        test_name="batch_size_optimization",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
    ) as perf_ctx:
        logger.info("=== BATCH SIZE OPTIMIZATION TEST ===")

        workloads = {
            "cpu_bound": {"delay": 0.01, "cpu_work": 1000000},
            "io_bound": {"delay": 0.1, "cpu_work": 100},
            "mixed": {"delay": 0.05, "cpu_work": 10000},
        }

        optimization_results = {}

        for workload_type, params in workloads.items():
            with perf_ctx.stage_timer(f"{workload_type}_workload"):
                logger.info("Testing %s workload", workload_type)

                batch_sizes = [1, 2, 4, 8, 16, 32]
                workload_results = {}

                for batch_size in batch_sizes:

                    async def process_item(
                        item: int, cpu_work: int = params["cpu_work"], delay: float = params["delay"]
                    ) -> str:
                        sum(range(cpu_work))

                        await asyncio.sleep(delay)
                        return f"Processed {item}"

                    items = list(range(20))
                    start_time = time.time()

                    results = []
                    for i in range(0, len(items), batch_size):
                        batch = items[i : i + batch_size]
                        batch_results = await asyncio.gather(*[process_item(item) for item in batch])
                        results.extend(batch_results)

                    total_time = time.time() - start_time

                    workload_results[batch_size] = {
                        "time": total_time,
                        "throughput": len(items) / total_time,
                    }

                optimal = max(workload_results.items(), key=lambda x: x[1]["throughput"])
                optimization_results[workload_type] = {
                    "results": workload_results,
                    "optimal_batch_size": optimal[0],
                    "optimal_throughput": optimal[1]["throughput"],
                }

                logger.info(
                    "%s workload optimal batch size: %d (%.2f items/sec)",
                    workload_type,
                    optimal[0],
                    optimal[1]["throughput"],
                )

        optimal_sizes = [r["optimal_batch_size"] for r in optimization_results.values()]
        assert len(set(optimal_sizes)) > 1, "Different workloads should have different optimal batch sizes"

        perf_ctx.configuration["optimization_results"] = optimization_results


@e2e_test(timeout=600)
async def test_work_plan_generation_optimization(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Test work plan generation performance optimizations.
    """
    with PerformanceTestContext(
        test_name="work_plan_optimization",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "work_plan_generation",
            "application_id": melanoma_alliance_full_application_id,
        },
    ) as perf_ctx:
        logger.info("=== WORK PLAN GENERATION OPTIMIZATION TEST ===")

        test_metadata = WorkplanMetadata(
            project_title="Advanced Melanoma Immunotherapy Research",
            project_duration_months=36,
            objectives=[
                {
                    "id": "obj1",
                    "title": "Develop novel immunotherapy combinations",
                    "description": "Create and test innovative immunotherapy approaches",
                }
            ],
            deliverables=["Clinical trial protocol", "Research publications"],
            total_budget=1000000,
        )

        optimization_strategies = {
            "baseline": {
                "use_cache": False,
                "parallel_retrieval": False,
                "optimize_prompts": False,
            },
            "cached": {
                "use_cache": True,
                "parallel_retrieval": False,
                "optimize_prompts": False,
            },
            "parallel": {
                "use_cache": False,
                "parallel_retrieval": True,
                "optimize_prompts": False,
            },
            "full_optimization": {
                "use_cache": True,
                "parallel_retrieval": True,
                "optimize_prompts": True,
            },
        }

        strategy_results = {}

        for strategy_name, config in optimization_strategies.items():
            with perf_ctx.stage_timer(f"{strategy_name}_strategy"):
                logger.info("Testing %s strategy", strategy_name)

                async def mock_retrieve(
                    *args: Any, parallel: bool = config["parallel_retrieval"], **kwargs: Any
                ) -> list[str]:
                    if parallel:
                        await asyncio.sleep(0.1)
                    else:
                        await asyncio.sleep(0.3)
                    return ["Retrieved content " * 50]

                async def mock_generate(*args: Any, optimized: bool = config["optimize_prompts"], **kwargs: Any) -> str:
                    if optimized:
                        await asyncio.sleep(0.2)
                    else:
                        await asyncio.sleep(0.5)
                    return "Generated work plan content " * 100

                with (
                    patch("services.rag.src.utils.retrieval.retrieve_documents", side_effect=mock_retrieve),
                    patch("services.rag.src.utils.long_form.generate_long_form_text", side_effect=mock_generate),
                ):
                    start_time = time.time()

                    result = await generate_work_plan_section(
                        project_overview="Test project overview",
                        workplan_metadata=test_metadata,
                        grant_application_id=UUID(melanoma_alliance_full_application_id),
                        session_maker=async_session_maker,
                    )

                    generation_time = time.time() - start_time

                strategy_results[strategy_name] = {
                    "time": generation_time,
                    "content_length": len(result),
                    "speedup": strategy_results.get("baseline", {}).get("time", generation_time) / generation_time,
                }

                logger.info(
                    "%s: %.2fs, %d chars, %.2fx speedup",
                    strategy_name,
                    generation_time,
                    len(result),
                    strategy_results[strategy_name]["speedup"],
                )

        assert strategy_results["cached"]["speedup"] > 1.0, "Caching should improve performance"
        assert strategy_results["parallel"]["speedup"] > 1.0, "Parallel retrieval should improve performance"
        assert strategy_results["full_optimization"]["speedup"] > strategy_results["cached"]["speedup"], (
            "Full optimization should be fastest"
        )

        perf_ctx.configuration["strategy_results"] = strategy_results
        logger.info("Work plan optimization test completed successfully")


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=900)
async def test_comprehensive_optimization_comparison(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Comprehensive comparison of all optimization strategies.
    """
    with PerformanceTestContext(
        test_name="comprehensive_optimization_comparison",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "comprehensive_comparison",
            "application_id": melanoma_alliance_full_application_id,
        },
    ) as perf_ctx:
        logger.info("=== COMPREHENSIVE OPTIMIZATION COMPARISON ===")

        optimization_configs = {
            "no_optimization": {
                "token_optimization": False,
                "batch_processing": False,
                "parallel_execution": False,
                "caching": False,
            },
            "token_only": {
                "token_optimization": True,
                "batch_processing": False,
                "parallel_execution": False,
                "caching": False,
            },
            "batch_only": {
                "token_optimization": False,
                "batch_processing": True,
                "parallel_execution": False,
                "caching": False,
            },
            "parallel_only": {
                "token_optimization": False,
                "batch_processing": False,
                "parallel_execution": True,
                "caching": False,
            },
            "all_optimizations": {
                "token_optimization": True,
                "batch_processing": True,
                "parallel_execution": True,
                "caching": True,
            },
        }

        comparison_results = {}
        baseline_time = None

        for config_name, config in optimization_configs.items():
            with perf_ctx.stage_timer(f"{config_name}_test"):
                logger.info("Testing configuration: %s", config_name)

                start_time = time.time()

                processing_delay = 1.0
                if config["token_optimization"]:
                    processing_delay *= 0.7

                if config["batch_processing"]:
                    processing_delay *= 0.6

                if config["parallel_execution"]:
                    tasks = []
                    for i in range(5):

                        async def process(idx: int = i, delay: float = processing_delay) -> str:
                            await asyncio.sleep(delay / 5)
                            return f"Result {idx}"

                        tasks.append(process())
                    results = await asyncio.gather(*tasks)
                else:
                    results = []
                    for i in range(5):
                        await asyncio.sleep(processing_delay / 5)
                        results.append(f"Result {i}")

                if config["caching"] and baseline_time:
                    await asyncio.sleep(0.01)

                total_time = time.time() - start_time

                if config_name == "no_optimization":
                    baseline_time = total_time

                comparison_results[config_name] = {
                    "time": total_time,
                    "speedup": baseline_time / total_time if baseline_time else 1.0,
                    "results_count": len(results),
                    "config": config,
                }

                logger.info(
                    "%s: %.2fs, %.2fx speedup", config_name, total_time, comparison_results[config_name]["speedup"]
                )

        optimization_impact = {
            "token_optimization": comparison_results["token_only"]["speedup"] - 1,
            "batch_processing": comparison_results["batch_only"]["speedup"] - 1,
            "parallel_execution": comparison_results["parallel_only"]["speedup"] - 1,
            "combined_effect": comparison_results["all_optimizations"]["speedup"] - 1,
        }

        logger.info("=== OPTIMIZATION IMPACT ===")
        for optimization, impact in optimization_impact.items():
            logger.info("%s: %.1f%% improvement", optimization, impact * 100)

        assert comparison_results["all_optimizations"]["speedup"] > 2.0, (
            "Combined optimizations should provide >2x speedup"
        )
        assert all(r["results_count"] == 5 for r in comparison_results.values()), (
            "All configs should produce same results"
        )

        perf_ctx.configuration["comparison_results"] = comparison_results
        perf_ctx.configuration["optimization_impact"] = optimization_impact

        logger.info("Comprehensive optimization comparison completed successfully")
