import logging
import re
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


async def create_mock_job_manager_for_e2e(session_maker: Any, grant_application_id: UUID) -> JobManager:
    """Create a JobManager for e2e tests with mocked pubsub."""
    job_manager = JobManager(session_maker)
    await job_manager.create_grant_application_job(grant_application_id=grant_application_id, total_stages=5)
    return job_manager


@e2e_test(category=E2ETestCategory.E2E_FULL, timeout=1800)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_generate_full_application_text(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running end-to-end test for generating a full grant application text format")
    start_time = datetime.now(UTC)

    application_uuid = UUID(melanoma_alliance_full_application_id)
    job_manager = await create_mock_job_manager_for_e2e(async_session_maker, application_uuid)
    text, section_texts = await grant_application_text_generation_pipeline_handler(
        grant_application_id=application_uuid,
        session_maker=async_session_maker,
        job_manager=job_manager,
    )

    execution_time = (datetime.now(UTC) - start_time).total_seconds()
    logger.info("Generation completed in %.2f seconds (%.2f minutes)", execution_time, execution_time / 60)

    assert text, "Generated text should not be empty"
    assert len(text) > 1000, f"Generated text is too short: {len(text)} characters"

    assert "# " in text, "Generated text should have at least one markdown header"

    assert section_texts, "Section texts should not be empty"
    assert len(section_texts) > 0, "There should be at least one section"

    for section_title, section_content in section_texts.items():
        assert isinstance(section_title, str), f"Section title should be a string: {section_title}"
        assert isinstance(section_content, str), f"Section content should be a string: {section_content}"
        assert len(section_content) > 0, f"Section content for '{section_title}' should not be empty"

        assert section_content in text, f"Section content for '{section_title}' not found in the full text"

    for section_title in section_texts:
        pattern = re.compile(rf"#+ .*{re.escape(section_title)}.*", re.IGNORECASE)
        assert pattern.search(text), f"Section title '{section_title}' not found in headers"

    result_folder = RESULTS_FOLDER / melanoma_alliance_full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(UTC).timestamp()
    text_result_file = result_folder / f"full_text_result_text_{timestamp}.md"
    text_result_file.write_text(text)

    sections_result_file = result_folder / f"full_text_result_section_texts_{timestamp}.json"
    sections_result_file.write_bytes(serialize(section_texts))

    logger.info("Generated application with %d sections and %d characters", len(section_texts), len(text))
    logger.info("Full text saved to %s", text_result_file)
    logger.info("Section texts saved to %s", sections_result_file)
