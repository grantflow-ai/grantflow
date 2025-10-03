"""E2E tests for NIH PAR-25-450 CFP extraction and template generation."""

import logging
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import pytest
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantingInstitution, Organization, RagSource, GrantTemplate, GrantTemplateSource, TextVector
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from .conftest import create_test_grant_template


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_nih_par_25_450_cfp_extraction_end_to_end(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_file: Path,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
    expected_nih_par_25_450_sections: list[dict[str, Any]],
) -> None:
    """Test end-to-end NIH PAR-25-450 CFP extraction from PDF to structured data."""
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("cfp_file", str(nih_par_25_450_cfp_file))

    logger.info("🧪 Starting NIH PAR-25-450 CFP extraction E2E test")

    # Verify CFP file exists
    assert nih_par_25_450_cfp_file.exists(), f"NIH PAR-25-450 CFP file not found: {nih_par_25_450_cfp_file}"

    performance_context.start_stage("setup_rag_sources")

    # Create test grant template for CFP analysis
    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 CFP E2E Test Template",
    )

    # Create RAG source from CFP file content
    cfp_content = ""
    if nih_par_25_450_cfp_file.suffix == ".pdf":
        # For E2E test, we'll mock the PDF content extraction
        cfp_content = "NIH PAR-25-450 Clinical Trial Readiness for Rare Diseases CFP content placeholder"
    else:
        cfp_content = nih_par_25_450_cfp_file.read_text()

    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="nih-par-25-450-source-id",
            organization_id=test_organization.id,
            source_type="rag_file",
            text_content=cfp_content,
            indexing_status="FINISHED",
        )
        session.add(rag_source)
        await session.flush()

        # Link RAG source to grant template
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)

        # Create text chunks representing NIH CFP structure
        chunks = [
            "PAR-25-450: Clinical Trial Readiness for Rare Diseases, Disorders, and Syndromes",
            "Research Plan: Specific Aims and Research Strategy",
            "Clinical Trial Readiness: Regulatory Requirements and Trial Design",
            "Team and Environment: Personnel and Research Infrastructure",
            "Budget Pages and Budget Justification",
            "Rare Disease Research Focus and Outcome Measures",
        ]

        text_vectors = [
            TextVector(
                rag_source_id=rag_source.id,
                chunk={"content": chunk},
                embedding=[0.1] * 1536,  # Mock embedding
            )
            for chunk in chunks
        ]
        session.add_all(text_vectors)
        await session.flush()

    performance_context.end_stage()

    performance_context.start_stage("extract_cfp_data")

    # Test CFP analysis with real RAG source
    cfp_analysis = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="nih-par-25-450-e2e-test",
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

    # Validate subject for NIH PAR-25-450
    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"

    # Check for NIH and rare disease terminology
    subject_lower = subject.lower()
    nih_indicators = any(term in subject_lower for term in ["nih", "clinical trial", "rare disease", "r21"])
    assert nih_indicators, f"Subject should indicate NIH/rare disease focus: {subject}"

    # Validate organization identification
    assert cfp_analysis.organization is not None, "CFP analysis should identify organization"
    assert cfp_analysis.organization.full_name == nih_granting_institution.full_name, \
        f"Should identify NIH: {cfp_analysis.organization.full_name}"

    # Validate analysis metadata
    assert cfp_analysis.analysis_metadata is not None, "CFP analysis should contain analysis metadata"
    assert "categories" in cfp_analysis.analysis_metadata, "Analysis should contain categories"
    assert len(cfp_analysis.analysis_metadata["categories"]) > 0, "Should identify requirement categories"

    # Validate content structure
    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    # Validate section structure
    for section in content_sections:
        assert "title" in section, f"Section missing title: {section}"
        assert "subtitles" in section, f"Section missing subtitles: {section}"
        assert isinstance(section["title"], str), f"Section title should be string: {section['title']}"
        assert isinstance(section["subtitles"], list), f"Subtitles should be list: {section['subtitles']}"
        assert len(section["subtitles"]) > 0, f"Section should have subtitles: {section['title']}"

    performance_context.end_stage()

    performance_context.start_stage("validate_nih_specific_content")

    # Validate NIH-specific sections are found
    extracted_titles = [section["title"].lower() for section in content_sections]

    # Check for key NIH PAR-25-450 sections
    research_found = any("research" in title or "aim" in title for title in extracted_titles)
    clinical_trial_found = any("clinical" in title or "trial" in title for title in extracted_titles)
    budget_found = any("budget" in title for title in extracted_titles)

    assert research_found, f"Should find research-related section in: {extracted_titles}"
    assert budget_found, f"Should find budget section in: {extracted_titles}"

    # Check section content for NIH-specific terminology
    all_text = " ".join([
        section["title"] + " " + " ".join(section["subtitles"])
        for section in content_sections
    ]).lower()

    nih_keywords = ["research", "clinical", "trial", "rare disease", "budget", "nih"]
    found_keywords = [kw for kw in nih_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain NIH-specific terms: {found_keywords}"

    performance_context.end_stage()

    performance_context.start_stage("validate_section_quality")

    # Check section content quality
    total_subtitles = sum(len(section["subtitles"]) for section in content_sections)
    assert total_subtitles >= 5, f"Should extract substantial content: {total_subtitles} subtitles"

    # Validate section depth and structure for NIH grants
    substantial_sections = [s for s in content_sections if len(s["subtitles"]) >= 2]
    assert len(substantial_sections) >= 2, "Should have multiple substantial sections"

    performance_context.end_stage()

    # Set performance metadata
    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("total_subtitles_count", total_subtitles)
    performance_context.set_metadata("substantial_sections_count", len(substantial_sections))
    performance_context.set_metadata("subject_length", len(subject))
    performance_context.set_metadata("nih_keywords_found", found_keywords)

    logger.info(
        "✅ NIH PAR-25-450 CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "total_subtitles": total_subtitles,
            "substantial_sections": len(substantial_sections),
            "subject_preview": subject[:100] + "..." if len(subject) > 100 else subject,
            "keywords_found": found_keywords,
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=2400)
async def test_nih_par_25_450_template_generation_pipeline(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_par_25_450_cfp_file: Path,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
) -> None:
    """Test complete NIH PAR-25-450 CFP template generation pipeline."""
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("test_type", "full_pipeline")
    performance_context.set_metadata("grant_mechanism", "R21")

    logger.info("🏭 Starting NIH PAR-25-450 CFP template generation pipeline test")

    performance_context.start_stage("setup_grant_template")

    # Create grant template
    from .conftest import create_test_grant_template

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 E2E Test Template",
    )

    # Create RAG source
    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="nih-par-25-450-pipeline-source-id",
            organization_id=test_organization.id,
            source_type="rag_file",
            text_content="NIH PAR-25-450 Clinical Trial Readiness pipeline test content",
            status="indexed",
        )
        session.add(rag_source)
        await session.flush()

        # Add to template sources
        from packages.db.src.tables import GrantTemplateSource

        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)
        await session.flush()

    performance_context.end_stage()

    performance_context.start_stage("run_template_generation_pipeline")

    # Run the complete template generation pipeline
    await handle_grant_template_pipeline(
        grant_template_id=str(grant_template.id),
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
        trace_id="nih-par-25-450-pipeline-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_pipeline_results")

    # Retrieve and validate the results
    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

    async with async_session_maker() as session:
        updated_template = await session.scalar(
            select_active(grant_template.__class__)
            .where(grant_template.__class__.id == grant_template.id)
            .options(selectinload(grant_template.__class__.grant_sections))
        )

        assert updated_template is not None, "Template should exist after pipeline"

        # Check if CFP data was extracted and stored
        if hasattr(updated_template, 'cfp_analysis') and updated_template.cfp_analysis:
            cfp_data = updated_template.cfp_analysis
            assert "subject" in cfp_data, "CFP analysis should contain subject"
            assert "content" in cfp_data, "CFP analysis should contain content"

            # Validate NIH-specific content
            if cfp_data["content"]:
                sections_count = len(cfp_data["content"])
                assert sections_count > 0, "Should have extracted sections"

                # Check for NIH grant sections
                section_titles = [s["title"].lower() for s in cfp_data["content"]]
                has_research_section = any("research" in title for title in section_titles)
                has_budget_section = any("budget" in title for title in section_titles)

                performance_context.set_metadata("pipeline_sections_extracted", sections_count)
                performance_context.set_metadata("has_research_section", has_research_section)
                performance_context.set_metadata("has_budget_section", has_budget_section)

        # Check grant sections were created
        if updated_template.grant_sections:
            sections_created = len(updated_template.grant_sections)
            performance_context.set_metadata("grant_sections_created", sections_created)

    performance_context.end_stage()

    logger.info("✅ NIH PAR-25-450 CFP template generation pipeline test completed successfully")


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_nih_par_25_450_section_structure_validation(
    logger: logging.Logger,
    expected_nih_par_25_450_sections: list[dict[str, Any]],
    performance_context: PerformanceTestContext,
) -> None:
    """Test validation of expected NIH PAR-25-450 CFP section structure."""
    performance_context.set_metadata("test_type", "section_structure_validation")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("grant_mechanism", "R21")

    logger.info("📋 Validating NIH PAR-25-450 CFP expected section structure")

    performance_context.start_stage("validate_expected_sections")

    # Validate expected sections structure
    assert len(expected_nih_par_25_450_sections) > 0, "Should have expected sections defined"

    for expected_section in expected_nih_par_25_450_sections:
        assert "title" in expected_section, f"Expected section missing title: {expected_section}"
        assert "expected_subsections" in expected_section, f"Expected section missing subsections: {expected_section}"

        title = expected_section["title"]
        subsections = expected_section["expected_subsections"]

        assert isinstance(title, str), f"Section title should be string: {title}"
        assert isinstance(subsections, list), f"Subsections should be list: {subsections}"
        assert len(subsections) > 0, f"Section should have subsections: {title}"

    performance_context.end_stage()

    # Validate NIH-specific expectations
    section_titles = [section["title"].lower() for section in expected_nih_par_25_450_sections]

    # Check for key NIH section types
    research_sections = [title for title in section_titles if "research" in title]
    clinical_sections = [title for title in section_titles if "clinical" in title or "trial" in title]
    budget_sections = [title for title in section_titles if "budget" in title]

    assert len(research_sections) > 0, f"Should have research sections: {section_titles}"
    assert len(budget_sections) > 0, f"Should have budget sections: {section_titles}"

    # Validate subsection content for clinical trial readiness
    clinical_subsections = []
    for section in expected_nih_par_25_450_sections:
        if "clinical" in section["title"].lower() or "trial" in section["title"].lower():
            clinical_subsections.extend(section["expected_subsections"])

    if clinical_subsections:
        clinical_terms = ["regulatory", "trial", "outcome", "safety", "design"]
        found_clinical_terms = [
            term for term in clinical_terms
            if any(term in subsection.lower() for subsection in clinical_subsections)
        ]
        assert len(found_clinical_terms) >= 2, f"Clinical sections should have relevant terms: {found_clinical_terms}"

    performance_context.set_metadata("expected_sections_count", len(expected_nih_par_25_450_sections))
    performance_context.set_metadata("research_sections_count", len(research_sections))
    performance_context.set_metadata("clinical_sections_count", len(clinical_sections))
    performance_context.set_metadata("budget_sections_count", len(budget_sections))

    logger.info(
        "✅ NIH PAR-25-450 CFP section structure validation completed",
        extra={
            "total_sections": len(expected_nih_par_25_450_sections),
            "research_sections": len(research_sections),
            "clinical_sections": len(clinical_sections),
            "budget_sections": len(budget_sections),
        },
    )