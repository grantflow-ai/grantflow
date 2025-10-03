"""E2E tests for MRA CFP extraction and template generation."""

import logging
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import GrantingInstitution, Organization, RagSource, GrantTemplate, GrantTemplateSource
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from .conftest import create_test_grant_template


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_mra_cfp_extraction_end_to_end(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    mra_cfp_file: Path,
    mra_cfp_rag_source: RagSource,
    mra_granting_institution: GrantingInstitution,
    test_organization: Organization,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
    expected_mra_sections: list[dict[str, Any]],
) -> None:
    """Test end-to-end MRA CFP extraction using real RAG sources."""
    performance_context.set_metadata("cfp_type", "melanoma_research_alliance")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("cfp_file", str(mra_cfp_file))

    logger.info("🧪 Starting MRA CFP extraction E2E test")

    # Verify CFP file exists
    assert mra_cfp_file.exists(), f"MRA CFP file not found: {mra_cfp_file}"

    performance_context.start_stage("extract_cfp_data")

    # Create test grant template for CFP analysis
    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=mra_granting_institution,
        organization=test_organization,
        title="MRA CFP E2E Test Template",
    )

    # Link RAG source to grant template
    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=mra_cfp_rag_source.id,
        )
        session.add(template_source)

    # Test CFP analysis with real RAG source
    cfp_analysis = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="mra-cfp-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_extraction_results")

    # Validate CFP analysis structure
    assert cfp_analysis is not None, "CFP analysis should return data"
    assert cfp_analysis.subject is not None, "CFP analysis should contain subject"
    assert cfp_analysis.content is not None, "CFP analysis should contain content sections"
    assert cfp_analysis.org_id is not None, "CFP analysis should contain org_id"

    subject = cfp_analysis.subject
    content_sections = cfp_analysis.content

    # Debug: log what was actually extracted
    logger.info(f"DEBUG: Extracted subject: {subject}")
    logger.info(f"DEBUG: Extracted {len(content_sections)} sections:")
    for i, section in enumerate(content_sections):
        logger.info(f"DEBUG: Section {i}: {section['title']} with {len(section['subtitles'])} subtitles")
        for j, subtitle in enumerate(section["subtitles"][:3]):  # Show first 3 subtitles
            logger.info(f"DEBUG:   Subtitle {j}: {subtitle}")

    # Validate subject
    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"
    assert "melanoma" in subject.lower(), "Subject should mention melanoma"

    # Validate content structure
    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    # Validate organization identification
    assert cfp_analysis.organization is not None, "CFP analysis should identify organization"
    assert cfp_analysis.organization.full_name == mra_granting_institution.full_name, \
        f"Should identify MRA: {cfp_analysis.organization.full_name}"

    # Validate analysis metadata
    assert cfp_analysis.analysis_metadata is not None, "CFP analysis should contain analysis metadata"
    assert "categories" in cfp_analysis.analysis_metadata, "Analysis should contain categories"
    assert len(cfp_analysis.analysis_metadata["categories"]) > 0, "Should identify requirement categories"

    # Validate section structure
    for section in content_sections:
        assert "title" in section, f"Section missing title: {section}"
        assert "subtitles" in section, f"Section missing subtitles: {section}"
        assert isinstance(section["title"], str), f"Section title should be string: {section['title']}"
        assert isinstance(section["subtitles"], list), f"Subtitles should be list: {section['subtitles']}"
        assert len(section["subtitles"]) > 0, f"Section should have subtitles: {section['title']}"

    # Validate expected sections are found
    extracted_titles = [section["title"].lower() for section in content_sections]

    # Check for key MRA sections
    research_found = any("research" in title for title in extracted_titles)
    budget_found = any("budget" in title or "funding" in title for title in extracted_titles)

    assert research_found, f"Should find research-related section in: {extracted_titles}"
    assert budget_found, f"Should find budget-related section in: {extracted_titles}"

    performance_context.end_stage()

    performance_context.start_stage("validate_section_quality")

    # Check section content quality
    total_subtitles = sum(len(section["subtitles"]) for section in content_sections)
    assert total_subtitles >= 5, f"Should extract substantial content: {total_subtitles} subtitles"

    # Validate specific content expectations for MRA
    all_text = " ".join([
        section["title"] + " " + " ".join(section["subtitles"])
        for section in content_sections
    ]).lower()

    mra_keywords = ["melanoma", "research", "application", "budget", "plan"]
    found_keywords = [kw for kw in mra_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain MRA-specific terms: {found_keywords}"

    performance_context.end_stage()

    # Set performance metadata
    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("total_subtitles_count", total_subtitles)
    performance_context.set_metadata("subject_length", len(subject))
    performance_context.set_metadata("mra_keywords_found", found_keywords)

    logger.info(
        "✅ MRA CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "total_subtitles": total_subtitles,
            "subject_preview": subject[:100] + "..." if len(subject) > 100 else subject,
            "keywords_found": found_keywords,
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_mra_cfp_template_generation_pipeline(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    mra_grant_template_with_rag_source: GrantTemplate,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
) -> None:
    """Test complete MRA CFP template generation pipeline using real RAG sources."""
    performance_context.set_metadata("cfp_type", "melanoma_research_alliance")
    performance_context.set_metadata("test_type", "full_pipeline")
    performance_context.set_metadata("pipeline_stage", "complete_template_generation")

    logger.info("🏭 Starting MRA CFP template generation pipeline test")

    performance_context.start_stage("run_template_generation_pipeline")

    # Run the complete template generation pipeline with real RAG source
    await handle_grant_template_pipeline(
        grant_template=mra_grant_template_with_rag_source,
        session_maker=async_session_maker,
        trace_id="mra-pipeline-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_pipeline_results")

    # Retrieve and validate the results
    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

    async with async_session_maker() as session:
        updated_template = await session.scalar(
            select_active(mra_grant_template_with_rag_source.__class__)
            .where(mra_grant_template_with_rag_source.__class__.id == mra_grant_template_with_rag_source.id)
            .options(selectinload(mra_grant_template_with_rag_source.__class__.grant_sections))
        )

        assert updated_template is not None, "Template should exist after pipeline"

        # Check if CFP data was extracted and stored
        if hasattr(updated_template, 'cfp_analysis') and updated_template.cfp_analysis:
            cfp_data = updated_template.cfp_analysis
            assert "subject" in cfp_data, "CFP analysis should contain subject"
            assert "content" in cfp_data, "CFP analysis should contain content"

            # Validate content quality
            if cfp_data["content"]:
                sections_count = len(cfp_data["content"])
                assert sections_count > 0, "Should have extracted sections"

                performance_context.set_metadata("pipeline_sections_extracted", sections_count)
                logger.info(f"Pipeline extracted {sections_count} sections")

        # Check grant sections were created
        if updated_template.grant_sections:
            sections_created = len(updated_template.grant_sections)
            performance_context.set_metadata("grant_sections_created", sections_created)
            logger.info(f"Pipeline created {sections_created} grant sections")

    performance_context.end_stage()

    logger.info("✅ MRA CFP template generation pipeline test completed successfully")


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_mra_cfp_section_structure_validation(
    logger: logging.Logger,
    expected_mra_sections: list[dict[str, Any]],
    performance_context: PerformanceTestContext,
) -> None:
    """Test validation of expected MRA CFP section structure."""
    performance_context.set_metadata("test_type", "section_structure_validation")
    performance_context.set_metadata("cfp_type", "melanoma_research_alliance")

    logger.info("📋 Validating MRA CFP expected section structure")

    performance_context.start_stage("validate_expected_sections")

    # Validate expected sections structure
    assert len(expected_mra_sections) > 0, "Should have expected sections defined"

    for expected_section in expected_mra_sections:
        assert "title" in expected_section, f"Expected section missing title: {expected_section}"
        assert "expected_subsections" in expected_section, f"Expected section missing subsections: {expected_section}"

        title = expected_section["title"]
        subsections = expected_section["expected_subsections"]

        assert isinstance(title, str), f"Section title should be string: {title}"
        assert isinstance(subsections, list), f"Subsections should be list: {subsections}"
        assert len(subsections) > 0, f"Section should have subsections: {title}"

        # Validate subsection content
        for subsection in subsections:
            assert isinstance(subsection, str), f"Subsection should be string: {subsection}"
            assert len(subsection) > 0, f"Subsection should not be empty: {subsection}"

    performance_context.end_stage()

    # Validate specific MRA expectations
    section_titles = [section["title"].lower() for section in expected_mra_sections]

    # Check for key MRA section types
    research_sections = [title for title in section_titles if "research" in title]
    budget_sections = [title for title in section_titles if "budget" in title or "resource" in title]
    team_sections = [title for title in section_titles if "team" in title or "investigator" in title]

    assert len(research_sections) > 0, f"Should have research sections: {section_titles}"
    assert len(budget_sections) > 0, f"Should have budget sections: {section_titles}"

    performance_context.set_metadata("expected_sections_count", len(expected_mra_sections))
    performance_context.set_metadata("research_sections_count", len(research_sections))
    performance_context.set_metadata("budget_sections_count", len(budget_sections))
    performance_context.set_metadata("team_sections_count", len(team_sections))

    logger.info(
        "✅ MRA CFP section structure validation completed",
        extra={
            "total_sections": len(expected_mra_sections),
            "research_sections": len(research_sections),
            "budget_sections": len(budget_sections),
            "team_sections": len(team_sections),
        },
    )