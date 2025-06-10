import logging
from datetime import UTC, datetime
from os import environ
from typing import Any
from uuid import uuid4

import pytest
from packages.db.src.tables import FundingOrganization, GrantApplication
from packages.shared_utils.src.serialization import serialize
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER

from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from services.rag.src.grant_template.handler import extract_and_enrich_sections
from services.rag.tests.e2e.utils import create_rag_sources_from_cfp_file


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_melanoma_alliance(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    # Create a test grant template
    template_id = str(uuid4())

    # Create RAG sources from the CFP file
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="melanoma_alliance.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
    )

    # Extract CFP data from RAG sources
    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content=result["content"], cfp_subject=result["cfp_subject"], organization=None, parent_id=uuid4()
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_melanoma_alliance_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_standard_aware(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    # Create a test grant template
    template_id = str(uuid4())

    # Create RAG sources from the CFP file
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="standard_awards.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
    )

    # Extract CFP data from RAG sources
    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content=result["content"], cfp_subject=result["cfp_subject"], organization=None, parent_id=uuid4()
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_standard_awards_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_nih(
    logger: logging.Logger,
    nih_organization: FundingOrganization,
    organization_mapping: dict[str, dict[str, str]],
    async_session_maker: async_sessionmaker[Any],
) -> None:
    # Create a test grant template
    template_id = str(uuid4())

    # Create RAG sources from the CFP file
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="nih.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
    )

    # Extract CFP data from RAG sources
    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content=result["content"],
        cfp_subject=result["cfp_subject"],
        organization=nih_organization,
        parent_id=uuid4(),
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_nih_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_ics(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    # Create a test grant template
    template_id = str(uuid4())

    # Create RAG sources from the CFP file
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="ics.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
    )

    # Extract CFP data from RAG sources
    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content=result["content"], cfp_subject=result["cfp_subject"], organization=None, parent_id=uuid4()
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_ics_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_erc(
    logger: logging.Logger,
    organization_mapping: dict[str, dict[str, str]],
    erc_organization: FundingOrganization,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    # Create a test grant template
    template_id = str(uuid4())

    # Create RAG sources from the CFP file
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="erc.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
    )

    # Extract CFP data from RAG sources
    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content=result["content"],
        cfp_subject=result["cfp_subject"],
        organization=erc_organization,
        parent_id=uuid4(),
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_erc_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("source_file_name", ["melanoma_alliance", "standard_awards", "nih", "ics"])
async def test_handle_generate_grant_template(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: Any,
    nih_organization: FundingOrganization,
    organization_mapping: dict[str, dict[str, str]],
    source_file_name: str,
) -> None:
    # Create a test grant template
    template_id = str(uuid4())

    # Create RAG sources from the CFP file
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name=f"{source_file_name}.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
    )

    # Extract CFP data from RAG sources
    result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(tz=UTC)

    sections = await extract_and_enrich_sections(
        cfp_content=result["content"],
        cfp_subject=result["cfp_subject"],
        organization=nih_organization,
        parent_id=uuid4(),
    )

    elapsed_time = (datetime.now(tz=UTC) - start_time).total_seconds()

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_{source_file_name}_{datetime.now(tz=UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    results_file.write_bytes(serialize(sections))
