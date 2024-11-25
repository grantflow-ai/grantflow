import logging
from datetime import UTC, datetime
from os import environ
from pathlib import Path

import pytest

from src.rag_backend.application_draft_generation.research_plan import handle_research_plan_text_generation
from src.rag_backend.dto import DraftGenerationRequest
from tests.indexer.e2e.utils import load_settings_and_set_env


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_research_plan_text_generation(
    logger: logging.Logger,
    generation_request: DraftGenerationRequest,
) -> None:
    load_settings_and_set_env(logger)

    logger.info("Running end-to-end test for research plan text generation")
    result = await handle_research_plan_text_generation(
        application_id=generation_request["application_id"],
        workspace_id=generation_request["workspace_id"],
        research_aims=generation_request["research_aims"],
        ticket_id="test_ticket_id",
    )
    logger.info("Generated research plan text: %s", result)
    result_file_path = (
        Path(__file__).parent
        / "results"
        / f"{handle_research_plan_text_generation.__name__}_result_{datetime.now(tz=UTC).isoformat()}.md"
    )
    result_file_path.write_text(result.strip())
