"""Test batch enrichment optimization performance."""

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


async def create_job_manager_for_test(session_maker: Any, application_id: UUID) -> JobManager:
    """Create job manager for testing."""
    job_manager = JobManager(session_maker)
    await job_manager.create_grant_application_job(
        grant_application_id=application_id,
        total_stages=5
    )
    return job_manager


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_batch_enrichment_optimization(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test the batch enrichment optimization against individual enrichment baseline."""

    application_uuid = UUID(melanoma_alliance_full_application_id)

    logger.info("=== BATCH ENRICHMENT OPTIMIZATION TEST ===")
    logger.info("Testing batch objective enrichment")
    logger.info("Application ID: %s", melanoma_alliance_full_application_id)

    # Record timing for the optimized version
    start_time = datetime.now(UTC)

    job_manager = await create_job_manager_for_test(async_session_maker, application_uuid)

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
            "batch_processing_enabled": True,
            "performance_grade": (
                "A" if total_time < 300 else      # 5 minutes = excellent
                "B" if total_time < 480 else      # 8 minutes = good
                "C" if total_time < 600 else      # 10 minutes = acceptable
                "F"                               # > 10 minutes = needs work
            ),
        }

        # Compare against baseline (618s from work plan optimization)
        baseline_time = 618  # Previous optimized time
        improvement_factor = baseline_time / total_time if total_time > 0 else 1
        time_savings = baseline_time - total_time
        percentage_improvement = (time_savings / baseline_time) * 100 if baseline_time > 0 else 0

        optimization_results = {
            "test_metadata": {
                "test_name": "batch_enrichment_optimization",
                "timestamp": datetime.now(UTC).isoformat(),
                "application_id": melanoma_alliance_full_application_id,
                "optimization": "batch_objective_enrichment",
            },
            "performance": performance_metrics,
            "quality": quality_metrics,
            "optimization_impact": {
                "baseline_time_seconds": baseline_time,
                "optimized_time_seconds": total_time,
                "improvement_factor": round(improvement_factor, 1),
                "time_savings_seconds": round(time_savings, 1),
                "percentage_improvement": round(percentage_improvement, 1),
                "expected_improvement": "30-40%",
            },
            "validation": {
                "optimization_successful": percentage_improvement >= 20,
                "quality_maintained": quality_metrics["sections_generated"] >= 3 and quality_metrics["has_work_plan"],
                "test_passed": total_time < 500 and quality_metrics["sections_generated"] >= 3,
            }
        }

        # Save optimization results
        results_folder = RESULTS_FOLDER / "optimization_results"
        results_folder.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        results_file = results_folder / f"batch_enrichment_optimization_{timestamp}.json"
        results_file.write_bytes(serialize(optimization_results))

        # Log comprehensive results
        logger.info("=== BATCH ENRICHMENT RESULTS ===")
        logger.info("SUCCESS: Batch enrichment pipeline completed")
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
            logger.warning("⚠️ OPTIMIZATION NEEDS TUNING: Performance improvement below target")

        if optimization_results["validation"]["quality_maintained"]:
            logger.info("✅ QUALITY MAINTAINED: Generated content meets quality standards")
        else:
            logger.warning("⚠️ QUALITY ISSUE: Generated content may have quality problems")

        logger.info("Results saved to: %s", results_file)

        # Performance assertions
        assert total_time < 1200, f"Batch enrichment took {total_time:.1f}s, exceeds 20min limit"
        assert quality_metrics["sections_generated"] >= 2, f"Only {quality_metrics['sections_generated']} sections generated"
        assert quality_metrics["has_work_plan"], "Generated text missing work plan content"

        logger.info("=== BATCH ENRICHMENT TEST COMPLETED ===")

        return optimization_results

    except Exception as e:
        logger.error("Batch enrichment test failed: %s", str(e))
        raise