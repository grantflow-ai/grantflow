import logging
from os import environ

import pytest

from src.db.tables import GrantTemplate
from src.rag.grant_format.generate_format import generate_grant_format


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_generate_application_draft(logger: logging.Logger, grant_format: GrantTemplate) -> None:
    logger.info("Running end-to-end test for generating a grant format")
    await generate_grant_format(template_id=str(grant_format.id))
