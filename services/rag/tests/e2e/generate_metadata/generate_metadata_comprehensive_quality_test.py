
import logging
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.json_objects import GrantElement, GrantLongFormSection
from packages.db.src.tables import GrantingInstitution, Organization
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.src.grant_template.extract_sections import handle_extract_sections
from services.rag.src.grant_template.generate_metadata import handle_generate_grant_template_metadata
from services.rag.tests.e2e.grant_template.conftest import (
    create_test_grant_template,
)


def validate_metadata_structure(
    grant_sections: list[GrantLongFormSection | GrantElement],
    logger: logging.Logger,
) -> None:
    long_form_sections: list[GrantLongFormSection] = [
        s
        for s in grant_sections
        if isinstance(s.get("max_words"), int)
    ]  # type: ignore[misc]

    assert len(long_form_sections) > 0, "Should have at least one long-form section with metadata"

    for section in long_form_sections:
        section_id = section.get("id")
        section_title = section.get("title", "Unknown")

        assert "max_words" in section, f"Missing max_words for {section_title}"
        assert section["max_words"] > 0, f"Invalid max_words for {section_title}: {section['max_words']}"

        assert "keywords" in section, f"Missing keywords for {section_title}"
        assert len(section["keywords"]) >= 3, f"Too few keywords for {section_title}: {len(section['keywords'])}"

        assert "topics" in section, f"Missing topics for {section_title}"
        assert len(section["topics"]) >= 2, f"Too few topics for {section_title}: {len(section['topics'])}"

        assert "search_queries" in section, f"Missing search_queries for {section_title}"
        assert len(section["search_queries"]) >= 3, (
            f"Too few search_queries for {section_title}: {len(section['search_queries'])}"
        )

        assert "generation_instructions" in section, f"Missing generation_instructions for {section_title}"
        assert len(section["generation_instructions"]) >= 50, f"generation_instructions too short for {section_title}"

        assert "depends_on" in section, f"Missing depends_on for {section_title}"
        assert isinstance(section["depends_on"], list), f"depends_on should be list for {section_title}"

        all_section_ids = {s["id"] for s in grant_sections}
        for dep_id in section["depends_on"]:
            assert dep_id in all_section_ids, f"Invalid dependency {dep_id} for {section_title}"
            assert dep_id != section_id, f"Section {section_title} depends on itself"

        logger.debug(
            "✅ Validated metadata structure for '%s': keywords=%d, topics=%d, queries=%d, max_words=%d",
            section_title,
            len(section.get("keywords", [])),
            len(section.get("topics", [])),
            len(section.get("search_queries", [])),
            section.get("max_words", 0),
        )


def validate_research_plan_metadata(
    grant_sections: list[GrantLongFormSection | GrantElement],
    logger: logging.Logger,
) -> None:
    research_plan_sections: list[GrantLongFormSection] = [
        s
        for s in grant_sections  # type: ignore[misc]
        if isinstance(s.get("is_detailed_research_plan"), bool) and s.get("is_detailed_research_plan")
    ]

    assert len(research_plan_sections) == 1, (
        f"Should have exactly 1 research plan section, found {len(research_plan_sections)}"
    )

    research_plan = research_plan_sections[0]
    section_title = research_plan.get("title", "Unknown")

    assert len(research_plan["keywords"]) >= 5, (
        f"Research plan should have ≥5 keywords, found {len(research_plan['keywords'])}"
    )
    assert len(research_plan["topics"]) >= 3, (
        f"Research plan should have ≥3 topics, found {len(research_plan['topics'])}"
    )
    assert len(research_plan["search_queries"]) >= 5, (
        f"Research plan should have ≥5 search queries, found {len(research_plan['search_queries'])}"
    )
    assert research_plan["max_words"] >= 500, (
        f"Research plan should have ≥500 words, found {research_plan['max_words']}"
    )

    logger.info(
        "✅ Research plan section '%s' has enhanced metadata: keywords=%d, topics=%d, queries=%d, max_words=%d",
        section_title,
        len(research_plan["keywords"]),
        len(research_plan["topics"]),
        len(research_plan["search_queries"]),
        research_plan["max_words"],
    )


