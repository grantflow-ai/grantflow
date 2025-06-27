"""Simple baseline performance test for grant application generation."""

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


async def create_mock_job_manager_for_baseline(session_maker: Any, grant_application_id: UUID) -> JobManager:
    """Create a JobManager for baseline tests with mocked pubsub."""
    job_manager = JobManager(session_maker)
    await job_manager.create_grant_application_job(grant_application_id=grant_application_id, total_stages=5)
    return job_manager


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_grant_application_baseline_performance(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Baseline performance test for grant application generation."""

    overall_start = datetime.now(UTC)
    application_uuid = UUID(melanoma_alliance_full_application_id)

    logger.info("=== BASELINE PERFORMANCE TEST START ===")
    logger.info("Application ID: %s", melanoma_alliance_full_application_id)

    # Create job manager and run pipeline
    job_manager = await create_mock_job_manager_for_baseline(async_session_maker, application_uuid)

    full_text, section_texts = await grant_application_text_generation_pipeline_handler(
        grant_application_id=application_uuid,
        session_maker=async_session_maker,
        job_manager=job_manager,
    )

    total_time = (datetime.now(UTC) - overall_start).total_seconds()

    # Basic quality metrics
    quality_metrics = {
        "sections_generated": len(section_texts),
        "total_characters": len(full_text),
        "average_section_length": len(full_text) // len(section_texts) if section_texts else 0,
        "has_headers": "# " in full_text,
        "non_empty_sections": sum(1 for content in section_texts.values() if len(content.strip()) > 0),
    }

    # Baseline results
    baseline_results = {
        "test_metadata": {
            "test_name": "grant_application_baseline_performance",
            "timestamp": datetime.now(UTC).isoformat(),
            "application_id": melanoma_alliance_full_application_id,
        },
        "performance": {
            "total_time_seconds": round(total_time, 2),
            "total_time_minutes": round(total_time / 60, 2),
        },
        "quality": quality_metrics,
        "baseline_targets": {
            "total_time_target": 600,  # 10 minutes
            "sections_target": 5,      # At least 5 sections
            "characters_target": 5000, # At least 5k characters
        },
        "results_summary": {
            "test_passed": total_time < 900 and len(section_texts) >= 3,
            "performance_grade": "A" if total_time < 300 else "B" if total_time < 600 else "C",
        }
    }

    # Save baseline results
    folder = RESULTS_FOLDER / "baselines"
    folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    results_file = folder / f"grant_application_baseline_{timestamp}.json"
    results_file.write_bytes(serialize(baseline_results))

    # Also save the generated text for analysis
    text_file = folder / f"grant_application_baseline_text_{timestamp}.md"
    text_file.write_text(full_text)

    # Log comprehensive results
    logger.info("=== BASELINE PERFORMANCE RESULTS ===")
    logger.info("Total Time: %.1f seconds (%.1f minutes)", total_time, total_time / 60)
    logger.info("Sections Generated: %d", len(section_texts))
    logger.info("Total Characters: %d", len(full_text))
    logger.info("Performance Grade: %s", baseline_results["results_summary"]["performance_grade"])
    logger.info("Results saved to: %s", results_file)

    # Performance assertions
    assert total_time < 900, f"Pipeline took {total_time:.1f}s, exceeds 15min limit"
    assert len(section_texts) >= 3, f"Only generated {len(section_texts)} sections, expected at least 3"
    assert len(full_text) >= 1000, f"Generated text too short: {len(full_text)} characters"

    logger.info("=== BASELINE TEST COMPLETED SUCCESSFULLY ===")


@e2e_test(category=E2ETestCategory.SMOKE, timeout=900)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_work_plan_generation_baseline_timing(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Focused baseline test for work plan generation timing."""
    from packages.db.src.utils import retrieve_application

    from services.rag.src.grant_application.generate_work_plan_text import generate_work_plan_text

    application_uuid = UUID(melanoma_alliance_full_application_id)

    # Get application data to understand scope
    async with async_session_maker() as session:
        application = await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)
        research_objectives = application.research_deep_dive.research_objectives
        work_plan_section = next(
            s for s in application.grant_template.grant_sections
            if s.get("is_detailed_research_plan", False)
        )

    logger.info("=== WORK PLAN BASELINE TEST START ===")
    logger.info("Objectives count: %d", len(research_objectives))
    logger.info("Total tasks: %d", sum(len(obj.research_tasks) for obj in research_objectives))

    start_time = datetime.now(UTC)

    # Create job manager for timing
    job_manager = await create_mock_job_manager_for_baseline(async_session_maker, application_uuid)

    # Generate work plan text
    work_plan_text = await generate_work_plan_text(
        application_id=melanoma_alliance_full_application_id,
        work_plan_section=work_plan_section,
        form_inputs=application.research_deep_dive,
        research_objectives=research_objectives,
        job_manager=job_manager,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    # Calculate baseline metrics
    objectives_count = len(research_objectives)
    tasks_count = sum(len(obj.research_tasks) for obj in research_objectives)

    baseline_metrics = {
        "work_plan_baseline": {
            "total_time_seconds": round(elapsed_time, 2),
            "total_time_minutes": round(elapsed_time / 60, 2),
            "objectives_count": objectives_count,
            "tasks_count": tasks_count,
            "time_per_objective": round(elapsed_time / objectives_count, 2) if objectives_count > 0 else 0,
            "time_per_task": round(elapsed_time / tasks_count, 2) if tasks_count > 0 else 0,
            "characters_generated": len(work_plan_text),
            "words_generated": len(work_plan_text.split()),
        },
        "sequential_processing_analysis": {
            "is_sequential": True,  # Current implementation
            "theoretical_parallel_time": round(elapsed_time / objectives_count, 2) if objectives_count > 0 else 0,
            "potential_speedup": f"{objectives_count}x" if objectives_count > 1 else "1x",
        }
    }

    # Save work plan baseline
    folder = RESULTS_FOLDER / "baselines"
    folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    results_file = folder / f"work_plan_baseline_{timestamp}.json"
    results_file.write_bytes(serialize(baseline_metrics))

    logger.info("=== WORK PLAN BASELINE RESULTS ===")
    logger.info("Total Time: %.1f seconds (%.1f minutes)", elapsed_time, elapsed_time / 60)
    logger.info("Time per Objective: %.1f seconds", elapsed_time / objectives_count if objectives_count > 0 else 0)
    logger.info("Time per Task: %.1f seconds", elapsed_time / tasks_count if tasks_count > 0 else 0)
    logger.info("Sequential Processing: %d objectives processed sequentially", objectives_count)
    logger.info("Theoretical Parallel Speedup: %dx", objectives_count)
    logger.info("Characters Generated: %d", len(work_plan_text))

    # Performance assertions
    assert elapsed_time < 600, f"Work plan took {elapsed_time:.1f}s, exceeds 10min limit"
    assert len(work_plan_text) >= 500, f"Work plan too short: {len(work_plan_text)} characters"

    logger.info("=== WORK PLAN BASELINE COMPLETED ===")

    return baseline_metrics
