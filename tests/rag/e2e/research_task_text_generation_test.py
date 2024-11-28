import logging
from datetime import UTC, datetime
from json import dumps
from os import environ
from pathlib import Path

import pytest

from src.rag_backend.application_draft_generation.research_tasks import handle_research_task_text_generation
from src.rag_backend.dto import DraftGenerationRequest, EnrichedResearchTaskDTO


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_research_task_text_generation(
    logger: logging.Logger,
    generation_request: DraftGenerationRequest,
) -> None:
    logger.info("Running end-to-end test for research task text generation")
    result = await handle_research_task_text_generation(
        application_id=generation_request["application_id"],
        workspace_id=generation_request["workspace_id"],
        research_task=EnrichedResearchTaskDTO(
            **generation_request["research_aims"][0]["tasks"][0], relations=[], task_number="1.1"
        ),
        requires_clinical_trials=generation_request["research_aims"][0]["requires_clinical_trials"],
        ticket_id="test_ticket_id",
    )
    logger.info("Generated research task text: %s", result)
    result_file_path = (
        Path(__file__).parent
        / "results"
        / f"{handle_research_task_text_generation.__name__}_result_{datetime.now(tz=UTC).isoformat()}.json"
    )
    result_file_path.write_text(dumps(result))
