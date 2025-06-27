"""Simple baseline test using existing fixtures and real application data."""

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
from services.rag.src.utils.job_manager import JobManager


async def create_job_manager_for_baseline(session_maker: Any, application_id: UUID) -> JobManager:
    """Create job manager for baseline testing."""
    job_manager = JobManager(session_maker)
    await job_manager.create_grant_application_job(
        grant_application_id=application_id,
        total_stages=5
    )
    return job_manager


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_simple_baseline_planning(
    logger: logging.Logger,
    research_objectives: list[Any],
) -> None:
    """Simple baseline test for optimization planning with existing fixtures."""

    logger.info("=== SIMPLE BASELINE PLANNING ===")

    # Use existing research objectives fixture
    total_objectives = len(research_objectives)
    total_tasks = sum(len(obj.research_tasks) for obj in research_objectives)

    logger.info("Configuration: %d objectives, %d tasks", total_objectives, total_tasks)

    # Performance estimates based on analysis
    current_estimates = {
        "sequential_objective_processing": total_objectives * 60,  # 1 min per objective
        "individual_enrichment_calls": total_objectives * 30,     # 30s per enrichment
        "section_generation": 5 * 120,                          # 2 min per section
        "evaluation_overhead": (total_objectives + total_tasks + 5) * 10,  # 10s per evaluation
    }

    optimized_estimates = {
        "parallel_objective_processing": 60,                      # All in parallel
        "batch_enrichment": 30,                                  # Single batch
        "optimized_section_generation": 5 * 60,                  # 1 min per section
        "reduced_evaluation": (total_objectives + total_tasks + 5) * 3,  # 3s per evaluation
    }

    current_total = sum(current_estimates.values())
    optimized_total = sum(optimized_estimates.values())
    improvement_factor = current_total / optimized_total

    planning_metrics = {
        "configuration": {
            "objectives": total_objectives,
            "tasks": total_tasks,
            "estimated_sections": 5,
        },
        "performance_estimates": {
            "current_total_seconds": current_total,
            "current_total_minutes": round(current_total / 60, 1),
            "optimized_total_seconds": optimized_total,
            "optimized_total_minutes": round(optimized_total / 60, 1),
            "improvement_factor": round(improvement_factor, 1),
            "time_savings_seconds": current_total - optimized_total,
            "time_savings_percentage": round(((current_total - optimized_total) / current_total) * 100, 1),
        },
        "optimization_priorities": [
            {
                "name": "work_plan_parallelization",
                "current": current_estimates["sequential_objective_processing"],
                "optimized": optimized_estimates["parallel_objective_processing"],
                "improvement": f"{total_objectives}x speedup",
                "priority": "HIGH"
            },
            {
                "name": "batch_enrichment",
                "current": current_estimates["individual_enrichment_calls"],
                "optimized": optimized_estimates["batch_enrichment"],
                "improvement": f"{round(current_estimates['individual_enrichment_calls']/optimized_estimates['batch_enrichment'], 1)}x speedup",
                "priority": "HIGH"
            },
            {
                "name": "evaluation_optimization",
                "current": current_estimates["evaluation_overhead"],
                "optimized": optimized_estimates["reduced_evaluation"],
                "improvement": f"{round(current_estimates['evaluation_overhead']/optimized_estimates['reduced_evaluation'], 1)}x speedup",
                "priority": "MEDIUM"
            }
        ]
    }

    # Save planning results
    results_folder = RESULTS_FOLDER / "baseline_performance"
    results_folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    results_file = results_folder / f"optimization_planning_{timestamp}.json"
    results_file.write_bytes(serialize(planning_metrics))

    # Log results
    logger.info("=== OPTIMIZATION PLANNING RESULTS ===")
    logger.info("Current Estimate: %.1f seconds (%.1f minutes)", current_total, current_total / 60)
    logger.info("Optimized Estimate: %.1f seconds (%.1f minutes)", optimized_total, optimized_total / 60)
    logger.info("Improvement Factor: %.1fx faster", improvement_factor)
    logger.info("Time Savings: %.1f%% reduction", planning_metrics["performance_estimates"]["time_savings_percentage"])

    for priority in planning_metrics["optimization_priorities"]:
        logger.info(
            "OPTIMIZATION: %s - %s improvement (%s priority)",
            priority["name"],
            priority["improvement"],
            priority["priority"]
        )

    logger.info("Planning saved to: %s", results_file)

    return planning_metrics


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_baseline_real_application(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Baseline test with real melanoma alliance application."""

    application_uuid = UUID(melanoma_alliance_full_application_id)

    logger.info("=== REAL APPLICATION BASELINE ===")
    logger.info("Application ID: %s", melanoma_alliance_full_application_id)

    # Create job manager and measure timing
    overall_start = datetime.now(UTC)

    job_manager = await create_job_manager_for_baseline(async_session_maker, application_uuid)

    try:
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
            "total_words": len(full_text.split()),
            "average_section_length": len(full_text) // len(section_texts) if section_texts else 0,
            "has_markdown_headers": "# " in full_text,
            "non_empty_sections": sum(1 for content in section_texts.values() if len(content.strip()) > 0),
        }

        # Performance analysis
        performance_analysis = {
            "total_time_seconds": round(total_time, 2),
            "total_time_minutes": round(total_time / 60, 2),
            "performance_grade": (
                "A" if total_time < 300 else      # 5 minutes
                "B" if total_time < 600 else      # 10 minutes
                "C" if total_time < 900 else      # 15 minutes
                "F"                               # > 15 minutes
            ),
            "optimization_needed": total_time > 600,  # If over 10 minutes
        }

        # Baseline results
        baseline_results = {
            "test_metadata": {
                "test_name": "baseline_real_application",
                "timestamp": datetime.now(UTC).isoformat(),
                "application_id": melanoma_alliance_full_application_id,
            },
            "performance": performance_analysis,
            "quality": quality_metrics,
            "success": True,
        }

        # Save comprehensive results
        results_folder = RESULTS_FOLDER / "baseline_performance"
        results_folder.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        results_file = results_folder / f"real_application_baseline_{timestamp}.json"
        results_file.write_bytes(serialize(baseline_results))

        # Save generated text
        text_file = results_folder / f"real_application_baseline_text_{timestamp}.md"
        text_file.write_text(full_text)

        # Log comprehensive results
        logger.info("=== BASELINE RESULTS ===")
        logger.info("SUCCESS: Pipeline completed successfully")
        logger.info("Total Time: %.1f seconds (%.1f minutes)", total_time, total_time / 60)
        logger.info("Performance Grade: %s", performance_analysis["performance_grade"])
        logger.info("Sections Generated: %d", quality_metrics["sections_generated"])
        logger.info("Total Words: %d", quality_metrics["total_words"])

        if performance_analysis["optimization_needed"]:
            logger.info("OPTIMIZATION NEEDED: Pipeline took > 10 minutes")

        logger.info("Results saved to: %s", results_file)
        logger.info("Generated text saved to: %s", text_file)

        # Performance assertions
        assert total_time < 1800, f"Pipeline took {total_time:.1f}s, exceeds 30min hard limit"
        assert len(section_texts) >= 2, f"Only generated {len(section_texts)} sections"
        assert len(full_text) >= 500, f"Generated text too short: {len(full_text)} characters"

        logger.info("=== BASELINE TEST COMPLETED SUCCESSFULLY ===")

        return baseline_results

    except Exception as e:
        logger.error("Baseline test failed: %s", str(e))

        # Save failure information
        failure_info = {
            "test_metadata": {
                "test_name": "baseline_real_application",
                "timestamp": datetime.now(UTC).isoformat(),
                "application_id": melanoma_alliance_full_application_id,
            },
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
        }

        results_folder = RESULTS_FOLDER / "baseline_performance"
        results_folder.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        failure_file = results_folder / f"baseline_failure_{timestamp}.json"
        failure_file.write_bytes(serialize(failure_info))

        logger.info("Failure info saved to: %s", failure_file)

        # Re-raise for test failure
        raise
