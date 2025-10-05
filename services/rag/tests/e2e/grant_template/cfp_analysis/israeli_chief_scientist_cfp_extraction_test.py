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
async def test_israeli_chief_scientist_cfp_extraction_end_to_end(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    performance_context: PerformanceTestContext,
    israeli_chief_scientist_cfp_file: Path,
    israeli_granting_institution: GrantingInstitution,
    test_organization: Organization,
    organization_mapping: dict[str, dict[str, str]],
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("cfp_type", "israeli_chief_scientist")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("cfp_file", str(israeli_chief_scientist_cfp_file))
    performance_context.set_metadata("file_format", "html")

    logger.info("🧪 Starting Israeli Chief Scientist CFP extraction E2E test")

    assert israeli_chief_scientist_cfp_file.exists(), f"Israeli CFP file not found: {israeli_chief_scientist_cfp_file}"

    performance_context.start_stage("setup_rag_sources")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=israeli_granting_institution,
        organization=test_organization,
        title="Israeli Chief Scientist CFP E2E Test Template",
    )

    cfp_content = israeli_chief_scientist_cfp_file.read_text(encoding="utf-8")
    assert len(cfp_content) > 100, "CFP content should not be empty"

    async with async_session_maker() as session, session.begin():
        rag_source = RagSource(
            id="israeli-chief-scientist-source-id",
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
            "Israeli Ministry of Health Chief Scientist Grant Proposal Template",
            "Project Information: Title, Principal Investigator, Institution",
            "Research Plan: Objectives, Background, Methodology",
            "Budget and Funding: Total Budget, Breakdown, Justification",
            "Team and Collaboration: Research Team, Institutional Support",
            "Innovation and Impact: Expected Outcomes, Significance",
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
        trace_id="israeli-chief-scientist-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_extraction_results")

    assert cfp_analysis is not None, "CFP analysis should return data"
    assert cfp_analysis.get("subject"), "CFP analysis should contain subject"
    assert cfp_analysis.get("content"), "CFP analysis should contain content sections"
    assert cfp_analysis.get("organization"), "CFP analysis should contain organization"

    subject = cfp_analysis["subject"]
    content_sections = cfp_analysis["content"]

    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"

    subject_lower = subject.lower()
    israeli_indicators = any(
        term in subject_lower for term in ["israeli", "israel", "health", "ministry", "chief scientist", "grant"]
    )
    assert israeli_indicators, f"Subject should indicate Israeli/health ministry context: {subject}"

    assert cfp_analysis["organization"] is not None, "CFP analysis should identify organization"
    assert cfp_analysis["organization"]["full_name"] == israeli_granting_institution.full_name, (
        f"Should identify Israeli institution: {cfp_analysis['organization']['full_name']}"
    )

    assert cfp_analysis["analysis_metadata"] is not None, "CFP analysis should contain analysis metadata"
    assert "categories" in cfp_analysis["analysis_metadata"], "Analysis should contain categories"

    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    for section in content_sections:
        assert "id" in section
        assert "title" in section
        assert "parent_id" in section
        assert "subtitles" in section
        assert "categories" in section
        assert "constraints" in section

        assert isinstance(section["id"], str)
        assert isinstance(section["title"], str)
        assert isinstance(section["subtitles"], list)
        assert len(section["subtitles"]) == 0
        assert isinstance(section["categories"], list)
        assert isinstance(section["constraints"], list)

    performance_context.end_stage()

    performance_context.start_stage("validate_israeli_specific_content")

    extracted_titles = [section["title"].lower() for section in content_sections]

    project_found = any("project" in title or "information" in title for title in extracted_titles)
    research_found = any("research" in title or "plan" in title for title in extracted_titles)
    budget_found = any("budget" in title or "funding" in title for title in extracted_titles)
    any("team" in title or "collaboration" in title for title in extracted_titles)

    assert project_found, f"Should find project information section in: {extracted_titles}"
    assert research_found, f"Should find research-related section in: {extracted_titles}"
    assert budget_found, f"Should find budget section in: {extracted_titles}"

    all_text = " ".join(s["title"] for s in content_sections).lower()

    israeli_keywords = ["project", "research", "budget", "investigator", "institution", "methodology"]
    found_keywords = [kw for kw in israeli_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain Israeli CFP-specific terms: {found_keywords}"

    performance_context.end_stage()

    performance_context.start_stage("validate_section_quality")

    parent_sections = [s for s in content_sections if s.get("parent_id") is None]
    child_sections = [s for s in content_sections if s.get("parent_id") is not None]

    assert len(parent_sections) > 0, "Should have at least one parent section"
    assert len(child_sections) > 0, "Should have at least one child section"

    form_indicators = ["title", "investigator", "institution", "duration", "budget", "objectives"]
    form_content_found = sum(1 for indicator in form_indicators if indicator in all_text)
    assert form_content_found >= 3, f"Should contain form-like structure elements: {form_content_found}/6"

    performance_context.end_stage()

    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("parent_sections_count", len(parent_sections))
    performance_context.set_metadata("child_sections_count", len(child_sections))
    performance_context.set_metadata("subject_length", len(subject))
    performance_context.set_metadata("israeli_keywords_found", found_keywords)
    performance_context.set_metadata("form_content_score", form_content_found)

    logger.info(
        "✅ Israeli Chief Scientist CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "parent_sections": len(parent_sections),
            "child_sections": len(child_sections),
            "subject_preview": subject[:100] + "..." if len(subject) > 100 else subject,
            "keywords_found": found_keywords,
            "form_structure_score": form_content_found,
        },
    )
