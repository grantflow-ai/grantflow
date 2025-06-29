"""
Comprehensive test suite for the grant application generation pipeline.
Tests baseline performance, optimizations, and quality metrics.
"""

import asyncio
import logging
import time
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler
from services.rag.src.grant_template.handler import extract_and_enrich_sections
from services.rag.src.utils.job_manager import JobManager
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import PerformanceTestContext


@e2e_test(category=E2ETestCategory.E2E_FULL, timeout=1800)
async def test_grant_application_baseline_performance(
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """
    Baseline performance test for grant application generation.
    Establishes performance benchmarks for the complete pipeline.
    """
    with PerformanceTestContext(
        test_name="grant_application_baseline",
        test_category=TestCategory.GRANT_APPLICATION,
        logger=logger,
        configuration={
            "test_type": "baseline",
            "application_id": melanoma_alliance_full_application_id,
        },
    ) as perf_ctx:
        logger.info("=== GRANT APPLICATION BASELINE PERFORMANCE TEST ===")

        with patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock) as mock_publish:
            job_manager = JobManager(async_session_maker)

            with perf_ctx.stage_timer("job_creation"):
                await job_manager.create_grant_application_job(
                    grant_application_id=UUID(melanoma_alliance_full_application_id), total_stages=5
                )

            with perf_ctx.stage_timer("complete_pipeline"):
                start_time = time.time()

                text, section_texts = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=UUID(melanoma_alliance_full_application_id),
                    session_maker=async_session_maker,
                    job_manager=job_manager,
                )

                end_time = time.time()
                pipeline_duration = end_time - start_time

            perf_ctx.configuration.update(
                {
                    "pipeline_duration": pipeline_duration,
                    "sections_generated": len(section_texts),
                    "total_content_length": len(text),
                    "notifications_sent": mock_publish.call_count,
                }
            )

            perf_ctx.set_content(text, section_texts)

            logger.info("=== PERFORMANCE METRICS ===")
            logger.info("Pipeline duration: %.2fs (%.2f minutes)", pipeline_duration, pipeline_duration / 60)
            logger.info("Sections generated: %d", len(section_texts))
            logger.info("Total content length: %d characters", len(text))
            logger.info("Notifications sent: %d", mock_publish.call_count)

            assert pipeline_duration < 1200, f"Pipeline took too long: {pipeline_duration}s"
            assert len(section_texts) >= 3, f"Too few sections generated: {len(section_texts)}"
            assert len(text) >= 1000, f"Generated text too short: {len(text)} characters"


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_grant_application_smoke(
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """
    Quick smoke test for grant application generation.
    Verifies basic functionality with minimal sections.
    """
    with PerformanceTestContext(
        test_name="grant_application_smoke",
        test_category=TestCategory.GRANT_APPLICATION,
        logger=logger,
        configuration={
            "test_type": "smoke_test",
            "application_id": melanoma_alliance_full_application_id,
        },
    ):
        logger.info("=== GRANT APPLICATION SMOKE TEST ===")

        with patch("services.rag.src.grant_application.generate_section_text.generate_section_text") as mock_generate:
            mock_generate.return_value = "Test section content for smoke test."

            with patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock):
                job_manager = JobManager(async_session_maker)
                await job_manager.create_grant_application_job(
                    grant_application_id=UUID(melanoma_alliance_full_application_id), total_stages=2
                )

                start_time = time.time()

                text, section_texts = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=UUID(melanoma_alliance_full_application_id),
                    session_maker=async_session_maker,
                    job_manager=job_manager,
                )

                duration = time.time() - start_time

                logger.info("Smoke test completed in %.2fs", duration)

                assert text, "Generated text should not be empty"
                assert len(text) > 0, "Generated text should have content"
                assert duration < 300, f"Smoke test took too long: {duration}s"


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=900)
async def test_grant_application_optimizations(
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """
    Test various optimization strategies for grant application generation.
    Compares performance with different configurations.
    """
    with PerformanceTestContext(
        test_name="grant_application_optimizations",
        test_category=TestCategory.GRANT_APPLICATION,
        logger=logger,
        configuration={
            "test_type": "optimization_comparison",
            "application_id": melanoma_alliance_full_application_id,
        },
    ) as perf_ctx:
        logger.info("=== GRANT APPLICATION OPTIMIZATION TEST ===")

        optimization_results = {}

        with (
            perf_ctx.stage_timer("baseline_config"),
            patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        ):
            job_manager = JobManager(async_session_maker)
            await job_manager.create_grant_application_job(
                grant_application_id=UUID(melanoma_alliance_full_application_id), total_stages=3
            )

            start_time = time.time()

            with patch("services.rag.src.grant_application.generate_section_text.generate_section_text") as mock_gen:
                mock_gen.return_value = "Standard section content " * 100

                text, sections = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=UUID(melanoma_alliance_full_application_id),
                    session_maker=async_session_maker,
                    job_manager=job_manager,
                )

            baseline_time = time.time() - start_time
            optimization_results["baseline"] = {
                "duration": baseline_time,
                "sections": len(sections),
                "content_length": len(text),
            }

        with (
            perf_ctx.stage_timer("parallel_generation"),
            patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        ):
            job_manager = JobManager(async_session_maker)
            await job_manager.create_grant_application_job(
                grant_application_id=UUID(melanoma_alliance_full_application_id), total_stages=3
            )

            start_time = time.time()

            async def mock_parallel_gen(*args: Any, **kwargs: Any) -> str:
                await asyncio.sleep(0.1)
                return "Parallel section content " * 100

            with patch(
                "services.rag.src.grant_application.generate_section_text.generate_section_text",
                side_effect=mock_parallel_gen,
            ):
                text, sections = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=UUID(melanoma_alliance_full_application_id),
                    session_maker=async_session_maker,
                    job_manager=job_manager,
                )

            parallel_time = time.time() - start_time
            optimization_results["parallel"] = {
                "duration": parallel_time,
                "sections": len(sections),
                "content_length": len(text),
                "speedup": baseline_time / parallel_time if parallel_time > 0 else 1,
            }

        with (
            perf_ctx.stage_timer("cached_templates"),
            patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        ):
            job_manager = JobManager(async_session_maker)
            await job_manager.create_grant_application_job(
                grant_application_id=UUID(melanoma_alliance_full_application_id), total_stages=3
            )

            start_time = time.time()

            with patch("services.rag.src.grant_template.handler.extract_and_enrich_sections") as mock_extract:
                mock_extract.return_value = []

                text, sections = await grant_application_text_generation_pipeline_handler(
                    grant_application_id=UUID(melanoma_alliance_full_application_id),
                    session_maker=async_session_maker,
                    job_manager=job_manager,
                )

            cached_time = time.time() - start_time
            optimization_results["cached"] = {
                "duration": cached_time,
                "sections": len(sections),
                "speedup": baseline_time / cached_time if cached_time > 0 else 1,
            }

        logger.info("=== OPTIMIZATION RESULTS ===")
        for strategy, results in optimization_results.items():
            logger.info("%s: %.2fs duration, %.2fx speedup", strategy, results["duration"], results.get("speedup", 1.0))

        perf_ctx.configuration["optimization_results"] = optimization_results

        assert optimization_results["parallel"]["speedup"] > 1.0, "Parallel generation should be faster"
        assert optimization_results["cached"]["speedup"] > 1.5, "Cached templates should provide significant speedup"


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=600)
async def test_grant_application_quality_metrics(
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """
    Test quality metrics for generated grant applications.
    Evaluates content coherence, completeness, and relevance.
    """
    with PerformanceTestContext(
        test_name="grant_application_quality",
        test_category=TestCategory.GRANT_APPLICATION,
        logger=logger,
        configuration={
            "test_type": "quality_assessment",
            "application_id": melanoma_alliance_full_application_id,
        },
    ) as perf_ctx:
        logger.info("=== GRANT APPLICATION QUALITY TEST ===")

        with patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock):
            job_manager = JobManager(async_session_maker)
            await job_manager.create_grant_application_job(
                grant_application_id=UUID(melanoma_alliance_full_application_id), total_stages=3
            )

            text, section_texts = await grant_application_text_generation_pipeline_handler(
                grant_application_id=UUID(melanoma_alliance_full_application_id),
                session_maker=async_session_maker,
                job_manager=job_manager,
            )

            quality_metrics = {
                "total_length": len(text),
                "section_count": len(section_texts),
                "avg_section_length": sum(len(s) for s in section_texts.values()) / len(section_texts)
                if section_texts
                else 0,
                "has_headers": "# " in text,
                "has_structure": len([line for line in text.split("\n") if line.startswith("#")]) > 1,
                "completeness_score": min(len(text) / 5000, 1.0) * 100,
            }

            section_titles = list(section_texts.keys())
            quality_metrics["unique_sections"] = len(set(section_titles))
            quality_metrics["section_diversity"] = (
                quality_metrics["unique_sections"] / len(section_titles) if section_titles else 0
            )

            logger.info("=== QUALITY METRICS ===")
            for metric, value in quality_metrics.items():
                logger.info("%s: %s", metric, value)

            perf_ctx.configuration["quality_metrics"] = quality_metrics
            perf_ctx.set_content(text, section_texts)

            assert quality_metrics["total_length"] > 1000, "Generated text too short"
            assert quality_metrics["section_count"] >= 1, "Should have at least one section"
            assert quality_metrics["has_headers"], "Generated text should have markdown headers"
            assert quality_metrics["has_structure"], "Generated text should have multiple sections"
            assert quality_metrics["completeness_score"] > 50, "Content completeness score too low"
            assert quality_metrics["section_diversity"] > 0.8, "Sections should be diverse"


