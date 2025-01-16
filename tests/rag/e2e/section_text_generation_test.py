import logging
from datetime import UTC, datetime
from os import environ
from typing import Any, Final

import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import ContentTopicEnum, GrantSectionEnum
from src.db.json_objects import ApplicationDetails, GrantSection, SectionTopic
from src.db.tables import GrantApplication
from src.patterns import XML_TAG_PATTERN
from src.rag.grant_application.generate_section_text import handle_section_text_generation
from src.utils.serialization import serialize
from tests.conftest import RESULTS_FOLDER

EXAMPLE_SECTION_TOPICS: Final[list[SectionTopic]] = [
    SectionTopic(
        type=ContentTopicEnum.BACKGROUND_CONTEXT,
        weight=0.8,
    ),
    SectionTopic(
        type=ContentTopicEnum.NOVELTY_AND_INNOVATION,
        weight=0.6,
    ),
    SectionTopic(
        type=ContentTopicEnum.IMPACT,
        weight=0.7,
    ),
]


@pytest.fixture
def grant_section() -> GrantSection:
    return GrantSection(
        type=GrantSectionEnum.RESEARCH_SIGNIFICANCE,
        topics=EXAMPLE_SECTION_TOPICS,
        min_words=500,
        max_words=1000,
        search_queries=[
            "significance of immunotherapy research",
            "importance of novel cancer treatments",
            "impact on patient outcomes",
        ],
    )


@pytest.fixture
async def test_application_id(
    async_session_maker: async_sessionmaker[Any],
    application_details: ApplicationDetails,
) -> str:
    async with async_session_maker() as session:
        application_id = await session.scalar(
            insert(GrantApplication)
            .values(
                {
                    "title": "Test Grant Application",
                    "details": application_details,
                }
            )
            .returning(GrantApplication.id)
        )
        await session.commit()
    return str(application_id)


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_section_text(
    logger: logging.Logger,
    test_application_id: str,
    application_details: ApplicationDetails,
    grant_section: GrantSection,
) -> None:
    logger.info("Testing section text generation")
    start_time = datetime.now(UTC)

    previous_sections = "## Executive Summary\nPrior section content for context."
    research_plan_text = "## Research Plan\nDetailed research methodology and approach."

    section_text = await handle_section_text_generation(
        application_id=test_application_id,
        application_details=application_details,
        grant_section=grant_section,
        previous_sections=previous_sections,
        research_plan_text=research_plan_text,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 60

    word_count = len(section_text.split())
    assert grant_section["min_words"] <= word_count <= grant_section["max_words"]

    assert not XML_TAG_PATTERN.findall(section_text)
    assert not section_text.startswith("#")
    assert not any(line.startswith("-") for line in section_text.split("\n"))

    for query in grant_section["search_queries"]:
        key_terms = query.split()
        assert any(term.lower() in section_text.lower() for term in key_terms)

    result_folder = RESULTS_FOLDER / test_application_id
    result_folder.mkdir(parents=True, exist_ok=True)

    result_file = result_folder / f"section_text_{grant_section['type']}_{datetime.now(UTC).timestamp()}.json"
    result_file.write_bytes(serialize(section_text))

    logger.info("Completed section text generation in %.2f seconds with %d words", elapsed_time, word_count)


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_section_text_with_different_types(
    logger: logging.Logger,
    test_application_id: str,
    application_details: ApplicationDetails,
) -> None:
    logger.info("Testing section text generation with different section types")

    previous_sections = "## Previous Section\nContext from earlier sections."
    research_plan_text = "## Research Plan\nMethodology details."

    test_sections = [
        GrantSectionEnum.EXECUTIVE_SUMMARY,
        GrantSectionEnum.RESEARCH_INNOVATION,
        GrantSectionEnum.RESEARCH_OBJECTIVES,
    ]

    for section_type in test_sections:
        start_time = datetime.now(UTC)

        test_section = GrantSection(
            type=section_type,
            topics=EXAMPLE_SECTION_TOPICS,
            search_queries=["research innovation methods", "technical approach details", "scientific methodology"],
        )

        section_text = await handle_section_text_generation(
            application_id=test_application_id,
            application_details=application_details,
            grant_section=test_section,
            previous_sections=previous_sections,
            research_plan_text=research_plan_text,
        )

        elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
        word_count = len(section_text.split())

        assert not XML_TAG_PATTERN.findall(section_text)
        assert word_count >= 250

        result_folder = RESULTS_FOLDER / test_application_id
        result_folder.mkdir(parents=True, exist_ok=True)

        result_file = result_folder / f"section_text_{section_type}_{datetime.now(UTC).timestamp()}.json"
        result_file.write_bytes(serialize(section_text))

        logger.info("Generated %s section in %.2f seconds with %d words", section_type, elapsed_time, word_count)
