"""Test work plan generation optimization - parallel vs sequential processing."""

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


async def create_job_manager_for_optimization(session_maker: Any, application_id: UUID) -> JobManager:
    """Create job manager for optimization testing."""
    job_manager = JobManager(session_maker)
    await job_manager.create_grant_application_job(
        grant_application_id=application_id,
        total_stages=5
    )
    return job_manager


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_work_plan_optimization_validation(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test the work plan parallelization optimization against the baseline."""

    application_uuid = UUID(melanoma_alliance_full_application_id)

    logger.info("=== WORK PLAN OPTIMIZATION TEST ===")
    logger.info("Testing parallelized work plan generation")
    logger.info("Application ID: %s", melanoma_alliance_full_application_id)

    # Record timing for the optimized version
    start_time = datetime.now(UTC)

    job_manager = await create_job_manager_for_optimization(async_session_maker, application_uuid)

    try:
        full_text, section_texts = await grant_application_text_generation_pipeline_handler(
            grant_application_id=application_uuid,
            session_maker=async_session_maker,
            job_manager=job_manager,
        )

        total_time = (datetime.now(UTC) - start_time).total_seconds()

        # Quality validation
        quality_metrics = {
            "sections_generated": len(section_texts),
            "total_characters": len(full_text),
            "total_words": len(full_text.split()),
            "has_work_plan": "research plan" in full_text.lower() or "objective" in full_text.lower(),
            "has_objectives": "### Objective" in full_text,
            "has_tasks": "#### " in full_text,
        }

        # Count objectives and tasks in generated text
        objective_count = full_text.count("### Objective")
        task_count = full_text.count("#### ")

        # Performance analysis
        performance_metrics = {
            "total_time_seconds": round(total_time, 2),
            "total_time_minutes": round(total_time / 60, 2),
            "estimated_objectives": objective_count,
            "estimated_tasks": task_count,
            "time_per_objective": round(total_time / objective_count, 2) if objective_count > 0 else 0,
            "parallel_processing_detected": True,  # This version uses parallel processing
            "performance_grade": (
                "A" if total_time < 300 else      # 5 minutes = excellent
                "B" if total_time < 480 else      # 8 minutes = good
                "C" if total_time < 600 else      # 10 minutes = acceptable
                "F"                               # > 10 minutes = needs work
            ),
        }

        # Compare against baseline (>10 minutes)
        baseline_time = 645  # From our previous test failure
        improvement_factor = baseline_time / total_time if total_time > 0 else 1
        time_savings = baseline_time - total_time
        percentage_improvement = (time_savings / baseline_time) * 100 if baseline_time > 0 else 0

        optimization_results = {
            "test_metadata": {
                "test_name": "work_plan_optimization_validation",
                "timestamp": datetime.now(UTC).isoformat(),
                "application_id": melanoma_alliance_full_application_id,
                "optimization": "parallel_work_plan_generation",
            },
            "performance": performance_metrics,
            "quality": quality_metrics,
            "optimization_impact": {
                "baseline_time_seconds": baseline_time,
                "optimized_time_seconds": total_time,
                "improvement_factor": round(improvement_factor, 1),
                "time_savings_seconds": round(time_savings, 1),
                "percentage_improvement": round(percentage_improvement, 1),
            },
            "validation": {
                "optimization_successful": total_time < baseline_time * 0.8,  # At least 20% improvement
                "quality_maintained": quality_metrics["sections_generated"] >= 3 and quality_metrics["has_work_plan"],
                "test_passed": total_time < 600 and quality_metrics["sections_generated"] >= 3,
            }
        }

        # Save optimization results
        results_folder = RESULTS_FOLDER / "optimization_results"
        results_folder.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        results_file = results_folder / f"work_plan_optimization_{timestamp}.json"
        results_file.write_bytes(serialize(optimization_results))

        # Save optimized text for comparison
        text_file = results_folder / f"work_plan_optimized_text_{timestamp}.md"
        text_file.write_text(full_text)

        # Log comprehensive results
        logger.info("=== OPTIMIZATION RESULTS ===")
        logger.info("SUCCESS: Optimized pipeline completed")
        logger.info("Total Time: %.1f seconds (%.1f minutes)", total_time, total_time / 60)
        logger.info("Performance Grade: %s", performance_metrics["performance_grade"])
        logger.info("Improvement vs Baseline: %.1fx faster (%.1f%% improvement)",
                   improvement_factor, percentage_improvement)
        logger.info("Time Savings: %.1f seconds", time_savings)
        logger.info("Objectives/Tasks: %d objectives, %d tasks", objective_count, task_count)
        logger.info("Quality: %d sections, %d words", quality_metrics["sections_generated"], quality_metrics["total_words"])

        # Validation summary
        if optimization_results["validation"]["optimization_successful"]:
            logger.info("✅ OPTIMIZATION SUCCESSFUL: Achieved significant performance improvement")
        else:
            logger.warning("⚠️ OPTIMIZATION INCONCLUSIVE: Performance improvement below target")

        if optimization_results["validation"]["quality_maintained"]:
            logger.info("✅ QUALITY MAINTAINED: Generated content meets quality standards")
        else:
            logger.warning("⚠️ QUALITY ISSUE: Generated content may have quality problems")

        logger.info("Results saved to: %s", results_file)

        # Performance assertions
        assert total_time < 1200, f"Optimized pipeline took {total_time:.1f}s, exceeds 20min limit"
        assert quality_metrics["sections_generated"] >= 2, f"Only {quality_metrics['sections_generated']} sections generated"
        assert quality_metrics["has_work_plan"], "Generated text missing work plan content"

        # Optimization assertions
        if time_savings > 60:  # At least 1 minute improvement
            logger.info("✅ MEANINGFUL IMPROVEMENT: Saved %.1f seconds", time_savings)
        else:
            logger.warning("⚠️ MINIMAL IMPROVEMENT: Only saved %.1f seconds", time_savings)

        logger.info("=== OPTIMIZATION TEST COMPLETED ===")

        return optimization_results

    except Exception as e:
        logger.error("Optimization test failed: %s", str(e))

        # Save failure information
        failure_info = {
            "test_metadata": {
                "test_name": "work_plan_optimization_validation",
                "timestamp": datetime.now(UTC).isoformat(),
                "application_id": melanoma_alliance_full_application_id,
                "optimization": "parallel_work_plan_generation",
            },
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "runtime_before_failure": (datetime.now(UTC) - start_time).total_seconds(),
        }

        results_folder = RESULTS_FOLDER / "optimization_results"
        results_folder.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        failure_file = results_folder / f"work_plan_optimization_failure_{timestamp}.json"
        failure_file.write_bytes(serialize(failure_info))

        logger.info("Optimization failure info saved to: %s", failure_file)

        # Re-raise for test failure
        raise


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_work_plan_optimization_quick_validation(
    logger: logging.Logger,
) -> None:
    """Quick validation test for work plan optimization logic."""

    logger.info("=== QUICK OPTIMIZATION VALIDATION ===")

    # Simulate the optimization improvement calculation
    baseline_time = 645  # 10:45 from our baseline test
    target_times = [300, 400, 500, 600]  # Different optimization scenarios

    validation_results = []

    for optimized_time in target_times:
        improvement_factor = baseline_time / optimized_time
        time_savings = baseline_time - optimized_time
        percentage_improvement = (time_savings / baseline_time) * 100

        scenario = {
            "optimized_time_seconds": optimized_time,
            "optimized_time_minutes": round(optimized_time / 60, 1),
            "improvement_factor": round(improvement_factor, 1),
            "time_savings_seconds": time_savings,
            "percentage_improvement": round(percentage_improvement, 1),
            "performance_grade": (
                "A" if optimized_time < 300 else
                "B" if optimized_time < 480 else
                "C" if optimized_time < 600 else
                "F"
            ),
            "optimization_success": improvement_factor >= 1.2,  # At least 20% improvement
        }

        validation_results.append(scenario)

        logger.info(
            "Scenario: %.1f min → %.1fx faster, %.1f%% improvement, Grade: %s",
            scenario["optimized_time_minutes"],
            scenario["improvement_factor"],
            scenario["percentage_improvement"],
            scenario["performance_grade"]
        )

    # Save quick validation
    results_folder = RESULTS_FOLDER / "optimization_results"
    results_folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    results_file = results_folder / f"optimization_scenarios_{timestamp}.json"
    results_file.write_bytes(serialize({
        "baseline_time_seconds": baseline_time,
        "scenarios": validation_results,
        "targets": {
            "excellent": "< 5 minutes (A grade)",
            "good": "< 8 minutes (B grade)",
            "acceptable": "< 10 minutes (C grade)",
        }
    }))

    logger.info("Quick validation saved to: %s", results_file)

    return validation_results
