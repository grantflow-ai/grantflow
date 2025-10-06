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
    assert cfp_analysis.get("subject"), "CFP analysis should contain subject"
    assert cfp_analysis.get("content"), "CFP analysis should contain content sections"
    assert cfp_analysis.get("organization"), "CFP analysis should contain organization"

    subject = cfp_analysis["subject"]
    content_sections = cfp_analysis["content"]

    assert isinstance(subject, str), "Subject should be string"
    assert len(subject) > 10, f"Subject too short: {len(subject)} chars"

    subject_lower = subject.lower()
    nih_indicators = any(term in subject_lower for term in ["nih", "clinical trial", "rare disease", "r21"])
    assert nih_indicators, f"Subject should indicate NIH/rare disease focus: {subject}"

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

    performance_context.start_stage("validate_nih_specific_content")

    extracted_titles = [section["title"].lower() for section in content_sections]

    research_found = any("research" in title or "aim" in title for title in extracted_titles)
    any("clinical" in title or "trial" in title for title in extracted_titles)
    budget_found = any("budget" in title for title in extracted_titles)

    assert research_found, f"Should find research-related section in: {extracted_titles}"
    assert budget_found, f"Should find budget section in: {extracted_titles}"

    all_text = " ".join(s["title"] for s in content_sections).lower()

    nih_keywords = ["research", "clinical", "trial", "rare disease", "budget", "nih"]
    found_keywords = [kw for kw in nih_keywords if kw in all_text]
    assert len(found_keywords) >= 3, f"Should contain NIH-specific terms: {found_keywords}"

    performance_context.end_stage()

    performance_context.start_stage("validate_section_quality")

    parent_sections = [s for s in content_sections if s.get("parent_id") is None]
    child_sections = [s for s in content_sections if s.get("parent_id") is not None]

    assert len(parent_sections) > 0, "Should have at least one parent section"
    assert len(child_sections) > 0, "Should have at least one child section"

    performance_context.end_stage()

    performance_context.set_metadata("extracted_sections_count", len(content_sections))
    performance_context.set_metadata("parent_sections_count", len(parent_sections))
    performance_context.set_metadata("child_sections_count", len(child_sections))
    performance_context.set_metadata("subject_length", len(subject))
    performance_context.set_metadata("nih_keywords_found", found_keywords)

    logger.info(
        "✅ NIH PAR-25-450 CFP extraction E2E test completed successfully",
        extra={
            "sections_extracted": len(content_sections),
            "parent_sections": len(parent_sections),
            "child_sections": len(child_sections),
            "subject_preview": subject[:100] + "..." if len(subject) > 100 else subject,
            "keywords_found": found_keywords,
        },
    )
