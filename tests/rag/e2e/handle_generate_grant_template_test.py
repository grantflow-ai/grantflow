import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import GrantTemplate
from src.rag.grant_template.handler import handle_generate_grant_template
from src.utils.serialization import serialize
from tests.conftest import RESULTS_FOLDER


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template(
    logger: logging.Logger,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running end-to-end test for generating a grant format")

    cfp_content_file = RESULTS_FOLDER / "extracted_cfp_content.md"
    assert cfp_content_file.exists(), "CFP content file does not exist"

    await handle_generate_grant_template(
        cfp_content=cfp_content_file.read_text(), application_id=grant_template.grant_application_id
    )

    async with async_session_maker() as session:
        updated_grant_template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.id == grant_template.id)
        )
        assert updated_grant_template
        assert updated_grant_template.template
        assert updated_grant_template.name
        assert updated_grant_template.grant_sections

    results_file = (
        RESULTS_FOLDER / f"handle_generate_grant_template_{datetime.now(tz=UTC).strftime("%d_%m_%Y_%H:%M")}.json"
    )

    results_file.write_bytes(serialize(updated_grant_template))
