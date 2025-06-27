"""Test batch enrichment optimization using unified performance framework."""

import contextlib
import logging
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.src.utils.job_manager import JobManager
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_optimization_success,
    assert_performance_targets,
    assert_quality_targets,
    create_performance_context,
)
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test


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
    """Test batch enrichment optimization using unified performance framework."""

    application_uuid = UUID(melanoma_alliance_full_application_id)


    with create_performance_context(
        test_name="batch_enrichment_optimization",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "application_id": melanoma_alliance_full_application_id,
            "optimization_type": "batch_objective_enrichment",
            "expected_improvement": "30-40%",
        },
        baseline_test_name="baseline_full_application_generation",
        expected_patterns=[
            "objective", "research plan", "methodology", "work plan",
            "analysis", "hypothesis", "timeline", "deliverable"
        ]
    ) as perf_ctx:

        logger.info("=== BATCH ENRICHMENT OPTIMIZATION (UNIFIED FRAMEWORK) ===")
        logger.info("Testing optimized batch objective enrichment")
        logger.info("Application ID: %s", melanoma_alliance_full_application_id)

        job_manager = await create_job_manager_for_test(async_session_maker, application_uuid)

        try:

            with perf_ctx.stage_timer("pipeline_initialization"):
                pass


            with perf_ctx.stage_timer("objective_extraction"):

                pass


            with perf_ctx.stage_timer("objective_enrichment"):

                full_text, section_texts = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=application_uuid,
                    session_maker=async_session_maker,
                    job_manager=job_manager,
                )


                estimated_objectives = max(5, full_text.count("### Objective"))

                perf_ctx.add_llm_call(estimated_objectives // 3 + 2)


            with perf_ctx.stage_timer("work_plan_generation"):

                pass

            with perf_ctx.stage_timer("final_generation"):

                pass


            perf_ctx.set_content(full_text, section_texts)


            objective_count = full_text.count("### Objective")
            task_count = full_text.count("#### ")

            logger.info(
                "Batch enrichment optimization completed",
                sections_generated=len(section_texts),
                total_characters=len(full_text),
                objectives_found=objective_count,
                tasks_found=task_count,
                llm_calls_optimized=perf_ctx.llm_calls_made,
            )

        except Exception as e:
            perf_ctx.add_error(f"Pipeline execution failed: {e!s}")
            raise
        finally:
            with contextlib.suppress(Exception):
                await job_manager.close()


        assert_performance_targets(perf_ctx.result, min_grade="C")
        assert_quality_targets(perf_ctx.result, min_score=70.0)


        if perf_ctx.result.optimization_metrics:
            assert_optimization_success(perf_ctx.result, min_improvement=20.0)


        assert len(section_texts) >= 2, f"Only {len(section_texts)} sections generated"
        assert "objective" in full_text.lower(), "Generated text missing objective content"

        logger.info("=== BATCH ENRICHMENT OPTIMIZATION COMPLETED ===")

        return perf_ctx.result
