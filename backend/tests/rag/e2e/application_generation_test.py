import logging
from datetime import UTC, datetime
from os import environ
from typing import Any
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.rag.grant_application.handler import grant_application_text_generation_pipeline_handler
from src.utils.serialization import serialize
from tests.test_utils import RESULTS_FOLDER


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

    text, section_texts = await grant_application_text_generation_pipeline_handler(
        application_id=melanoma_alliance_full_application_id,
        message_handler=AsyncMock(),
    )

    result_folder = RESULTS_FOLDER / melanoma_alliance_full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"full_text_result_text_{datetime.now(UTC).timestamp()}.md"
    result_file.write_text(text)
    result_file = result_folder / f"full_text_result_section_texts_{datetime.now(UTC).timestamp()}.json"
    result_file.write_bytes(serialize(section_texts))
