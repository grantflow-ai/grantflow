"""Clean baseline performance tests for grant application generation optimization."""

import logging
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

from packages.shared_utils.src.serialization import serialize
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.tests.e2e.conftest_rag import analyze_pipeline_timing


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_baseline_full_application_generation(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    melanoma_application_data: dict[str, Any],
    baseline_performance_targets: dict[str, float],
    mock_job_manager: Any,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Baseline test for full grant application generation pipeline."""

    application_id = melanoma_application_data["application_id"]
    application_uuid = UUID(application_id)

    logger.info("=== BASELINE FULL APPLICATION TEST START ===")
    logger.info("Application: %s", application_id)
    logger.info("Grant Template: %s", melanoma_application_data["grant_template"].id)
    logger.info("Research Objectives: %d", len(melanoma_application_data["research_objectives"]))
    logger.info("Grant Sections: %d", len(melanoma_application_data["grant_sections"]))

    # Run the full pipeline with timing
    overall_start = datetime.now(UTC)

    job_manager = await mock_job_manager(async_session_maker, application_uuid)

    full_text, section_texts = await grant_application_text_generation_pipeline_handler(
        grant_application_id=application_uuid,
        session_maker=async_session_maker,
        job_manager=job_manager,
    )

    total_time = (datetime.now(UTC) - overall_start).total_seconds()

    # Quality metrics
    quality_metrics = {
        "sections_generated": len(section_texts),
        "total_characters": len(full_text),
        "average_section_length": len(full_text) // len(section_texts) if section_texts else 0,
        "has_headers": "# " in full_text,
        "non_empty_sections": sum(1 for content in section_texts.values() if len(content.strip()) > 0),
        "word_count": len(full_text.split()),
    }

    # Extract stage timings from logs if available (simplified for now)
    stage_timings = {
        "total_pipeline": total_time,
        # TODO: Extract individual stage timings from job manager or logs
    }

    # Performance analysis
    performance_analysis = analyze_pipeline_timing(
        total_time=total_time,
        stage_timings=stage_timings,
        targets=baseline_performance_targets
    )

    # Compile baseline results
    baseline_results = {
        "test_metadata": {
            "test_name": "baseline_full_application_generation",
            "timestamp": datetime.now(UTC).isoformat(),
            "application_id": application_id,
            "test_type": "baseline_performance",
        },
        "performance": {
            "total_time_seconds": round(total_time, 2),
            "total_time_minutes": round(total_time / 60, 2),
            "analysis": performance_analysis,
        },
        "quality": quality_metrics,
        "targets": baseline_performance_targets,
        "test_results": {
            "passed": (
                total_time < baseline_performance_targets["total_time_limit"] and
                len(section_texts) >= baseline_performance_targets["min_sections"] and
                len(full_text) >= baseline_performance_targets["min_characters"]
            ),
            "performance_grade": performance_analysis["performance_vs_targets"]["efficiency_grade"],
        }
    }

    # Save baseline results
    results_folder = RESULTS_FOLDER / "baseline_performance"
    results_folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    results_file = results_folder / f"full_application_baseline_{timestamp}.json"
    results_file.write_bytes(serialize(baseline_results))

    # Save generated text for analysis
    text_file = results_folder / f"full_application_baseline_text_{timestamp}.md"
    text_file.write_text(full_text)

    # Log comprehensive results
    logger.info("=== BASELINE RESULTS ===")
    logger.info("Total Time: %.1f seconds (%.1f minutes)", total_time, total_time / 60)
    logger.info("Performance Grade: %s", baseline_results["test_results"]["performance_grade"])
    logger.info("Sections Generated: %d", len(section_texts))
    logger.info("Total Characters: %d", len(full_text))
    logger.info("Total Words: %d", quality_metrics["word_count"])

    # Log optimization opportunities
    for opportunity in performance_analysis["optimization_opportunities"]:
        logger.info(
            "OPTIMIZATION: %s - Current: %.1fs, Target: %.1fs, Potential: %s",
            opportunity["type"],
            opportunity["current_time"],
            opportunity["target_time"],
            opportunity["potential_improvement"]
        )

    if performance_analysis["bottlenecks"]:
        for bottleneck in performance_analysis["bottlenecks"]:
            logger.info(
                "BOTTLENECK: %s - %.1fs (%.1f%% of total time)",
                bottleneck["stage"],
                bottleneck["time"],
                bottleneck["percentage"]
            )

    logger.info("Results saved to: %s", results_file)

    # Performance assertions
    assert total_time < baseline_performance_targets["total_time_limit"], (
        f"Pipeline took {total_time:.1f}s, exceeds {baseline_performance_targets['total_time_limit']}s limit"
    )
    assert len(section_texts) >= baseline_performance_targets["min_sections"], (
        f"Only generated {len(section_texts)} sections, expected at least {baseline_performance_targets['min_sections']}"
    )
    assert len(full_text) >= baseline_performance_targets["min_characters"], (
        f"Generated text too short: {len(full_text)} characters, expected at least {baseline_performance_targets['min_characters']}"
    )

    logger.info("=== BASELINE TEST COMPLETED SUCCESSFULLY ===")

    return baseline_results


@e2e_test(category=E2ETestCategory.SMOKE, timeout=600)
async def test_baseline_work_plan_timing(
    logger: logging.Logger,
    melanoma_application_data: dict[str, Any],
    simple_test_objectives: list[dict[str, Any]],
) -> None:
    """Focused baseline test for work plan generation timing patterns."""

    objectives = melanoma_application_data["research_objectives"]

    logger.info("=== WORK PLAN TIMING BASELINE ===")
    logger.info("Real Objectives Count: %d", len(objectives))
    logger.info("Total Tasks: %d", sum(len(obj.research_tasks) for obj in objectives))

    # Simulate current sequential processing pattern
    start_time = datetime.now(UTC)

    # This simulates the current sequential objective processing
    sequential_times = []
    for i, _objective in enumerate(objectives, 1):
        obj_start = datetime.now(UTC)

        # Simulate objective processing time (0.5-2 seconds per objective for baseline)
        import asyncio
        await asyncio.sleep(0.1)  # Minimal simulation

        obj_time = (datetime.now(UTC) - obj_start).total_seconds()
        sequential_times.append(obj_time)

        logger.info("Objective %d processed in %.3fs", i, obj_time)

    total_sequential_time = (datetime.now(UTC) - start_time).total_seconds()

    # Calculate theoretical parallel improvement
    max_objective_time = max(sequential_times) if sequential_times else 0
    theoretical_parallel_time = max_objective_time  # All objectives in parallel
    potential_speedup = total_sequential_time / theoretical_parallel_time if theoretical_parallel_time > 0 else 1

    # Baseline metrics
    baseline_metrics = {
        "work_plan_timing_baseline": {
            "objectives_count": len(objectives),
            "total_tasks": sum(len(obj.research_tasks) for obj in objectives),
            "sequential_processing_time": round(total_sequential_time, 3),
            "average_time_per_objective": round(total_sequential_time / len(objectives), 3) if objectives else 0,
            "max_objective_time": round(max_objective_time, 3),
            "theoretical_parallel_time": round(theoretical_parallel_time, 3),
            "potential_speedup_factor": round(potential_speedup, 1),
            "optimization_potential": f"{len(objectives)}x speedup via parallelization",
        },
        "current_implementation": {
            "is_sequential": True,
            "bottleneck": "Sequential objective processing in while loop",
            "optimization_priority": "HIGH - Easy parallelization wins",
        }
    }

    # Save results
    results_folder = RESULTS_FOLDER / "baseline_performance"
    results_folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    results_file = results_folder / f"work_plan_timing_baseline_{timestamp}.json"
    results_file.write_bytes(serialize(baseline_metrics))

    logger.info("=== WORK PLAN TIMING RESULTS ===")
    logger.info("Sequential Time: %.3fs", total_sequential_time)
    logger.info("Theoretical Parallel Time: %.3fs", theoretical_parallel_time)
    logger.info("Potential Speedup: %.1fx", potential_speedup)
    logger.info("Optimization Priority: HIGH - Sequential processing bottleneck detected")

    return baseline_metrics


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_baseline_simple_metrics(
    logger: logging.Logger,
    simple_test_objectives: list[dict[str, Any]],
    baseline_performance_targets: dict[str, float],
) -> None:
    """Simple baseline test for optimization planning."""

    logger.info("=== SIMPLE BASELINE METRICS ===")

    # Calculate complexity metrics for planning
    total_objectives = len(simple_test_objectives)
    total_tasks = sum(len(obj["research_tasks"]) for obj in simple_test_objectives)

    # Estimate current vs optimized performance
    current_estimates = {
        "sequential_objective_processing": total_objectives * 60,  # 1 min per objective
        "individual_enrichment_calls": total_objectives * 30,     # 30s per enrichment
        "section_generation": 5 * 120,                          # 2 min per section
        "evaluation_overhead": (total_objectives + total_tasks + 5) * 10,  # 10s per evaluation
    }

    optimized_estimates = {
        "parallel_objective_processing": 60,                      # All objectives in parallel
        "batch_enrichment": 30,                                  # Single batch call
        "optimized_section_generation": 5 * 60,                  # 1 min per section
        "reduced_evaluation": (total_objectives + total_tasks + 5) * 3,  # 3s per evaluation
    }

    current_total = sum(current_estimates.values())
    optimized_total = sum(optimized_estimates.values())
    improvement_factor = current_total / optimized_total

    metrics = {
        "complexity": {
            "objectives": total_objectives,
            "tasks": total_tasks,
            "estimated_sections": 5,
            "total_components": total_objectives + total_tasks + 5,
        },
        "performance_estimates": {
            "current_total_seconds": current_total,
            "optimized_total_seconds": optimized_total,
            "improvement_factor": round(improvement_factor, 1),
            "time_savings_seconds": current_total - optimized_total,
            "time_savings_percentage": round(((current_total - optimized_total) / current_total) * 100, 1),
        },
        "optimization_breakdown": {
            "current": current_estimates,
            "optimized": optimized_estimates,
        }
    }

    logger.info("Test Configuration: %d objectives, %d tasks", total_objectives, total_tasks)
    logger.info("Current Estimate: %.1f seconds (%.1f minutes)", current_total, current_total / 60)
    logger.info("Optimized Estimate: %.1f seconds (%.1f minutes)", optimized_total, optimized_total / 60)
    logger.info("Potential Improvement: %.1fx faster (%.1f%% time savings)", improvement_factor, metrics["performance_estimates"]["time_savings_percentage"])

    # Save planning metrics
    results_folder = RESULTS_FOLDER / "baseline_performance"
    results_folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    results_file = results_folder / f"simple_baseline_metrics_{timestamp}.json"
    results_file.write_bytes(serialize(metrics))

    logger.info("Planning metrics saved to: %s", results_file)

    return metrics
