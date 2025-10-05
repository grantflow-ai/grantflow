
import logging
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.tables import (
    GrantingInstitution,
    GrantTemplateSource,
    Organization,
    RagSource,
    TextVector,
)
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.tests.e2e.grant_template.conftest import create_test_grant_template


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
    """Test end-to-end NIH PAR-25-450 CFP extraction from PDF to structured data. ~keep

    NIH PAR-25-450 CFP Structure:
    Source: testing/test_data/sources/cfps/PAR-25-450_ Clinical Trial Readiness for Rare Diseases, Disorders, and Syndromes (R21 Clinical Trial Not Allowed).pdf
    Extracted: testing/test_data/sources/cfps/PAR-25-450_Clinical_Trial_Readiness_for_Rare_Diseases.md (1306 lines)

    Grant Mechanism: R21 (Exploratory/Developmental Research Grant - Clinical Trial Not Allowed)

    Purpose (line 136-158):
    Support clinical projects addressing critical needs for clinical trial readiness in rare diseases.
    Focus on developing/testing biomarkers and clinical outcome measures, or defining disease natural
    history to enable efficient clinical trial design.

    Scope (line 261-328):
    Two categories of projects:
    1. Validation of sensitive, reliable, responsive tools (COA measures, biomarkers) to identify
       participants or measure intervention effects
    2. Defining disease presentation/course essential for upcoming clinical trial design
       (retrospective, longitudinal, or cross-sectional approaches)

    Application Format (Section IV, line 562+):
    Standard NIH Application Format following SF424(R&R) with PHS 398 Research Plan:

    Required Components:
    - SF424(R&R) Cover
    - SF424(R&R) Project/Performance Site Locations
    - SF424(R&R) Other Project Information
    - SF424(R&R) Senior/Key Person Profile (biosketches, Current/Pending Support)
    - R&R or Modular Budget
    - R&R Subaward Budget
    - PHS 398 Cover Page Supplement
    - PHS 398 Research Plan:

        Research Strategy (line 594+):
        Special Required Subsections:

        1. Evidence Supporting Rare Disease Classification (line 595-612)
           - Proof disease affects ≤200,000 people in U.S.
           - FDA orphan status if applicable
           - Rationale if focusing on rare variant/subset of common condition
           - Scientific basis for separate biomarker/COA validation

        2. Urgent Need for Clinical Trial Readiness (line 613-660)
           - Description of trial readiness study need/timing
           - Critical barriers/bottlenecks addressed
           - Clinical trial design issues resolved (power calculations, inclusion/exclusion,
             duration, biomarker/COA validation)
           - Potential impact on upcoming clinical trials
           - State of candidate therapeutic development (even if applicant not involved)
           - Timelines for therapeutics advancing to trials
           - Description of enabled clinical trial(s) with letters of support from researchers
           - Next steps for moving to clinical trial if successful
           - Current COA measures/biomarkers status and limitations
           - Natural history knowledge gaps compromising trial design
           - Role of companies/voluntary health organizations

        3. Biomarkers and Context of Use (line 661+)
           - BEST Resource terminology (FDA-NIH Biomarker Working Group)
           - Defined context of use statement
           - Clinical validation requirements

        Standard NIH Sections:
        - Specific Aims
        - Significance
        - Innovation
        - Approach (including preliminary data, research design, methods)
        - Bibliography & References Cited
        - Facilities & Other Resources
        - Equipment

    Page Limits (line 562-565):
    - Follow NIH SF424(R&R) Application Guide Table of Page Limits
    - R21: Typically 6 pages for Research Strategy

    Key Terminology (BEST Resource, line 213-260):
    - Biomarker: Defined characteristic indicating normal/pathogenic processes or responses
    - Clinical Outcome Assessment (COA): Assessment of how individual feels/functions/survives
      (clinician-reported, observer-reported, patient-reported, performance outcomes)
    - Context of Use (COU): Statement describing tool use and development purpose
    - Validation: Process establishing acceptable performance for intended purpose
      - Clinical validation: Test/tool identifies, measures, or predicts concept of interest
      - Analytical validation: Technical performance (sensitivity, specificity, accuracy, precision)

    Expected cfp_analysis Output:
    - subject: Clinical trial readiness for rare diseases (R21 mechanism)
    - organization: National Institutes of Health (NIH) / NCATS
    - content: Structured sections covering:
        * Evidence Supporting Rare Disease Classification
        * Urgent Need for Clinical Trial Readiness
        * Biomarkers and Context of Use
        * Research Strategy components (Aims, Significance, Innovation, Approach)
        * Team/Environment/Resources
        * Budget components
    - analysis_metadata.categories: Clinical trial readiness, rare disease research,
      biomarker validation, outcome measures, R21 mechanism
    - analysis_metadata.constraints:
        * Page limit: 6 pages Research Strategy
        * Must include rare disease classification evidence (non-responsive if missing)
        * Clinical trial readiness subsection required
        * BEST Resource terminology required for biomarkers/COAs
        * No clinical trials allowed (R21 Clinical Trial Not Allowed)
        * Must have candidate therapeutics ready for testing after study completion
    """
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("test_type", "cfp_extraction_e2e")
    performance_context.set_metadata("cfp_file", str(nih_par_25_450_cfp_file))

    logger.info("🧪 Starting NIH PAR-25-450 CFP extraction E2E test")

    assert nih_par_25_450_cfp_file.exists(), f"NIH PAR-25-450 CFP file not found: {nih_par_25_450_cfp_file}"

    performance_context.start_stage("setup_rag_sources")

    grant_template = await create_test_grant_template(
        async_session_maker=async_session_maker,
        granting_institution=nih_granting_institution,
        organization=test_organization,
        title="NIH PAR-25-450 CFP E2E Test Template",
    )

    cfp_content = ""
    if nih_par_25_450_cfp_file.suffix == ".pdf":
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

        template_source = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)

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
        trace_id="nih-par-25-450-e2e-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_extraction_results")

    assert cfp_analysis is not None, "CFP analysis should return data"
    assert cfp_analysis.subject is not None, "CFP analysis should contain subject"
    assert cfp_analysis.content is not None, "CFP analysis should contain content sections"
    assert cfp_analysis.org_id is not None, "CFP analysis should contain org_id"

    subject = cfp_analysis.subject
    content_sections = cfp_analysis.content

    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"

    subject_lower = subject.lower()
    nih_indicators = any(term in subject_lower for term in ["nih", "clinical trial", "rare disease", "r21"])
    assert nih_indicators, f"Subject should indicate NIH/rare disease focus: {subject}"

    assert cfp_analysis.organization is not None, "CFP analysis should identify organization"
    assert cfp_analysis.organization.full_name == nih_granting_institution.full_name, (
        f"Should identify NIH: {cfp_analysis.organization.full_name}"
    )

    assert cfp_analysis.analysis_metadata is not None, "CFP analysis should contain analysis metadata"
    assert "categories" in cfp_analysis.analysis_metadata, "Analysis should contain categories"
    assert len(cfp_analysis.analysis_metadata["categories"]) > 0, "Should identify requirement categories"

    assert isinstance(content_sections, list), "Content should be list of sections"
    assert len(content_sections) > 0, "Should extract at least one section"

    for section in content_sections:
        assert "title" in section, f"Section missing title: {section}"
        assert "subtitles" in section, f"Section missing subtitles: {section}"
        assert isinstance(section["title"], str), f"Section title should be string: {section['title']}"
        assert isinstance(section["subtitles"], list), f"Subtitles should be list: {section['subtitles']}"
        assert len(section["subtitles"]) > 0, f"Section should have subtitles: {section['title']}"

    performance_context.end_stage()

    performance_context.start_stage("validate_nih_specific_content")

    extracted_titles = [section["title"].lower() for section in content_sections]

    research_found = any("research" in title or "aim" in title for title in extracted_titles)
    any("clinical" in title or "trial" in title for title in extracted_titles)
    budget_found = any("budget" in title for title in extracted_titles)

    assert research_found, f"Should find research-related section in: {extracted_titles}"
    assert budget_found, f"Should find budget section in: {extracted_titles}"

    all_text = " ".join(
        [section["title"] + " " + " ".join(section["subtitles"]) for section in content_sections]
    ).lower()

    nih_keywords = ["research", "clinical", "trial", "rare disease", "budget", "nih"]
    found_keywords = [kw for kw in nih_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain NIH-specific terms: {found_keywords}"

    performance_context.end_stage()

    performance_context.start_stage("validate_section_quality")

    total_subtitles = sum(len(section["subtitles"]) for section in content_sections)
    assert total_subtitles >= 5, f"Should extract substantial content: {total_subtitles} subtitles"

    substantial_sections = [s for s in content_sections if len(s["subtitles"]) >= 2]
    assert len(substantial_sections) >= 2, "Should have multiple substantial sections"

    performance_context.end_stage()

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


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_TEMPLATE, timeout=600)
async def test_nih_par_25_450_section_structure_validation(
    logger: logging.Logger,
    expected_nih_par_25_450_sections: list[dict[str, Any]],
    performance_context: PerformanceTestContext,
) -> None:
    performance_context.set_metadata("test_type", "section_structure_validation")
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("grant_mechanism", "R21")

    logger.info("📋 Validating NIH PAR-25-450 CFP expected section structure")

    performance_context.start_stage("validate_expected_sections")

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

    section_titles = [section["title"].lower() for section in expected_nih_par_25_450_sections]

    research_sections = [title for title in section_titles if "research" in title]
    clinical_sections = [title for title in section_titles if "clinical" in title or "trial" in title]
    budget_sections = [title for title in section_titles if "budget" in title]

    assert len(research_sections) > 0, f"Should have research sections: {section_titles}"
    assert len(budget_sections) > 0, f"Should have budget sections: {section_titles}"

    clinical_subsections = []
    for section in expected_nih_par_25_450_sections:
        if "clinical" in section["title"].lower() or "trial" in section["title"].lower():
            clinical_subsections.extend(section["expected_subsections"])

    if clinical_subsections:
        clinical_terms = ["regulatory", "trial", "outcome", "safety", "design"]
        found_clinical_terms = [
            term for term in clinical_terms if any(term in subsection.lower() for subsection in clinical_subsections)
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