def validate_total_word_count(
    grant_sections: list[GrantLongFormSection | GrantElement],
    logger: logging.Logger,
) -> None:
    long_form_sections: list[GrantLongFormSection] = [
        s
        for s in grant_sections  # type: ignore[misc]
        if isinstance(s.get("max_words"), int)
    ]
    total_words = sum(s["max_words"] for s in long_form_sections)

    assert 500 <= total_words <= 50000, f"Total word count {total_words} outside reasonable range [500, 50000]"

    logger.info(
        "✅ Total word count across %d sections: %d words",
        len(long_form_sections),
        total_words,
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_generate_metadata_quality_israeli_chief_scientist(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    israeli_chief_scientist_cfp_rag_source: Any,
    israeli_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "generate_metadata_quality")
    performance_context.set_metadata("cfp_type", "israeli_chief_scientist")
    performance_context.set_metadata("stage", "generate_metadata")

    logger.info("📈 Starting Israeli Chief Scientist metadata quality test")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=israeli_granting_institution,
        organization=test_organization,
        title="Israeli Chief Scientist Metadata Quality Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=israeli_chief_scientist_cfp_rag_source.id,
        )
        session.add(template_source)

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="israeli-metadata-quality-test",
    )

    extracted_sections = await handle_extract_sections(
        cfp_content=cfp_analysis_result["content"],
        cfp_analysis=cfp_analysis_result,
        job_manager=mock_job_manager,
        trace_id="israeli-metadata-quality-test",
    )

    cfp_content_str = "\n\n".join(
        [
            f"## {section['title']}\n" + "\n".join(f"- {subtitle}" for subtitle in section["subtitles"])
            for section in cfp_analysis_result["content"]
        ]
    )

    grant_sections = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content_str,
        organization=cfp_analysis_result.get("organization"),
        long_form_sections=extracted_sections,
        job_manager=mock_job_manager,
        trace_id="israeli-metadata-quality-test",
    )

    logger.info("📊 Validating metadata quality for %d sections", len(grant_sections))

    validate_metadata_structure(grant_sections, logger)

    validate_research_plan_metadata(grant_sections, logger)

    validate_total_word_count(grant_sections, logger)

    long_form_sections = [s for s in grant_sections if "max_words" in s]
    performance_context.set_metadata("total_sections", len(grant_sections))
    performance_context.set_metadata("long_form_sections", len(long_form_sections))
    performance_context.set_metadata("total_word_count", sum(s["max_words"] for s in long_form_sections))

    logger.info("✅ Israeli Chief Scientist metadata quality test completed successfully")


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_generate_metadata_quality_nih_tuberculosis(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_tuberculosis_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "generate_metadata_quality")
    performance_context.set_metadata("cfp_type", "nih_tuberculosis")
    performance_context.set_metadata("stage", "generate_metadata")

    logger.info("📈 Starting NIH Tuberculosis metadata quality test")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH Tuberculosis Metadata Quality Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=nih_tuberculosis_cfp_rag_source.id,
        )
        session.add(template_source)

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="tuberculosis-metadata-quality-test",
    )

    extracted_sections = await handle_extract_sections(
        cfp_content=cfp_analysis_result["content"],
        cfp_analysis=cfp_analysis_result,
        job_manager=mock_job_manager,
        trace_id="tuberculosis-metadata-quality-test",
    )

    cfp_content_str = "\n\n".join(
        [
            f"## {section['title']}\n" + "\n".join(f"- {subtitle}" for subtitle in section["subtitles"])
            for section in cfp_analysis_result["content"]
        ]
    )

    grant_sections = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content_str,
        organization=cfp_analysis_result.get("organization"),
        long_form_sections=extracted_sections,
        job_manager=mock_job_manager,
        trace_id="tuberculosis-metadata-quality-test",
    )

    logger.info("📊 Validating metadata quality for %d sections", len(grant_sections))

    validate_metadata_structure(grant_sections, logger)

    validate_research_plan_metadata(grant_sections, logger)

    validate_total_word_count(grant_sections, logger)

    long_form_sections = [s for s in grant_sections if "max_words" in s]
    performance_context.set_metadata("total_sections", len(grant_sections))
    performance_context.set_metadata("long_form_sections", len(long_form_sections))
    performance_context.set_metadata("total_word_count", sum(s["max_words"] for s in long_form_sections))

    logger.info("✅ NIH Tuberculosis metadata quality test completed successfully")


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_generate_metadata_quality_nih_diabetes(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_diabetes_cfp_rag_source: Any,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("test_type", "generate_metadata_quality")
    performance_context.set_metadata("cfp_type", "nih_diabetes")
    performance_context.set_metadata("stage", "generate_metadata")

    logger.info("📈 Starting NIH Diabetes metadata quality test")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH Diabetes Metadata Quality Test",
    )

    from packages.db.src.tables import GrantTemplateSource

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=nih_diabetes_cfp_rag_source.id,
        )
        session.add(template_source)

    cfp_analysis_result = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="diabetes-metadata-quality-test",
    )

    extracted_sections = await handle_extract_sections(
        cfp_content=cfp_analysis_result["content"],
        cfp_analysis=cfp_analysis_result,
        job_manager=mock_job_manager,
        trace_id="diabetes-metadata-quality-test",
    )

    cfp_content_str = "\n\n".join(
        [
            f"## {section['title']}\n" + "\n".join(f"- {subtitle}" for subtitle in section["subtitles"])
            for section in cfp_analysis_result["content"]
        ]
    )

    grant_sections = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content_str,
        organization=cfp_analysis_result.get("organization"),
        long_form_sections=extracted_sections,
        job_manager=mock_job_manager,
        trace_id="diabetes-metadata-quality-test",
    )

    logger.info("📊 Validating metadata quality for %d sections", len(grant_sections))

    validate_metadata_structure(grant_sections, logger)

    validate_research_plan_metadata(grant_sections, logger)

    validate_total_word_count(grant_sections, logger)

    long_form_sections = [s for s in grant_sections if "max_words" in s]
    performance_context.set_metadata("total_sections", len(grant_sections))
    performance_context.set_metadata("long_form_sections", len(long_form_sections))
    performance_context.set_metadata("total_word_count", sum(s["max_words"] for s in long_form_sections))

    logger.info("✅ NIH Diabetes metadata quality test completed successfully")
