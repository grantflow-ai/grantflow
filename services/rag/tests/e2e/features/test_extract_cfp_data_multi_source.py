import logging
from datetime import UTC, datetime
from typing import Any

from packages.db.src.tables import GrantTemplateRagSource
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.serialization import serialize
from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.e2e_utils import E2ETestCategory, e2e_test

TEST_GRANT_TEMPLATE_ID = get_env(key="TEST_GRANT_TEMPLATE_ID", fallback="2fb8fb60-4972-4a7e-ad9d-691121409d19")


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_extract_cfp_data_multi_source(
    logger: logging.Logger,
    organization_mapping: dict[str, dict[str, str]],
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Starting multi-source test for template: %s", TEST_GRANT_TEMPLATE_ID)

    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(GrantTemplateRagSource.rag_source_id).where(
                GrantTemplateRagSource.grant_template_id == TEST_GRANT_TEMPLATE_ID
            )
        )
        source_ids = [str(row[0]) for row in result.fetchall()]

    if not source_ids:
        logger.error("No RAG sources found for template %s", TEST_GRANT_TEMPLATE_ID)
        return

    logger.info("Found %d RAG sources: %s", len(source_ids), source_ids)

    start_time = datetime.now(UTC)

    try:
        extraction_result = await handle_extract_cfp_data_from_rag_sources(
            source_ids=source_ids,
            organization_mapping=organization_mapping,
            session_maker=async_session_maker,
        )

        execution_time = (datetime.now(UTC) - start_time).total_seconds()
        logger.info("Extraction completed in %.2f seconds", execution_time)

        assert isinstance(extraction_result["organization_id"], (str | type(None))), (
            "organization_id should be a string or None"
        )
        assert isinstance(extraction_result["content"], list), "content should be a list"

        content_items = extraction_result["content"]
        assert len(content_items) >= 1, "At least one content item should be extracted"

        for item in content_items:
            assert "title" in item, f"Each content item should have a 'title' field: {item}"
            assert isinstance(item["title"], str), f"'title' field should be a string: {item}"
            assert "subtitles" in item, f"Each content item should have a 'subtitles' field: {item}"
            assert isinstance(item["subtitles"], list), f"'subtitles' field should be a list: {item}"

        if extraction_result["organization_id"]:
            assert extraction_result["organization_id"] in organization_mapping, (
                f"organization_id {extraction_result['organization_id']} not found in organization mapping"
            )
            logger.info("Identified organization: %s", extraction_result["organization_id"])

        output_data = {
            "test_info": {
                "grant_template_id": TEST_GRANT_TEMPLATE_ID,
                "source_ids": source_ids,
                "source_count": len(source_ids),
                "execution_time_seconds": execution_time,
                "timestamp": datetime.now(UTC).isoformat(),
            },
            "extraction_result": extraction_result,
        }

        output_folder = RESULTS_FOLDER / "cfps" / "cfp_extraction_multi_source"
        output_folder.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        output_file = output_folder / f"multi_source_result_{timestamp}.json"

        output_file.write_bytes(serialize(output_data))

        logger.info("Results saved to %s", output_file)
        logger.info("Successfully extracted %d content items from multi-source data", len(content_items))

    except Exception:
        logger.exception("Error during extraction")
