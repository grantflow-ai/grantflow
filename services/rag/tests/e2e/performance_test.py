"""Performance test for grant template generation optimization."""

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from packages.shared_utils.src.serialization import serialize
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_template.determine_application_sections import handle_extract_sections
from services.rag.src.grant_template.determine_longform_metadata import handle_generate_grant_template
from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from services.rag.tests.e2e.utils import create_rag_sources_from_cfp_file


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_grant_template_performance_melanoma(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    """Test grant template generation performance with Melanoma Alliance CFP."""
    template_id = str(uuid4())

    # Stage 1: Create RAG sources
    stage1_start = datetime.now(UTC)
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="melanoma_alliance.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )
    stage1_time = (datetime.now(UTC) - stage1_start).total_seconds()
    logger.info("Stage 1 - RAG source creation: %.2f seconds", stage1_time)

    # Stage 2: Extract CFP data
    stage2_start = datetime.now(UTC)
    cfp_data = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )
    stage2_time = (datetime.now(UTC) - stage2_start).total_seconds()
    logger.info("Stage 2 - CFP extraction: %.2f seconds", stage2_time)

    # Stage 3: Extract sections
    stage3_start = datetime.now(UTC)
    sections = await handle_extract_sections(
        cfp_content=cfp_data["content"],
        cfp_subject=cfp_data["cfp_subject"],
        organization=None,
    )
    stage3_time = (datetime.now(UTC) - stage3_start).total_seconds()
    logger.info("Stage 3 - Section extraction: %.2f seconds", stage3_time)

    # Stage 4: Generate metadata for long-form sections
    stage4_start = datetime.now(UTC)
    long_form_sections = [s for s in sections if s["is_long_form"]]
    metadata = await handle_generate_grant_template(
        cfp_content=str(cfp_data["content"]),
        cfp_subject=cfp_data["cfp_subject"],
        organization=None,
        long_form_sections=long_form_sections,
    )
    stage4_time = (datetime.now(UTC) - stage4_start).total_seconds()
    logger.info("Stage 4 - Metadata generation: %.2f seconds", stage4_time)

    total_time = stage1_time + stage2_time + stage3_time + stage4_time

    # Save results with timing information
    results = {
        "timing": {
            "stage1_rag_creation": stage1_time,
            "stage2_cfp_extraction": stage2_time,
            "stage3_section_extraction": stage3_time,
            "stage4_metadata_generation": stage4_time,
            "total_time": total_time,
        },
        "metrics": {
            "section_count": len(sections),
            "long_form_sections": len(long_form_sections),
            "metadata_count": len(metadata),
            "content_items": len(cfp_data["content"]),
            "organization_id": cfp_data.get("organization_id"),
        },
        "sections": sections,
        "metadata": metadata,
    }

    folder = RESULTS_FOLDER / "performance"
    folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_performance_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.json"
    results_file.write_bytes(serialize(results))

    logger.info(
        "Performance test completed - Total: %.2f seconds (S1: %.2f, S2: %.2f, S3: %.2f, S4: %.2f)",
        total_time,
        stage1_time,
        stage2_time,
        stage3_time,
        stage4_time,
    )

    # Performance assertions (adjusted for optimized targets)
    assert total_time < 150, f"Total time {total_time}s exceeds 150s target"
    assert stage2_time < 40, f"CFP extraction {stage2_time}s exceeds 40s target"
    assert stage3_time < 60, f"Section extraction {stage3_time}s exceeds 60s target"
    assert stage4_time < 50, f"Metadata generation {stage4_time}s exceeds 50s target"
