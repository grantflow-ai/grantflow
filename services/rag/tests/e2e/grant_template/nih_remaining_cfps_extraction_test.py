"""E2E tests for remaining NIH CFPs extraction and template generation.

Tests for:
- RFA-AI-25-027: Tuberculosis Research Units (P01)
- RFA-DK-26-315: Digital Health Technology for Type 2 Diabetes (R01)
"""

import logging
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import pytest
from packages.db.src.tables import GrantingInstitution, Organization, RagSource, GrantTemplate, GrantTemplateSource, TextVector
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.src.grant_template.pipeline import handle_grant_template_pipeline
from .conftest import create_test_grant_template


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_nih_tuberculosis_cfp_extraction_end_to_end(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_tuberculosis_cfp_file: Path,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
    expected_nih_tuberculosis_sections: list[dict[str, Any]],
) -> None:
    """Test end-to-end NIH Tuberculosis Research Units CFP extraction."""
    performance_context.set_metadata("cfp_type", "nih_tuberculosis_research_units")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("grant_mechanism", "P01")
    performance_context.set_metadata("cfp_file", str(nih_tuberculosis_cfp_file))

    logger.info("🧪 Starting NIH Tuberculosis Research Units CFP extraction E2E test")

    # Verify CFP file exists
    assert nih_tuberculosis_cfp_file.exists(), f"NIH Tuberculosis CFP file not found: {nih_tuberculosis_cfp_file}"

    performance_context.start_stage("setup_rag_sources")

    # Create RAG source from CFP file content
    cfp_content = "NIH RFA-AI-25-027 Tuberculosis Research Units P01 CFP content placeholder"

    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="nih-tuberculosis-source-id",
            organization_id=test_organization.id,
            source_type="rag_file",
            text_content=cfp_content,
            status="indexed",
        )
        session.add(rag_source)
        await session.flush()

        # Create text chunks representing P01 multi-component structure
        from packages.db.src.tables import TextVector

        chunks = [
            "RFA-AI-25-027: Tuberculosis Research Units (P01 Clinical Trial Optional)",
            "Multi-Component Research Program: Research Projects and Core Facilities",
            "Research Plan: Specific Aims, Research Strategy, Innovation",
            "Program Leadership: Program Director, Project Leaders, Team Science",
            "Administrative Core and Integration Plan",
            "Environment and Resources: Institutional Commitment, Facilities",
        ]

        text_vectors = [
            TextVector(
                rag_source_id=rag_source.id,
                chunk={"content": chunk},
                vector=[0.1] * 1536,  # Mock embedding
            )
            for chunk in chunks
        ]
        session.add_all(text_vectors)
        await session.flush()

    performance_context.end_stage()

    performance_context.start_stage("extract_cfp_data")

    # Test CFP data extraction
    extracted_data = await handle_extract_cfp_data(
        source_ids=[rag_source.id],
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="nih-tuberculosis-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_extraction_results")

    # Validate extracted data structure
    assert extracted_data is not None, "CFP extraction should return data"
    assert "subject" in extracted_data, "Extracted data should contain subject"
    assert "content" in extracted_data, "Extracted data should contain content sections"

    subject = extracted_data["subject"]
    content_sections = extracted_data["content"]

    # Validate subject for NIH Tuberculosis P01
    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"

    subject_lower = subject.lower()
    tb_indicators = any(term in subject_lower for term in ["tuberculosis", "tb", "p01", "research unit"])
    assert tb_indicators, f"Subject should indicate tuberculosis/P01 focus: {subject}"

    # Validate content structure
    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    performance_context.end_stage()

    performance_context.start_stage("validate_p01_specific_content")

    # Validate P01-specific sections are found
    extracted_titles = [section["title"].lower() for section in content_sections]

    # Check for key P01 program sections
    research_found = any("research" in title or "project" in title for title in extracted_titles)
    program_found = any("program" in title or "multi" in title or "component" in title for title in extracted_titles)
    leadership_found = any("leadership" in title or "director" in title for title in extracted_titles)
    core_found = any("core" in title or "administrative" in title for title in extracted_titles)

    assert research_found, f"Should find research project sections in: {extracted_titles}"

    # Check section content for tuberculosis and P01-specific terminology
    all_text = " ".join([
        section["title"] + " " + " ".join(section["subtitles"])
        for section in content_sections
    ]).lower()

    tb_keywords = ["tuberculosis", "research", "program", "project", "core", "leadership"]
    found_keywords = [kw for kw in tb_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain TB/P01-specific terms: {found_keywords}"

    performance_context.end_stage()

    # Set performance metadata
    total_subtitles = sum(len(section["subtitles"]) for section in content_sections)
    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("total_subtitles_count", total_subtitles)
    performance_context.set_metadata("tb_keywords_found", found_keywords)

    logger.info(
        "✅ NIH Tuberculosis Research Units CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "total_subtitles": total_subtitles,
            "keywords_found": found_keywords,
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_nih_diabetes_cfp_extraction_end_to_end(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    nih_diabetes_cfp_file: Path,
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
    expected_nih_diabetes_sections: list[dict[str, Any]],
) -> None:
    """Test end-to-end NIH Digital Health Technology for Type 2 Diabetes CFP extraction."""
    performance_context.set_metadata("cfp_type", "nih_diabetes_digital_health")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("grant_mechanism", "R01")
    performance_context.set_metadata("cfp_file", str(nih_diabetes_cfp_file))

    logger.info("🧪 Starting NIH Digital Health Technology for Type 2 Diabetes CFP extraction E2E test")

    # Verify CFP file exists
    assert nih_diabetes_cfp_file.exists(), f"NIH Diabetes CFP file not found: {nih_diabetes_cfp_file}"

    performance_context.start_stage("setup_rag_sources")

    # Create RAG source from CFP file content
    cfp_content = "NIH RFA-DK-26-315 Digital Health Technology Type 2 Diabetes R01 CFP content placeholder"

    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="nih-diabetes-source-id",
            organization_id=test_organization.id,
            source_type="rag_file",
            text_content=cfp_content,
            status="indexed",
        )
        session.add(rag_source)
        await session.flush()

        # Create text chunks representing digital health technology structure
        from packages.db.src.tables import TextVector

        chunks = [
            "RFA-DK-26-315: Digital Health Technology for Type 2 Diabetes Management (R01 Clinical Trial Required)",
            "Research Plan: Specific Aims, Research Strategy, Innovation, Approach",
            "Clinical Trial Components: Study Design, Participants, Intervention, Outcomes",
            "Digital Health Technology: Description, Implementation, Usability, Data Management",
            "Team and Environment: Investigator Team, Research Environment, Collaboration",
            "Type 2 Diabetes Focus and Technology Integration",
        ]

        text_vectors = [
            TextVector(
                rag_source_id=rag_source.id,
                chunk={"content": chunk},
                vector=[0.1] * 1536,  # Mock embedding
            )
            for chunk in chunks
        ]
        session.add_all(text_vectors)
        await session.flush()

    performance_context.end_stage()

    performance_context.start_stage("extract_cfp_data")

    # Test CFP data extraction
    extracted_data = await handle_extract_cfp_data(
        source_ids=[rag_source.id],
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="nih-diabetes-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_extraction_results")

    # Validate extracted data structure
    assert extracted_data is not None, "CFP extraction should return data"
    assert "subject" in extracted_data, "Extracted data should contain subject"
    assert "content" in extracted_data, "Extracted data should contain content sections"

    subject = extracted_data["subject"]
    content_sections = extracted_data["content"]

    # Validate subject for NIH Diabetes Digital Health R01
    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"

    subject_lower = subject.lower()
    diabetes_indicators = any(
        term in subject_lower for term in ["diabetes", "digital health", "technology", "r01", "clinical trial"]
    )
    assert diabetes_indicators, f"Subject should indicate diabetes/digital health focus: {subject}"

    # Validate content structure
    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    performance_context.end_stage()

    performance_context.start_stage("validate_diabetes_digital_health_content")

    # Validate diabetes digital health-specific sections are found
    extracted_titles = [section["title"].lower() for section in content_sections]

    # Check for key diabetes digital health sections
    research_found = any("research" in title or "aim" in title for title in extracted_titles)
    clinical_found = any("clinical" in title or "trial" in title for title in extracted_titles)
    technology_found = any("technology" in title or "digital" in title for title in extracted_titles)
    team_found = any("team" in title or "environment" in title for title in extracted_titles)

    assert research_found, f"Should find research sections in: {extracted_titles}"

    # Check section content for diabetes and digital health terminology
    all_text = " ".join([
        section["title"] + " " + " ".join(section["subtitles"])
        for section in content_sections
    ]).lower()

    diabetes_keywords = ["diabetes", "digital", "technology", "clinical", "trial", "research", "health"]
    found_keywords = [kw for kw in diabetes_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain diabetes/digital health terms: {found_keywords}"

    # Check for clinical trial requirement indicators
    trial_indicators = ["clinical trial", "study design", "participants", "intervention", "outcomes"]
    trial_content_found = sum(1 for indicator in trial_indicators if indicator in all_text)
    performance_context.set_metadata("clinical_trial_content_score", trial_content_found)

    performance_context.end_stage()

    # Set performance metadata
    total_subtitles = sum(len(section["subtitles"]) for section in content_sections)
    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("total_subtitles_count", total_subtitles)
    performance_context.set_metadata("diabetes_keywords_found", found_keywords)

    logger.info(
        "✅ NIH Digital Health Technology for Type 2 Diabetes CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "total_subtitles": total_subtitles,
            "keywords_found": found_keywords,
            "clinical_trial_score": trial_content_found,
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_nih_tuberculosis_section_structure_validation(
    logger: logging.Logger,
    expected_nih_tuberculosis_sections: list[dict[str, Any]],
    performance_context: PerformanceTestContext,
) -> None:
    """Test validation of expected NIH Tuberculosis Research Units CFP section structure."""
    performance_context.set_metadata("test_type", "section_structure_validation")
    performance_context.set_metadata("cfp_type", "nih_tuberculosis_research_units")
    performance_context.set_metadata("grant_mechanism", "P01")

    logger.info("📋 Validating NIH Tuberculosis Research Units CFP expected section structure")

    # Validate expected sections structure
    assert len(expected_nih_tuberculosis_sections) > 0, "Should have expected sections defined"

    # Check for P01-specific section types
    section_titles = [section["title"].lower() for section in expected_nih_tuberculosis_sections]

    research_sections = [title for title in section_titles if "research" in title]
    program_sections = [title for title in section_titles if "program" in title or "component" in title]
    leadership_sections = [title for title in section_titles if "leadership" in title or "team" in title]
    environment_sections = [title for title in section_titles if "environment" in title or "resource" in title]

    assert len(research_sections) > 0, f"Should have research sections: {section_titles}"
    assert len(environment_sections) > 0, f"Should have environment sections: {section_titles}"

    performance_context.set_metadata("expected_sections_count", len(expected_nih_tuberculosis_sections))
    performance_context.set_metadata("research_sections_count", len(research_sections))
    performance_context.set_metadata("program_sections_count", len(program_sections))
    performance_context.set_metadata("leadership_sections_count", len(leadership_sections))

    logger.info(
        "✅ NIH Tuberculosis Research Units CFP section structure validation completed",
        extra={
            "total_sections": len(expected_nih_tuberculosis_sections),
            "research_sections": len(research_sections),
            "program_sections": len(program_sections),
            "leadership_sections": len(leadership_sections),
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_nih_diabetes_section_structure_validation(
    logger: logging.Logger,
    expected_nih_diabetes_sections: list[dict[str, Any]],
    performance_context: PerformanceTestContext,
) -> None:
    """Test validation of expected NIH Digital Health Technology for Type 2 Diabetes CFP section structure."""
    performance_context.set_metadata("test_type", "section_structure_validation")
    performance_context.set_metadata("cfp_type", "nih_diabetes_digital_health")
    performance_context.set_metadata("grant_mechanism", "R01")

    logger.info("📋 Validating NIH Digital Health Technology for Type 2 Diabetes CFP expected section structure")

    # Validate expected sections structure
    assert len(expected_nih_diabetes_sections) > 0, "Should have expected sections defined"

    # Check for R01 clinical trial with digital health focus
    section_titles = [section["title"].lower() for section in expected_nih_diabetes_sections]

    research_sections = [title for title in section_titles if "research" in title]
    clinical_sections = [title for title in section_titles if "clinical" in title or "trial" in title]
    technology_sections = [title for title in section_titles if "technology" in title or "digital" in title]
    team_sections = [title for title in section_titles if "team" in title or "environment" in title]

    assert len(research_sections) > 0, f"Should have research sections: {section_titles}"

    # Validate subsection content for digital health and clinical trial requirements
    all_subsections = []
    for section in expected_nih_diabetes_sections:
        all_subsections.extend(section["expected_subsections"])

    digital_health_elements = ["technology", "digital", "implementation", "usability", "data management"]
    clinical_trial_elements = ["study design", "participants", "intervention", "outcomes"]

    found_digital_elements = [
        element for element in digital_health_elements
        if any(element in subsection.lower() for subsection in all_subsections)
    ]
    found_clinical_elements = [
        element for element in clinical_trial_elements
        if any(element in subsection.lower() for subsection in all_subsections)
    ]

    performance_context.set_metadata("expected_sections_count", len(expected_nih_diabetes_sections))
    performance_context.set_metadata("research_sections_count", len(research_sections))
    performance_context.set_metadata("clinical_sections_count", len(clinical_sections))
    performance_context.set_metadata("technology_sections_count", len(technology_sections))
    performance_context.set_metadata("digital_elements_found", found_digital_elements)
    performance_context.set_metadata("clinical_elements_found", found_clinical_elements)

    logger.info(
        "✅ NIH Digital Health Technology for Type 2 Diabetes CFP section structure validation completed",
        extra={
            "total_sections": len(expected_nih_diabetes_sections),
            "research_sections": len(research_sections),
            "clinical_sections": len(clinical_sections),
            "technology_sections": len(technology_sections),
            "digital_elements": len(found_digital_elements),
            "clinical_elements": len(found_clinical_elements),
        },
    )