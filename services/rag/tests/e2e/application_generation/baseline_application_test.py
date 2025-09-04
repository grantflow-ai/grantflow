import logging
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler


def create_mock_job_manager() -> AsyncMock:
    mock_job_manager = AsyncMock()
    mock_job_manager.create_grant_application_job = AsyncMock()
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    return mock_job_manager


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_APPLICATION, timeout=1800)
async def test_generate_baseline_application_text(
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
) -> None:
    performance_context.set_metadata("test_type", "baseline_application_generation")
    performance_context.set_metadata("application_type", "melanoma_alliance")
    performance_context.set_metadata("uses_existing_data", True)

    logger.info("📄 Generating baseline application text using existing melanoma research")

    performance_context.start_stage("generate_full_application_text")

    mock_job_manager = create_mock_job_manager()

    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
        result = await grant_application_text_generation_pipeline_handler(
            grant_application_id=UUID(melanoma_alliance_full_application_id),
            session_maker=async_session_maker,
            job_manager=mock_job_manager,
        )
        assert result is not None, "Grant application generation should not return None"
        text, section_texts = result

    performance_context.end_stage()

    performance_context.start_stage("validate_baseline_content")

    assert text, "Generated text should not be empty"
    assert len(text) > 1000, f"Generated text too short: {len(text)} characters"
    assert "# " in text, "Generated text should have at least one markdown header"

    assert section_texts, "Section texts should not be empty"
    assert len(section_texts) > 0, "There should be at least one section"

    for section_title, section_content in section_texts.items():
        assert isinstance(section_title, str), f"Section title should be a string: {section_title}"
        assert isinstance(section_content, str), f"Section content should be a string: {section_content}"
        assert len(section_content) > 0, f"Section content for '{section_title}' should not be empty"
        assert section_content in text, f"Section content for '{section_title}' not found in the full text"

    melanoma_terms = ["melanoma", "cancer", "immunotherapy", "treatment", "metastases"]
    found_terms = [term for term in melanoma_terms if term.lower() in text.lower()]
    assert len(found_terms) >= 3, f"Should contain melanoma research terminology, found: {found_terms}"

    word_count = len(text.split())
    assert word_count > 200, f"Generated text should have substantial content: {word_count} words"

    performance_context.end_stage()

    character_count = len(text)
    section_count = len(section_texts)
    avg_section_length = sum(len(content) for content in section_texts.values()) / len(section_texts)

    performance_context.set_metadata("generated_word_count", word_count)
    performance_context.set_metadata("generated_character_count", character_count)
    performance_context.set_metadata("section_count", section_count)
    performance_context.set_metadata("avg_section_length", avg_section_length)
    performance_context.set_metadata("melanoma_terms_found", found_terms)

    logger.info(
        "✅ Baseline application generated successfully",
        extra={
            "words": word_count,
            "characters": character_count,
            "sections": section_count,
            "avg_section_length": f"{avg_section_length:.0f}",
            "melanoma_terms": len(found_terms),
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_APPLICATION, timeout=900)
async def test_application_structure_validation(
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
) -> None:
    performance_context.set_metadata("test_type", "structure_validation")
    performance_context.set_metadata("validation_focus", "markdown_structure")

    logger.info("🔍 Validating application structure and formatting")

    performance_context.start_stage("generate_application_for_validation")

    mock_job_manager = create_mock_job_manager()

    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
        result = await grant_application_text_generation_pipeline_handler(
            grant_application_id=UUID(melanoma_alliance_full_application_id),
            session_maker=async_session_maker,
            job_manager=mock_job_manager,
        )
        assert result is not None, "Grant application generation should not return None"
        text, section_texts = result

    performance_context.end_stage()

    performance_context.start_stage("validate_markdown_structure")

    lines = text.split("\n")
    header_lines = [line for line in lines if line.startswith("#")]
    assert len(header_lines) >= 3, f"Should have multiple headers, found: {len(header_lines)}"

    h1_count = len([line for line in header_lines if line.startswith("# ") and not line.startswith("## ")])
    h2_count = len([line for line in header_lines if line.startswith("## ") and not line.startswith("### ")])
    assert h1_count >= 1, "Should have at least one main header (H1)"
    assert h2_count >= 1, "Should have at least one sub-header (H2)"

    non_empty_lines = [line for line in lines if line.strip()]
    content_lines = [line for line in non_empty_lines if not line.startswith("#")]
    assert len(content_lines) >= 20, f"Should have substantial content lines: {len(content_lines)}"

    for section_title, section_content in section_texts.items():
        section_lines = section_content.split("\n")
        section_non_empty = [line for line in section_lines if line.strip()]
        assert len(section_non_empty) >= 3, f"Section '{section_title}' should have multiple lines of content"

    performance_context.end_stage()

    performance_context.set_metadata("header_count", len(header_lines))
    performance_context.set_metadata("h1_count", h1_count)
    performance_context.set_metadata("h2_count", h2_count)
    performance_context.set_metadata("content_lines", len(content_lines))

    logger.info(
        "✅ Application structure validation passed",
        extra={
            "total_headers": len(header_lines),
            "h1_headers": h1_count,
            "h2_headers": h2_count,
            "content_lines": len(content_lines),
        },
    )
