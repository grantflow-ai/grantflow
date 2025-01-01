import logging
from os import environ

import pytest

from src.db.tables import GrantFormat
from src.rag.grant_format.generate_format import generate_grant_format


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_generate_application_draft(logger: logging.Logger, grant_format: GrantFormat) -> None:
    logger.info("Running end-to-end test for generating a grant format")
    await generate_grant_format(format_id=str(grant_format.id))
