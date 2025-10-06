import logging
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.tables import GrantingInstitution, GrantTemplateSource, Organization, RagSource, TextVector
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.tests.e2e.grant_template.conftest import create_test_grant_template


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
) -> None:
    performance_context.set_metadata("cfp_type", "nih_tuberculosis_research_units")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("grant_mechanism", "P01")
    performance_context.set_metadata("cfp_file", str(nih_tuberculosis_cfp_file))

    logger.info("🧪 Starting NIH Tuberculosis Research Units CFP extraction E2E test")

    assert nih_tuberculosis_cfp_file.exists(), f"NIH Tuberculosis CFP file not found: {nih_tuberculosis_cfp_file}"

    performance_context.start_stage("setup_rag_sources")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH Tuberculosis CFP E2E Test Template",
    )

    cfp_content = "NIH RFA-AI-25-027 Tuberculosis Research Units P01 CFP content placeholder"

    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="nih-tuberculosis-source-id",
            organization_id=test_organization.id,
            source_type="rag_file",
            text_content=cfp_content,
            indexing_status="FINISHED",
        )
        session.add(rag_source)
        await session.flush()

        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)

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
                embedding=[0.1] * 1536,
            )
            for chunk in chunks
        ]
        session.add_all(text_vectors)
        await session.flush()

    performance_context.end_stage()

    performance_context.start_stage("extract_cfp_data")

    cfp_analysis = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="nih-tuberculosis-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_extraction_results")

    assert cfp_analysis is not None, "CFP analysis should return data"
    assert cfp_analysis.get("subject"), "CFP analysis should contain subject"
    assert cfp_analysis.get("sections"), "CFP analysis should contain content sections"
    assert cfp_analysis.get("organization"), "CFP analysis should contain organization"

    subject = cfp_analysis["subject"]
    content_sections = cfp_analysis["sections"]

    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"

    subject_lower = subject.lower()
    tb_indicators = any(term in subject_lower for term in ["tuberculosis", "tb", "p01", "research unit"])
    assert tb_indicators, f"Subject should indicate tuberculosis/P01 focus: {subject}"

    assert cfp_analysis["organization"] is not None, "CFP analysis should identify organization"
    assert cfp_analysis["organization"]["full_name"] == nih_granting_institution.full_name, (
        f"Should identify NIH: {cfp_analysis['organization']['full_name']}"
    )

    assert "deadlines" in cfp_analysis, "CFP analysis should contain deadlines"
    assert isinstance(cfp_analysis["deadlines"], list), "Deadlines should be a list"

    assert "global_constraints" in cfp_analysis, "CFP analysis should contain global constraints"
    assert isinstance(cfp_analysis["global_constraints"], list), "Global constraints should be a list"

    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    for section in content_sections:
        assert "id" in section
        assert "title" in section
        assert "parent_id" in section
        assert "constraints" in section

        assert isinstance(section["id"], str)
        assert isinstance(section["title"], str)
        assert isinstance(section["constraints"], list)

    performance_context.end_stage()

    performance_context.start_stage("validate_p01_specific_content")

    extracted_titles = [section["title"].lower() for section in content_sections]

    research_found = any("research" in title or "project" in title for title in extracted_titles)
    any("program" in title or "multi" in title or "component" in title for title in extracted_titles)
    any("leadership" in title or "director" in title for title in extracted_titles)
    any("core" in title or "administrative" in title for title in extracted_titles)

    assert research_found, f"Should find research project sections in: {extracted_titles}"

    all_text = " ".join(s["title"] for s in content_sections).lower()

    tb_keywords = ["tuberculosis", "research", "program", "project", "core", "leadership"]
    found_keywords = [kw for kw in tb_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain TB/P01-specific terms: {found_keywords}"

    performance_context.end_stage()

    parent_sections = [s for s in content_sections if s.get("parent_id") is None]
    child_sections = [s for s in content_sections if s.get("parent_id") is not None]

    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("parent_sections_count", len(parent_sections))
    performance_context.set_metadata("child_sections_count", len(child_sections))
    performance_context.set_metadata("tb_keywords_found", found_keywords)

    logger.info(
        "✅ NIH Tuberculosis Research Units CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "parent_sections": len(parent_sections),
            "child_sections": len(child_sections),
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
) -> None:
    performance_context.set_metadata("cfp_type", "nih_diabetes_digital_health")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("grant_mechanism", "R01")
    performance_context.set_metadata("cfp_file", str(nih_diabetes_cfp_file))

    logger.info("🧪 Starting NIH Digital Health Technology for Type 2 Diabetes CFP extraction E2E test")

    assert nih_diabetes_cfp_file.exists(), f"NIH Diabetes CFP file not found: {nih_diabetes_cfp_file}"

    performance_context.start_stage("setup_rag_sources")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH Diabetes Digital Health CFP E2E Test Template",
    )

    cfp_content = "NIH RFA-DK-26-315 Digital Health Technology Type 2 Diabetes R01 CFP content placeholder"

    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="nih-diabetes-source-id",
            organization_id=test_organization.id,
            source_type="rag_file",
            text_content=cfp_content,
            indexing_status="FINISHED",
        )
        session.add(rag_source)
        await session.flush()

        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)

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
                embedding=[0.1] * 1536,
            )
            for chunk in chunks
        ]
        session.add_all(text_vectors)
        await session.flush()

    performance_context.end_stage()

    performance_context.start_stage("extract_cfp_data")

    cfp_analysis = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="nih-diabetes-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_extraction_results")

    assert cfp_analysis is not None, "CFP analysis should return data"
    assert cfp_analysis.get("subject"), "CFP analysis should contain subject"
    assert cfp_analysis.get("sections"), "CFP analysis should contain content sections"
    assert cfp_analysis.get("organization"), "CFP analysis should contain organization"

    subject = cfp_analysis["subject"]
    content_sections = cfp_analysis["sections"]

    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"

    subject_lower = subject.lower()
    diabetes_indicators = any(
        term in subject_lower for term in ["diabetes", "digital health", "technology", "r01", "clinical trial"]
    )
    assert diabetes_indicators, f"Subject should indicate diabetes/digital health focus: {subject}"

    assert cfp_analysis["organization"] is not None, "CFP analysis should identify organization"
    assert cfp_analysis["organization"]["full_name"] == nih_granting_institution.full_name, (
        f"Should identify NIH: {cfp_analysis['organization']['full_name']}"
    )

    assert "deadlines" in cfp_analysis, "CFP analysis should contain deadlines"
    assert isinstance(cfp_analysis["deadlines"], list), "Deadlines should be a list"

    assert "global_constraints" in cfp_analysis, "CFP analysis should contain global constraints"
    assert isinstance(cfp_analysis["global_constraints"], list), "Global constraints should be a list"

    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    for section in content_sections:
        assert "id" in section
        assert "title" in section
        assert "parent_id" in section
        assert "constraints" in section

        assert isinstance(section["id"], str)
        assert isinstance(section["title"], str)
        assert isinstance(section["constraints"], list)

    performance_context.end_stage()

    performance_context.start_stage("validate_diabetes_digital_health_content")

    extracted_titles = [section["title"].lower() for section in content_sections]

    research_found = any("research" in title or "aim" in title for title in extracted_titles)
    any("clinical" in title or "trial" in title for title in extracted_titles)
    any("technology" in title or "digital" in title for title in extracted_titles)
    any("team" in title or "environment" in title for title in extracted_titles)

    assert research_found, f"Should find research sections in: {extracted_titles}"

    all_text = " ".join(s["title"] for s in content_sections).lower()

    diabetes_keywords = ["diabetes", "digital", "technology", "clinical", "trial", "research", "health"]
    found_keywords = [kw for kw in diabetes_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain diabetes/digital health terms: {found_keywords}"

    trial_indicators = ["clinical trial", "study design", "participants", "intervention", "outcomes"]
    trial_content_found = sum(1 for indicator in trial_indicators if indicator in all_text)
    performance_context.set_metadata("clinical_trial_content_score", trial_content_found)

    performance_context.end_stage()

    parent_sections = [s for s in content_sections if s.get("parent_id") is None]
    child_sections = [s for s in content_sections if s.get("parent_id") is not None]

    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("parent_sections_count", len(parent_sections))
    performance_context.set_metadata("child_sections_count", len(child_sections))
    performance_context.set_metadata("diabetes_keywords_found", found_keywords)

    logger.info(
        "✅ NIH Digital Health Technology for Type 2 Diabetes CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "parent_sections": len(parent_sections),
            "child_sections": len(child_sections),
            "keywords_found": found_keywords,
            "clinical_trial_score": trial_content_found,
        },
    )
