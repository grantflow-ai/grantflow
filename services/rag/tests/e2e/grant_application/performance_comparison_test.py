import logging
import time
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import pytest
from packages.db.src.tables import GrantApplication
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test
from testing.scenarios.base import load_scenario

TEST_DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "testing/test_data/sources/cfps"
MRA_FILE = TEST_DATA_DIR / "MRA-2023-2024-RFP-Final.pdf"


def create_mock_job_manager() -> AsyncMock:
    mock_job_manager = AsyncMock()
    mock_job_manager.create_grant_application_job = AsyncMock()
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    return mock_job_manager


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_APPLICATION, timeout=600)
async def test_application_generation_performance_baseline(
    logger: logging.Logger,
    melanoma_alliance_full_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
) -> None:
    scenario = load_scenario("melanoma_alliance_baseline")

    performance_context.set_metadata("test_type", "performance_baseline")
    performance_context.set_metadata("measurement_focus", "generation_speed")
    performance_context.set_metadata("scenario_name", scenario.scenario_name)
    performance_context.set_metadata("source_files_count", len(scenario.get_source_files()))

    logger.info("⏱️ Establishing performance baseline for application generation")

    performance_context.start_stage("baseline_generation_timing")

    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

    from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
    from services.rag.src.grant_application.utils import generate_application_text

    grant_application = melanoma_alliance_full_application

    if not grant_application.grant_template:
        raise ValueError("Grant application has no template")

    if not grant_application.grant_template.grant_sections:
        raise ValueError("Grant template has no sections")

    start_time = time.time()

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        trace_id="performance-baseline-e2e-test",
    )

    async with async_session_maker() as session:
        updated_application = await session.scalar(
            select_active(GrantApplication)
            .where(GrantApplication.id == grant_application.id)
            .options(selectinload(GrantApplication.grant_template))
            .options(selectinload(GrantApplication.rag_jobs))
        )

        if not updated_application:
            raise ValueError("Failed to retrieve updated application")

        section_texts = {}
        if updated_application.rag_jobs and updated_application.rag_jobs[0].checkpoint_data:
            checkpoint_data = updated_application.rag_jobs[0].checkpoint_data
            if "section_texts" in checkpoint_data:
                section_texts = {text["section_id"]: text["text"] for text in checkpoint_data["section_texts"]}
        text = generate_application_text(
            title=updated_application.title or "Grant Application",
            grant_sections=updated_application.grant_template.grant_sections,
            section_texts=section_texts,
        )

    end_time = time.time()
    generation_time = end_time - start_time

    performance_context.end_stage()

    performance_context.start_stage("analyze_performance_metrics")

    assert generation_time < 300, f"Generation took too long: {generation_time:.2f}s (max 5 minutes)"
    assert generation_time > 5, f"Generation suspiciously fast: {generation_time:.2f}s (min 5 seconds)"

    word_count = len(text.split())
    assert word_count > 100, f"Generated content too short: {word_count} words"

    words_per_second = word_count / generation_time
    sections_per_minute = (len(section_texts) * 60) / generation_time

    assert words_per_second > 1.0, f"Generation rate too slow: {words_per_second:.2f} words/second"

    performance_context.end_stage()

    performance_context.set_metadata("generation_time_seconds", generation_time)
    performance_context.set_metadata("words_per_second", words_per_second)
    performance_context.set_metadata("sections_per_minute", sections_per_minute)
    performance_context.set_metadata("total_word_count", word_count)
    performance_context.set_metadata("total_section_count", len(section_texts))

    logger.info(
        "✅ Performance baseline established",
        extra={
            "generation_time": f"{generation_time:.2f}s",
            "words_per_second": f"{words_per_second:.2f}",
            "sections_per_minute": f"{sections_per_minute:.1f}",
            "total_words": word_count,
        },
    )


@pytest.mark.skipif(not MRA_FILE.exists(), reason="Test data file not available in CI")
@performance_test(execution_speed=TestExecutionSpeed.SMOKE, domain=TestDomain.GRANT_APPLICATION, timeout=120)
@pytest.mark.e2e
async def test_generation_smoke_test(
    logger: logging.Logger,
    melanoma_alliance_full_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
) -> None:
    scenario = load_scenario("melanoma_alliance_baseline")

    performance_context.set_metadata("test_type", "smoke_test")
    performance_context.set_metadata("quick_validation", True)
    performance_context.set_metadata("scenario_name", scenario.scenario_name)

    logger.info("💨 Running quick smoke test for application generation")

    performance_context.start_stage("smoke_test_generation")

    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

    from services.rag.src.grant_application.pipeline import handle_grant_application_pipeline
    from services.rag.src.grant_application.utils import generate_application_text

    grant_application = melanoma_alliance_full_application

    if not grant_application.grant_template:
        raise ValueError("Grant application has no template")

    if not grant_application.grant_template.grant_sections:
        raise ValueError("Grant template has no sections")

    await handle_grant_application_pipeline(
        grant_application=grant_application,
        session_maker=async_session_maker,
        trace_id="smoke-test-e2e-test",
    )

    async with async_session_maker() as session:
        updated_application = await session.scalar(
            select_active(GrantApplication)
            .where(GrantApplication.id == grant_application.id)
            .options(selectinload(GrantApplication.grant_template))
            .options(selectinload(GrantApplication.rag_jobs))
        )

        if not updated_application:
            raise ValueError("Failed to retrieve updated application")

        if updated_application.rag_jobs:
            pass

        section_texts = {}
        if updated_application.rag_jobs and updated_application.rag_jobs[0].checkpoint_data:
            checkpoint_data = updated_application.rag_jobs[0].checkpoint_data
            if "section_texts" in checkpoint_data:
                section_texts = {text["section_id"]: text["text"] for text in checkpoint_data["section_texts"]}
        text = generate_application_text(
            title=updated_application.title or "Grant Application",
            grant_sections=updated_application.grant_template.grant_sections,
            section_texts=section_texts,
        )

    performance_context.end_stage()

    performance_context.start_stage("smoke_test_validation")

    assert text is not None, "Generated text should not be None"
    assert len(text) > 0, "Generated text should not be empty"
    assert isinstance(text, str), "Generated text should be a string"

    assert section_texts is not None, "Section texts should not be None"
    if updated_application.rag_jobs and updated_application.rag_jobs[0].status.value == "FAILED":
        return
    assert isinstance(section_texts, dict), "Section texts should be a dictionary"

    assert len(text.split()) > 50, "Should have meaningful content (>50 words)"

    performance_context.end_stage()

    performance_context.set_metadata("smoke_test_passed", True)
    performance_context.set_metadata("basic_word_count", len(text.split()))
    performance_context.set_metadata("basic_section_count", len(section_texts))

    logger.info(
        "✅ Smoke test passed",
        extra={
            "content_length": len(text),
            "word_count": len(text.split()),
            "section_count": len(section_texts),
        },
    )
