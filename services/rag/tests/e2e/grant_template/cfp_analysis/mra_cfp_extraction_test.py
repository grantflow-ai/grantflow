import logging
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.tables import GrantingInstitution, GrantTemplateSource, Organization, RagSource
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.tests.e2e.grant_template.conftest import create_test_grant_template


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
) -> None:
    """Test end-to-end MRA CFP extraction using real RAG sources. ~keep

    MRA CFP Structure (2023-2024 RFP):
    Source: testing/test_data/sources/cfps/MRA-2023-2024-RFP-Final.pdf
    Extracted: testing/test_data/sources/cfps/MRA-2023-2024-RFP-Final.md (1406 lines)

    Award Types:
    - Team Science Awards: $300K/year, $900K total over 3 years
    - Young Investigator Awards: $85K/year, $255K total over 3 years
    - Pilot Awards: $50K/year, $100K total over 2 years
    - Dermatology Career Development Awards: $85K/year, $170K total over 2 years
    - Academic-Industry Partnership Award (for Team Science)
    - Special Opportunity Awards (Acral Melanoma, Brain Metastasis, etc.)

    Application Components (line 745+):
    1. Title Page
    2. Templates and Instructions
    3. Enable Other Users (collaborators, signing officials)
    4. Applicant/PI information
    5. Organization/Institution (with ROR ID)
    6. Key Personnel (Administrative PI, PI, Co-I, Collaborator, Mentor, Young Investigator, Consultant)
    7. Data and Renewable Reagent Sharing Plan
    8. Abstracts and Keywords (2000 chars each - general audience + technical)
    9. Budget Period Detail (no indirect costs/overhead, fringe benefits allowed)
    10. Budget Summary and Justification
    11. Current and Pending Research Support
    12. Organizational Assurances (IRB, IACUC)
    13. Upload Attachments:
        a. Biosketch (NIH format for PI and Key Personnel)
        b. Current/pending support (Team Science only)
        c. Project description (5 pages max, Arial 11pt/Times 12pt, 0.5" margins)
           - Background and specific aims
           - Preliminary data
           - Experimental design and methods
           - Statistical plan
           - Figures (embedded)
           - Rationale/fit with criteria, clinical impact potential
        d. Literature references (up to 30, separate from 5-page limit)
        e. Mentor Letter of Support (Young Investigator/Team Science/Dermatology)
        f. Applicant Eligibility Checklist
        g. Academic-Industry Partnership letter (if applicable)
        h. Clinical trial protocol synopsis (if applicable)

    Expected cfp_analysis Output:
    - subject: Focus on translational/clinical melanoma research
    - organization: Melanoma Research Alliance (MRA)
    - content: Structured sections covering application format
    - analysis_metadata.categories: Award types, eligibility, submission requirements
    - analysis_metadata.constraints: Page limits (5 pages project description),
      word limits (2000 chars abstracts), formatting (Arial 11pt/Times 12pt, 0.5" margins),
      budget caps per award type
    """
    performance_context.set_metadata("cfp_type", "melanoma_research_alliance")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("cfp_file", str(mra_cfp_file))

    logger.info("🧪 Starting MRA CFP extraction E2E test")

    assert mra_cfp_file.exists(), f"MRA CFP file not found: {mra_cfp_file}"

    performance_context.start_stage("extract_cfp_data")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=mra_granting_institution,
        organization=test_organization,
        title="MRA CFP E2E Test Template",
    )

    async with async_session_maker() as session, session.begin():
        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=mra_cfp_rag_source.id,
        )
        session.add(template_source)

    cfp_analysis = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=async_session_maker,
        job_manager=mock_job_manager,
        trace_id="mra-cfp-e2e-test",
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
    assert "melanoma" in subject.lower(), "Subject should mention melanoma"

    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    assert cfp_analysis.get("organization") is not None, "CFP analysis should identify organization"
    assert cfp_analysis["organization"]["full_name"] == mra_granting_institution.full_name, (  # type: ignore[index]
        f"Should identify MRA: {cfp_analysis['organization']['full_name']}"  # type: ignore[index]
    )

    assert "deadlines" in cfp_analysis, "CFP analysis should contain deadlines"
    assert isinstance(cfp_analysis["deadlines"], list), "Deadlines should be a list"

    assert "global_constraints" in cfp_analysis, "CFP analysis should contain global constraints"
    assert isinstance(cfp_analysis["global_constraints"], list), "Global constraints should be a list"

    for section in content_sections:
        assert "id" in section
        assert "title" in section
        assert "parent_id" in section

        assert isinstance(section["id"], str)
        assert isinstance(section["title"], str)
        constraint = section.get("length_constraint")
        if constraint is not None:
            assert isinstance(constraint, dict)

    extracted_titles = [section["title"].lower() for section in content_sections]

    logger.info("Extracted %d sections:", len(content_sections))
    for section in content_sections:
        constraint = section.get("length_constraint")
        constraint_summary = "none" if constraint is None else f"{constraint['type']}={constraint['value']}"
        logger.info("  - %s (length_constraint: %s)", section["title"], constraint_summary)

    research_or_award_found = any(
        "research" in title or "award" in title or "proposal" in title for title in extracted_titles
    )

    assert research_or_award_found, f"Should find research/award-related section in: {extracted_titles}"

    assert len(extracted_titles) >= 3, f"Should extract core content sections, got {len(extracted_titles)}"
    assert len(extracted_titles) <= 20, f"Should not over-fragment, got {len(extracted_titles)}"

    parent_sections = [s for s in content_sections if s.get("parent_id") is None]
    child_sections = [s for s in content_sections if s.get("parent_id") is not None]

    assert len(parent_sections) > 0, "Should have at least one parent section"

    research_focused_sections = sum(
        1
        for section in content_sections
        if any(
            keyword in section["title"].lower()
            for keyword in [
                "abstract",
                "project",
                "description",
                "research",
                "data",
                "sharing",
                "protocol",
                "aims",
                "background",
                "methods",
                "design",
            ]
        )
    )
    assert research_focused_sections >= 3, (
        f"Should extract at least core content sections (data sharing, abstracts, project description), got {research_focused_sections}"
    )

    logger.info(
        "✅ Quality validation passed: %d sections, %d research-focused",
        len(content_sections),
        research_focused_sections,
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_section_quality")

    all_text = " ".join(s["title"] for s in content_sections).lower()

    mra_keywords = ["melanoma", "research", "application", "award", "proposal", "project", "data", "abstract"]
    found_keywords = [kw for kw in mra_keywords if kw in all_text]
    assert len(found_keywords) >= 1, f"Should contain MRA-specific terms: {found_keywords}"

    performance_context.end_stage()

    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("parent_sections_count", len(parent_sections))
    performance_context.set_metadata("child_sections_count", len(child_sections))
    performance_context.set_metadata("subject_length", len(subject))
    performance_context.set_metadata("mra_keywords_found", found_keywords)

    logger.info(
        "✅ MRA CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "parent_sections": len(parent_sections),
            "child_sections": len(child_sections),
            "subject_preview": subject[:100] + "..." if len(subject) > 100 else subject,
            "keywords_found": found_keywords,
        },
    )
