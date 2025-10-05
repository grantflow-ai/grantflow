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
    expected_mra_sections: list[dict[str, Any]],
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
    assert cfp_analysis["subject"] is not None, "CFP analysis should contain subject"
    assert cfp_analysis["content"] is not None, "CFP analysis should contain content sections"
    assert cfp_analysis["org_id"] is not None, "CFP analysis should contain org_id"

    subject = cfp_analysis["subject"]
    content_sections = cfp_analysis["content"]

    logger.info("DEBUG: Extracted subject: %s", subject)
    logger.info("DEBUG: Extracted %d sections:", len(content_sections))
    for i, section in enumerate(content_sections):
        logger.info("DEBUG: Section %d: %s with %d subtitles", i, section["title"], len(section["subtitles"]))
        for j, subtitle in enumerate(section["subtitles"][:3]):
            logger.info("DEBUG:   Subtitle %d: %s", j, subtitle)

    logger.info("📊 Comparing extracted sections against expected MRA structure:")

    extracted_titles = [section["title"].lower() for section in content_sections]
    expected_titles = [exp_section["title"].lower() for exp_section in expected_mra_sections]

    coverage_report = {"expected_found": [], "expected_missing": [], "unexpected_found": [], "coverage_score": 0.0}

    for expected_section in expected_mra_sections:
        expected_title = expected_section["title"].lower()
        found = any(
            expected_title in extracted_title or extracted_title in expected_title
            for extracted_title in extracted_titles
        )

        if found:
            coverage_report["expected_found"].append(expected_section["title"])
            logger.info("✅ Found expected section: %s", expected_section["title"])
        else:
            coverage_report["expected_missing"].append(expected_section["title"])
            logger.warning("❌ Missing expected section: %s", expected_section["title"])

    for section in content_sections:
        extracted_title = section["title"].lower()
        expected = any(
            expected_title in extracted_title or extracted_title in expected_title for expected_title in expected_titles
        )

        if not expected:
            coverage_report["unexpected_found"].append(section["title"])
            logger.info("📍 Additional section found: %s", section["title"])

    coverage_report["coverage_score"] = len(coverage_report["expected_found"]) / len(expected_mra_sections)

    logger.info("📊 Section Coverage Report:")
    logger.info(
        "   Expected sections found: %d/%d (%.1f%%)",
        len(coverage_report["expected_found"]),
        len(expected_mra_sections),
        coverage_report["coverage_score"] * 100,
    )
    logger.info("   Additional sections: %d", len(coverage_report["unexpected_found"]))
    logger.info("   Total extracted: %d", len(content_sections))

    performance_context.set_metadata("section_coverage_score", coverage_report["coverage_score"])
    performance_context.set_metadata("expected_sections_found", len(coverage_report["expected_found"]))
    performance_context.set_metadata("expected_sections_missing", len(coverage_report["expected_missing"]))
    performance_context.set_metadata("additional_sections_found", len(coverage_report["unexpected_found"]))

    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"
    assert "melanoma" in subject.lower(), "Subject should mention melanoma"

    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    assert cfp_analysis.get("organization") is not None, "CFP analysis should identify organization"
    assert cfp_analysis["organization"]["full_name"] == mra_granting_institution.full_name, (
        f"Should identify MRA: {cfp_analysis['organization']['full_name']}"
    )

    assert cfp_analysis["analysis_metadata"] is not None, "CFP analysis should contain analysis metadata"
    assert "categories" in cfp_analysis["analysis_metadata"], "Analysis should contain categories"
    assert len(cfp_analysis["analysis_metadata"]["categories"]) > 0, "Should identify requirement categories"

    for section in content_sections:
        assert "title" in section, f"Section missing title: {section}"
        assert "subtitles" in section, f"Section missing subtitles: {section}"
        assert isinstance(section["title"], str), f"Section title should be string: {section['title']}"
        assert isinstance(section["subtitles"], list), f"Subtitles should be list: {section['subtitles']}"

    extracted_titles = [section["title"].lower() for section in content_sections]

    research_or_award_found = any(
        "research" in title or "award" in title or "proposal" in title for title in extracted_titles
    )

    assert research_or_award_found, f"Should find research/award-related section in: {extracted_titles}"

    assert len(extracted_titles) >= 5, f"Should extract meaningful sections, got {len(extracted_titles)}"
    assert len(extracted_titles) <= 30, f"Should not over-fragment, got {len(extracted_titles)}"

    total_subtitles = sum(len(section["subtitles"]) for section in content_sections)
    avg_subtitles_per_section = total_subtitles / len(content_sections) if content_sections else 0
    assert avg_subtitles_per_section >= 2.0, (
        f"Sections should have substantial content: {avg_subtitles_per_section:.1f} avg subtitles per section"
    )

    assert len(content_sections) >= 15, f"Should extract comprehensive sections, got {len(content_sections)}"
    assert len(content_sections) <= 35, f"Should not over-fragment, got {len(content_sections)}"

    research_focused_sections = sum(
        1
        for section in content_sections
        if any(
            keyword in section["title"].lower()
            for keyword in ["award", "eligibility", "research", "funding", "application", "requirement"]
        )
    )
    assert research_focused_sections >= 8, (
        f"Should extract substantial research-focused content, got {research_focused_sections}"
    )

    if coverage_report["coverage_score"] < 0.3:
        logger.warning(
            "Low fixture coverage (%.1f%%) - consider updating fixtures to match current extraction focus",
            coverage_report["coverage_score"] * 100,
        )

    logger.info(
        "✅ Quality validation passed: %d sections, %d research-focused",
        len(content_sections),
        research_focused_sections,
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_section_quality")

    all_text = " ".join(
        [section["title"] + " " + " ".join(section["subtitles"]) for section in content_sections]
    ).lower()

    mra_keywords = ["melanoma", "research", "application", "award", "proposal"]
    found_keywords = [kw for kw in mra_keywords if kw in all_text]
    assert len(found_keywords) >= 2, f"Should contain MRA-specific terms: {found_keywords}"

    performance_context.end_stage()

    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("total_subtitles_count", total_subtitles)
    performance_context.set_metadata("avg_subtitles_per_section", avg_subtitles_per_section)
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


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_mra_cfp_section_structure_validation(
    logger: logging.Logger,
    expected_mra_sections: list[dict[str, Any]],
    performance_context: PerformanceTestContext,
) -> None:
    performance_context.set_metadata("test_type", "section_structure_validation")
    performance_context.set_metadata("cfp_type", "melanoma_research_alliance")

    logger.info("📋 Validating MRA CFP expected section structure")

    performance_context.start_stage("validate_expected_sections")

    assert len(expected_mra_sections) > 0, "Should have expected sections defined"

    for expected_section in expected_mra_sections:
        assert "title" in expected_section, f"Expected section missing title: {expected_section}"
        assert "expected_subsections" in expected_section, f"Expected section missing subsections: {expected_section}"

        title = expected_section["title"]
        subsections = expected_section["expected_subsections"]

        assert isinstance(title, str), f"Section title should be string: {title}"
        assert isinstance(subsections, list), f"Subsections should be list: {subsections}"
        assert len(subsections) > 0, f"Section should have subsections: {title}"

        for subsection in subsections:
            assert isinstance(subsection, str), f"Subsection should be string: {subsection}"
            assert len(subsection) > 0, f"Subsection should not be empty: {subsection}"

    performance_context.end_stage()

    section_titles = [section["title"].lower() for section in expected_mra_sections]

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