@e2e_test(category=E2ETestCategory.E2E_FULL, timeout=1800)
async def test_grant_template_extraction_and_enrichment(
    logger: logging.Logger,
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """
    Test grant template extraction and enrichment from CFP sources.
    """
    from uuid import uuid4

    from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
    from services.rag.tests.e2e.test_utils import create_rag_sources_from_cfp_file

    with PerformanceTestContext(
        test_name="grant_template_extraction",
        test_category=TestCategory.GRANT_TEMPLATE,
        logger=logger,
        configuration={
            "test_type": "template_extraction",
            "cfp_name": "melanoma_alliance",
        },
    ) as perf_ctx:
        logger.info("=== GRANT TEMPLATE EXTRACTION TEST ===")

        template_id = str(uuid4())
        with perf_ctx.stage_timer("create_sources"):
            source_ids = await create_rag_sources_from_cfp_file(
                cfp_file_name="melanoma_alliance.md",
                grant_template_id=template_id,
                session_maker=async_session_maker,
                grant_application_id=melanoma_alliance_full_application_id,
            )

        with perf_ctx.stage_timer("extract_cfp_data"):
            extraction_result = await handle_extract_cfp_data_from_rag_sources(
                source_ids=source_ids,
                organization_mapping=organization_mapping,
                session_maker=async_session_maker,
            )

        with perf_ctx.stage_timer("enrich_sections"):
            mock_job_manager = AsyncMock()

            sections = await extract_and_enrich_sections(
                cfp_content=extraction_result["content"],
                cfp_subject=extraction_result["cfp_subject"],
                organization=None,
                parent_id=uuid4(),
                job_manager=mock_job_manager,
            )

        results = {
            "source_count": len(source_ids),
            "extracted_sections": len(extraction_result.get("content", [])),
            "enriched_sections": len(sections),
            "organization_identified": extraction_result.get("organization_id") is not None,
            "has_subject": bool(extraction_result.get("cfp_subject")),
        }

        logger.info("=== EXTRACTION RESULTS ===")
        for metric, value in results.items():
            logger.info("%s: %s", metric, value)

        perf_ctx.configuration["extraction_results"] = results

        assert results["source_count"] > 0, "Should create at least one source"
        assert results["extracted_sections"] > 0, "Should extract at least one section"
        assert results["enriched_sections"] > 0, "Should enrich at least one section"
        assert results["has_subject"], "Should identify CFP subject"
