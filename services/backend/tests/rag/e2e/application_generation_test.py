import logging
import re
from datetime import UTC, datetime
from os import environ
from typing import Any
from unittest.mock import AsyncMock

import pytest
from packages.shared_utils.src.serialization import serialize
from services.backend.src.rag.grant_application.handler import grant_application_text_generation_pipeline_handler
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER


@pytest.mark.timeout(60 * 30)
@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_full_application_text(
    logger: logging.Logger,
    melanoma_alliance_full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running end-to-end test for generating a full grant application text format")
    start_time = datetime.now(UTC)

    text, section_texts = await grant_application_text_generation_pipeline_handler(
        application_id=melanoma_alliance_full_application_id,
        message_handler=AsyncMock(),
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
