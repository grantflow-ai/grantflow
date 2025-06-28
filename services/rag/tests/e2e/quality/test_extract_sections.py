import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from packages.db.src.tables import FundingOrganization
from packages.shared_utils.src.serialization import serialize
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_template.determine_application_sections import handle_extract_sections
from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from services.rag.tests.e2e.test_utils import create_rag_sources_from_cfp_file


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=180)
async def test_extract_sections_melanoma_alliance_cfp(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    template_id = str(uuid4())

    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="melanoma_alliance.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(cfp_content=result["content"], cfp_subject=result["cfp_subject"])

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = (
        folder / f"handle_extract_sections_melanoma_alliance_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    )
    results_file.write_bytes(serialize(sections))
    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=180)
async def test_extract_sections_erc_cfp(
    logger: logging.Logger,
    erc_organization: FundingOrganization,
    organization_mapping: dict[str, dict[str, str]],
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    template_id = str(uuid4())

    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="erc.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(
        cfp_content=result["content"], cfp_subject=result["cfp_subject"], organization=erc_organization
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"handle_extract_sections_erc_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))
    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=180)
async def test_extract_sections_standard_awards_cfp(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    template_id = str(uuid4())

    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="standard_awards.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(cfp_content=result["content"], cfp_subject=result["cfp_subject"])

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = (
        folder / f"handle_extract_sections_standard_awards_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    )
    results_file.write_bytes(serialize(sections))
    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=180)
async def test_extract_sections_nih_cfp(
    logger: logging.Logger,
    nih_organization: FundingOrganization,
    organization_mapping: dict[str, dict[str, str]],
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    template_id = str(uuid4())

    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="nih.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(
        cfp_content=result["content"], cfp_subject=result["cfp_subject"], organization=nih_organization
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"handle_extract_sections_nih_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))
    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=180)
async def test_extract_sections_ics_cfp(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    template_id = str(uuid4())

    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="ics.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(cfp_content=result["content"], cfp_subject=result["cfp_subject"])

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"handle_extract_sections_ics_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))
    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))
