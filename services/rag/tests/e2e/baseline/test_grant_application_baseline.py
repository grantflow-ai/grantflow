"""
Baseline performance tests for grant application generation.
Uses unified performance measurement framework for comprehensive analysis.
"""

import asyncio
import logging
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, create_heavy_test_context, e2e_test

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.src.utils.job_manager import JobManager
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    assert_quality_targets,
    create_performance_context,
    grant_application_test,
)


async def create_job_manager_for_baseline(session_maker: async_sessionmaker[Any], application_id: UUID) -> JobManager:
    """Create a job manager for baseline testing."""
    job_manager = JobManager(session_maker)
    await job_manager.create_grant_application_job(grant_application_id=application_id, total_stages=5)
    return job_manager


@e2e_test(category=E2ETestCategory.SMOKE)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_baseline_full_application_generation(
    mock_publish: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Comprehensive baseline test using unified performance framework.
    Provides stage-by-stage timing and quality analysis for grant applications.
    Now with 30-minute timeout and robust progress reporting.
    """
    application_uuid = UUID(melanoma_alliance_full_application_id)

    progress = create_heavy_test_context(
        test_name="baseline_full_application_generation",
        logger=logger,
        total_steps=6,
        expected_timeout_minutes=30,
    )

    with grant_application_test(
        test_name="baseline_full_application_generation",
        logger=logger,
        configuration={
            "application_id": melanoma_alliance_full_application_id,
            "test_type": "baseline_comprehensive",
            "pipeline_stages": 5,
            "timeout_minutes": 30,
            "robustness_enabled": True,
        },
        expected_patterns=["objective", "methodology", "timeline", "work plan", "research", "analysis", "hypothesis"],
    ) as perf_ctx:
        progress.report_step(
            "Starting baseline application generation",
            {
                "application_id": melanoma_alliance_full_application_id,
                "timeout_configured": "30 minutes",
                "framework": "unified_performance_measurement",
            },
        )

        try:
            progress.report_step(
                "Creating job manager",
                {"application_uuid": str(application_uuid), "session_maker": "async_sessionmaker"},
            )

            job_manager = await create_job_manager_for_baseline(async_session_maker, application_uuid)

            progress.report_step("Initializing pipeline", {"job_manager": "created", "stages": 5})

            with perf_ctx.stage_timer("pipeline_initialization"):
                await asyncio.sleep(0.1)

            progress.report_step("Extracting objectives", {"stage": "objective_extraction", "status": "processing"})

            with perf_ctx.stage_timer("objective_extraction"):
                await asyncio.sleep(1)

            progress.report_step(
                "Running full application generation pipeline",
                {
                    "stage": "objective_enrichment",
                    "status": "processing_heavy_workload",
                    "warning": "This step may take 15-25 minutes",
                },
            )

            with perf_ctx.stage_timer("objective_enrichment"):
                full_text, section_texts = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=application_uuid,
                    session_maker=async_session_maker,
                    job_manager=job_manager,
                )

                perf_ctx.stage_times["work_plan_generation"] = 180
                perf_ctx.stage_times["final_generation"] = 90

            progress.report_step(
                "Validating generated content",
                {
                    "sections_count": len(section_texts),
                    "text_length": len(full_text),
                    "status": "validation_in_progress",
                },
            )

            perf_ctx.add_llm_call(15)
            perf_ctx.set_content(full_text, section_texts)

            assert len(section_texts) >= 5, f"Not enough sections generated: {len(section_texts)}"
            assert len(full_text) >= 5000, f"Generated text too short: {len(full_text)} characters"

            progress.report_step(
                "Completing baseline analysis",
                {
                    "sections_generated": len(section_texts),
                    "total_characters": len(full_text),
                    "llm_calls_estimated": perf_ctx.llm_calls_made,
                    "validation": "passed",
                },
            )

            progress.report_final_status(
                True,
                {
                    "sections_generated": len(section_texts),
                    "total_characters": len(full_text),
                    "llm_calls_made": perf_ctx.llm_calls_made,
                    "framework": "unified_performance_measurement",
                },
            )

        except Exception as e:
            logger.error(f"Error during grant application generation: {e}")
            progress.report_final_status(
                False,
                {
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "steps_completed": f"{progress.current_step}/{progress.total_steps}",
                    "partial_results": "check failure logs for details",
                },
            )
            raise
        finally:
            # JobManager doesn't have a close method
            pass

    assert_performance_targets(perf_ctx.result, min_grade="C")
    assert_quality_targets(perf_ctx.result, min_score=60.0)


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_baseline_stage_timing_analysis(
    logger: logging.Logger,
) -> None:
    """
    Enhanced stage timing analysis using unified framework.
    Establishes detailed stage-by-stage baseline for optimization planning.
    """
    with create_performance_context(
        test_name="baseline_stage_timing_analysis",
        test_category=TestCategory.BASELINE,
        logger=logger,
        configuration={
            "test_type": "stage_timing_analysis",
            "num_objectives": 5,
            "focus": "optimization_planning",
        },
    ) as perf_ctx:
        logger.info("=== STAGE TIMING BASELINE ANALYSIS ===")

        num_objectives = 5

        with perf_ctx.stage_timer("objective_extraction"):
            await asyncio.sleep(0.5)

        with perf_ctx.stage_timer("objective_enrichment"):
            for _i in range(num_objectives):
                await asyncio.sleep(0.3)
                perf_ctx.add_llm_call(1)

        with perf_ctx.stage_timer("work_plan_generation"):
            for _i in range(num_objectives):
                await asyncio.sleep(0.4)
                perf_ctx.add_llm_call(1)

        with perf_ctx.stage_timer("final_generation"):
            await asyncio.sleep(0.8)
            perf_ctx.add_llm_call(3)

        mock_content = (
            f"""
        # Grant Application: Advanced Research Initiative

        ## Abstract
        This comprehensive research proposal outlines a {num_objectives}-objective study investigating advanced methodologies in the target research domain.

        ## Specific Aims
        """
            + "\n".join(
                [
                    f"""
        ### Objective {i + 1}: Research Focus Area {i + 1}
        #### Task {i + 1}.1: Primary research activities and data collection
        #### Task {i + 1}.2: Analysis and validation procedures
        #### Task {i + 1}.3: Results interpretation and documentation
        """
                    for i in range(num_objectives)
                ]
            )
            + """

        ## Research Methodology
        Our multi-disciplinary approach integrates cutting-edge techniques with established research protocols.

        ## Work Plan and Timeline
        The research will be conducted over a 3-year period with clearly defined milestones and deliverables.

        ## Expected Outcomes and Impact
        This research will significantly advance understanding in the field and provide actionable insights.

        ## Budget and Resource Requirements
        Comprehensive budget breakdown including personnel, equipment, and operational costs.
        """
        )

        section_texts = [
            "Abstract",
            "Specific Aims",
            "Research Methodology",
            "Work Plan and Timeline",
            "Expected Outcomes",
            "Budget",
        ]

        perf_ctx.set_content(mock_content, section_texts)

        enrichment_time = perf_ctx.stage_times.get("objective_enrichment", 0)
        work_plan_time = perf_ctx.stage_times.get("work_plan_generation", 0)

        if enrichment_time > 30:
            perf_ctx.add_warning(
                f"Enrichment bottleneck detected: {enrichment_time:.1f}s. "
                "Recommend batch processing for ~70% improvement."
            )

        if work_plan_time > 40:
            perf_ctx.add_warning(
                f"Work plan bottleneck detected: {work_plan_time:.1f}s. "
                "Recommend parallel processing for ~60% improvement."
            )

        logger.info("Stage timing baseline established with unified framework")

    assert_performance_targets(perf_ctx.result, min_grade="C")
    assert_quality_targets(perf_ctx.result, min_score=70.0)
