import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.rag.grant_application.handler import handle_generate_grant_application_text
from tests.conftest import RESULTS_FOLDER


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_full_application_text(
    logger: logging.Logger,
    full_application_id: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running end-to-end test for generating a full grant application text format")

    result = await handle_generate_grant_application_text(
        application_id=full_application_id,
    )

    result_folder = RESULTS_FOLDER / full_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"full_text_result{datetime.now(UTC).timestamp()}.md"
    result_file.write_text(result)
