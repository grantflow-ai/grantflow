import logging
from datetime import UTC, datetime
from json import dumps
from os import environ
from pathlib import Path

import pytest

from src.rag_backend.application_draft_generation.research_aims import handle_research_aim_text_generation
from src.rag_backend.dto import DraftGenerationRequest, EnrichedResearchAimDTO
from tests.indexer.e2e.utils import load_settings_and_set_env


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_research_aim_text_generation(
    logger: logging.Logger,
    generation_request: DraftGenerationRequest,
) -> None:
    load_settings_and_set_env(logger)

    logger.info("Running end-to-end test for research aim text generation")
    result = await handle_research_aim_text_generation(
        application_id=generation_request["application_id"],
        research_aim=EnrichedResearchAimDTO(**generation_request["research_aims"][0], relations=[], aim_number=1),  # type: ignore[typeddict-item]
        workspace_id=generation_request["workspace_id"],
        ticket_id="test_ticket_id",
    )
    logger.info("Generated research aim text: %s", result)
    result_file_path = (
        Path(__file__).parent
        / "results"
        / f"{handle_research_aim_text_generation.__name__}_result_{datetime.now(tz=UTC).isoformat()}.json"
    )
    result_file_path.write_text(dumps(result))
