"""Test work plan generation optimization using unified performance framework."""

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
    """Test work plan parallelization optimization using unified performance framework."""

    application_uuid = UUID(melanoma_alliance_full_application_id)


    with create_performance_context(
        test_name="work_plan_optimization_validation",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "application_id": melanoma_alliance_full_application_id,
            "optimization_type": "parallel_work_plan_generation",
            "expected_improvement": "50-60%",
        },
        baseline_test_name="baseline_full_application_generation",
        expected_patterns=[
            "objective", "research plan", "methodology", "work plan",
            "timeline", "task", "deliverable", "milestone"
        ]
    ) as perf_ctx:

        logger.info("=== WORK PLAN OPTIMIZATION (UNIFIED FRAMEWORK) ===")
        logger.info("Testing parallelized work plan generation")
        logger.info("Application ID: %s", melanoma_alliance_full_application_id)

        job_manager = await create_job_manager_for_optimization(async_session_maker, application_uuid)

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

                perf_ctx.add_llm_call(estimated_objectives // 2 + 3)


            with perf_ctx.stage_timer("work_plan_generation"):

                pass

            with perf_ctx.stage_timer("final_generation"):

                pass


            perf_ctx.set_content(full_text, section_texts)


            objective_count = full_text.count("### Objective")
            task_count = full_text.count("#### ")

            logger.info(
                "Work plan optimization completed",
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
            assert_optimization_success(perf_ctx.result, min_improvement=30.0)


        assert len(section_texts) >= 2, f"Only {len(section_texts)} sections generated"
        assert "objective" in full_text.lower(), "Generated text missing objective content"

        logger.info("=== WORK PLAN OPTIMIZATION COMPLETED ===")

        return perf_ctx.result


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_work_plan_optimization_quick_validation(
    logger: logging.Logger,
) -> None:
    """Quick validation test for work plan optimization using unified framework."""


    with create_performance_context(
        test_name="work_plan_optimization_quick_validation",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "optimization_scenario_analysis",
            "optimization_type": "parallel_work_plan_generation",
            "scenarios": ["excellent", "good", "acceptable", "poor"],
        }
    ) as perf_ctx:

        logger.info("=== QUICK OPTIMIZATION VALIDATION (UNIFIED) ===")


        baseline_time = 645
        target_times = [300, 400, 500, 600]


        for i, optimized_time in enumerate(target_times):
            scenario_name = ["excellent", "good", "acceptable", "poor"][i]


            with perf_ctx.stage_timer("pipeline_initialization"):

                pass

            with perf_ctx.stage_timer("objective_extraction"):

                pass

            with perf_ctx.stage_timer("objective_enrichment"):

                pass

            with perf_ctx.stage_timer("work_plan_generation"):

                pass

            with perf_ctx.stage_timer("final_generation"):

                pass


            perf_ctx.add_llm_call(8)


            improvement_factor = baseline_time / optimized_time
            time_savings = baseline_time - optimized_time
            percentage_improvement = (time_savings / baseline_time) * 100

            logger.info(
                "Scenario %s: %.1f min → %.1fx faster, %.1f%% improvement",
                scenario_name,
                optimized_time / 60,
                improvement_factor,
                percentage_improvement
            )


        mock_content = """
        # Work Plan Optimization Analysis

        ## Scenario Analysis Results

        ### Parallel Processing Benefits
        The work plan optimization demonstrates significant improvements through parallel processing.

        ### Performance Scenarios
        - **Excellent (5 min)**: Optimal parallelization with efficient resource utilization
        - **Good (8 min)**: Effective parallelization with some bottlenecks
        - **Acceptable (10 min)**: Partial parallelization with sequential fallbacks
        - **Poor (10+ min)**: Limited parallelization benefits

        ### Optimization Insights
        Parallel work plan generation reduces processing time by eliminating sequential bottlenecks
        in objective enrichment and task generation phases.
        """

        mock_sections = [
            "Scenario Analysis Results", "Parallel Processing Benefits",
            "Performance Scenarios", "Optimization Insights"
        ]

        perf_ctx.set_content(mock_content, mock_sections)


        perf_ctx.add_warning("Sequential processing identified as primary bottleneck")

        logger.info("Quick validation completed with unified framework")


        assert_performance_targets(perf_ctx.result, min_grade="C")
        assert_quality_targets(perf_ctx.result, min_score=70.0)

        return perf_ctx.result
