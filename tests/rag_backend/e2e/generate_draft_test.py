import logging
from os import environ
from uuid import UUID

import pytest
from sanic_testing.testing import SanicASGITestClient

from tests.conftest import RESULTS_FOLDER


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_generate_application_draft(
    logger: logging.Logger,
    full_grant_application_id: UUID,
    asgi_client: SanicASGITestClient,
) -> None:
    logger.info("Running end-to-end test for documents retrieval")
    _, response = await asgi_client.post(f"/{full_grant_application_id}/generate-draft", data={})
    result_file = RESULTS_FOLDER / f"generate_draft_{full_grant_application_id}.json"
    result_file.write_text(response.text)
