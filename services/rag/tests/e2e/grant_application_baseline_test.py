"""Baseline performance tests for grant application generation pipeline."""

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


def analyze_pipeline_performance(timing_data: dict[str, Any]) -> dict[str, Any]:
    """Analyze detailed pipeline performance metrics."""
    stages = timing_data.get("stages", {})

    # Calculate stage percentages
    total_time = timing_data.get("total_time", 0)
    stage_percentages = {}
    if total_time > 0:
        for stage, time_val in stages.items():
            stage_percentages[stage] = round((time_val / total_time) * 100, 1)

    # Identify bottlenecks (stages taking >20% of total time)
    bottlenecks = {
        stage: pct for stage, pct in stage_percentages.items()
        if pct > 20
    }

    # Performance scoring
    performance_scores = {
        "total_time_score": max(0, 100 - (total_time / 300) * 100),  # 300s = 0 points
        "work_plan_efficiency": max(0, 100 - (stages.get("work_plan_generation", 0) / 120) * 100),
        "section_generation_efficiency": max(0, 100 - (stages.get("section_text_generation", 0) / 180) * 100),
        "enrichment_efficiency": max(0, 100 - (stages.get("objective_enrichment", 0) / 60) * 100),
    }

    overall_score = sum(performance_scores.values()) / len(performance_scores)

    return {
        "stage_percentages": stage_percentages,
        "bottlenecks": bottlenecks,
        "performance_scores": performance_scores,
        "overall_performance_score": round(overall_score, 2),
        "is_work_plan_bottleneck": stage_percentages.get("work_plan_generation", 0) > 25,
        "is_enrichment_bottleneck": stage_percentages.get("objective_enrichment", 0) > 20,
        "sequential_processing_detected": stages.get("work_plan_generation", 0) > stages.get("section_text_generation", 0),
    }


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_grant_application_baseline_performance(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Comprehensive baseline performance test for grant application generation."""

    # Record detailed timing
    overall_start = datetime.now(UTC)

    logger.info("Starting baseline performance test for grant application generation")
    logger.info("Using melanoma alliance application: %s", melanoma_alliance_full_application_id)

    try:
        application_uuid = UUID(melanoma_alliance_full_application_id)
        job_manager = await create_mock_job_manager_for_baseline(async_session_maker, application_uuid)

        # Run the full pipeline
        full_text, section_texts = await grant_application_text_generation_pipeline_handler(
            grant_application_id=application_uuid,
            session_maker=async_session_maker,
            job_manager=job_manager,
        )

        overall_time = (datetime.now(UTC) - overall_start).total_seconds()

        # Analyze results
        performance_analysis = analyze_pipeline_performance({
            "total_time": overall_time,
            "stages": result.get("timing", {}),
        })

        # Compile comprehensive results
        baseline_results = {
            "test_metadata": {
                "test_name": "grant_application_baseline_performance",
                "timestamp": datetime.now(UTC).isoformat(),
                "configuration": {
                    "objectives_count": len(test_data["research_objectives"]),
                    "total_tasks_count": sum(len(obj["research_tasks"]) for obj in test_data["research_objectives"]),
                    "sections_count": len(test_data["grant_template"]["grant_sections"]),
                    "total_word_limit": sum(s.get("max_words", 0) for s in test_data["grant_template"]["grant_sections"]),
                },
            },
            "performance": {
                "total_time_seconds": round(overall_time, 2),
                "stage_timing": result.get("timing", {}),
                "analysis": performance_analysis,
            },
            "quality": {
                "generation_success": result.get("success", False),
                "sections_generated": len(result.get("sections", [])),
                "work_plan_components": len(result.get("work_plan", [])),
                "errors": result.get("errors", []),
            },
            "resource_usage": {
                "estimated_llm_calls": estimate_llm_calls(test_data),
                "estimated_tokens": estimate_token_usage(result),
            },
            "baseline_targets": {
                "total_time_target": 300,  # 5 minutes
                "work_plan_target": 120,   # 2 minutes
                "section_generation_target": 180,  # 3 minutes
                "enrichment_target": 60,   # 1 minute
            },
        }

        # Save detailed baseline results
        folder = RESULTS_FOLDER / "baselines"
        folder.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        results_file = folder / f"grant_application_baseline_{timestamp}.json"
        results_file.write_bytes(serialize(baseline_results))

        # Log comprehensive summary
        logger.info(
            "Baseline Test Complete - Total: %.1fs, Score: %.1f%%",
            overall_time,
            performance_analysis["overall_performance_score"],
        )

        logger.info(
            "Stage Breakdown - WorkPlan: %.1fs (%.1f%%), Enrichment: %.1fs (%.1f%%), Sections: %.1fs (%.1f%%)",
            result.get("timing", {}).get("work_plan_generation", 0),
            performance_analysis["stage_percentages"].get("work_plan_generation", 0),
            result.get("timing", {}).get("objective_enrichment", 0),
            performance_analysis["stage_percentages"].get("objective_enrichment", 0),
            result.get("timing", {}).get("section_text_generation", 0),
            performance_analysis["stage_percentages"].get("section_text_generation", 0),
        )

        # Log bottleneck analysis
        if performance_analysis["bottlenecks"]:
            bottleneck_info = ", ".join([f"{k}: {v}%" for k, v in performance_analysis["bottlenecks"].items()])
            logger.info("Performance Bottlenecks Identified: %s", bottleneck_info)

        # Assertions for baseline expectations
        assert result.get("success", False), "Pipeline should complete successfully"
        assert overall_time < 900, f"Total time {overall_time:.1f}s exceeds 15min hard limit"
        assert len(result.get("sections", [])) >= 3, "Should generate at least 3 sections"

        # Log optimization opportunities
        if performance_analysis["is_work_plan_bottleneck"]:
            logger.info("OPTIMIZATION OPPORTUNITY: Work plan generation is a major bottleneck")

        if performance_analysis["sequential_processing_detected"]:
            logger.info("OPTIMIZATION OPPORTUNITY: Sequential processing pattern detected")

        return baseline_results

    except Exception:
        logger.exception("Baseline test failed with exception")
        raise


def estimate_llm_calls(test_data: dict[str, Any]) -> dict[str, int]:
    """Estimate the number of LLM calls for the test configuration."""
    objectives = test_data["research_objectives"]
    sections = test_data["grant_template"]["grant_sections"]

    return {
        "relationship_extraction": 1,
        "objective_enrichment": len(objectives) * 2,  # enrichment + evaluation
        "work_plan_generation": len(objectives) + sum(len(obj["research_tasks"]) for obj in objectives),
        "section_generation": len(sections) * 2,  # generation + evaluation
        "estimated_total": (
            1 +  # relationship extraction
            len(objectives) * 2 +  # enrichment
            len(objectives) + sum(len(obj["research_tasks"]) for obj in objectives) +  # work plan
            len(sections) * 2  # sections
        ),
    }


def estimate_token_usage(result: dict[str, Any]) -> dict[str, Any]:
    """Estimate token usage from result content."""
    sections = result.get("sections", [])
    work_plan = result.get("work_plan", [])

    # Rough token estimation (4 chars per token)
    total_output_chars = 0
    for section in sections:
        total_output_chars += len(section.get("content", ""))

    for component in work_plan:
        total_output_chars += len(component.get("text", ""))

    return {
        "estimated_output_tokens": total_output_chars // 4,
        "sections_generated": len(sections),
        "work_plan_components": len(work_plan),
    }


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_work_plan_generation_baseline(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Focused baseline test for work plan generation performance."""
    from services.rag.src.grant_application.generate_work_plan_text import generate_work_plan_text

    test_data = create_test_application_data()

    start_time = datetime.now(UTC)

    work_plan_result = await generate_work_plan_text(
        grant_application_id=test_data["grant_application_id"],
        research_objectives=test_data["research_objectives"],
        session_maker=async_session_maker,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    # Analyze work plan specific metrics
    objectives_count = len(test_data["research_objectives"])
    tasks_count = sum(len(obj["research_tasks"]) for obj in test_data["research_objectives"])

    results = {
        "work_plan_baseline": {
            "total_time": round(elapsed_time, 2),
            "objectives_processed": objectives_count,
            "tasks_processed": tasks_count,
            "time_per_objective": round(elapsed_time / objectives_count, 2) if objectives_count > 0 else 0,
            "time_per_task": round(elapsed_time / tasks_count, 2) if tasks_count > 0 else 0,
            "sequential_processing_time": elapsed_time,  # Current implementation is sequential
            "components_generated": len(work_plan_result),
        }
    }

    logger.info(
        "Work Plan Baseline - Total: %.1fs, Objectives: %d, Tasks: %d, Per-Objective: %.1fs",
        elapsed_time,
        objectives_count,
        tasks_count,
        elapsed_time / objectives_count if objectives_count > 0 else 0,
    )

    # Save focused results
    folder = RESULTS_FOLDER / "baselines"
    folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    results_file = folder / f"work_plan_baseline_{timestamp}.json"
    results_file.write_bytes(serialize(results))

    assert elapsed_time < 240, f"Work plan generation {elapsed_time:.1f}s exceeds 4min limit"
    assert len(work_plan_result) >= objectives_count, "Should generate at least one component per objective"
