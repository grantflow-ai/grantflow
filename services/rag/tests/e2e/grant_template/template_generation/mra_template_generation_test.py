import logging
from unittest.mock import AsyncMock

import pytest
from packages.db.src.json_objects import CFPAnalysis, CFPAnalysisConstraint, CFPSection, OrganizationNamespace
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.template_generation import handle_template_generation


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_mra_template_generation_end_to_end(
    logger: logging.Logger,
    performance_context: PerformanceTestContext,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("cfp_type", "mra")
    performance_context.set_metadata("test_type", "template_generation_e2e")

    logger.info("🧪 Starting MRA template generation E2E test")

    performance_context.start_stage("setup_cfp_analysis")

    cfp_analysis = CFPAnalysis(
        subject="Melanoma Research Alliance Request for Proposals - Innovative Melanoma Research",
        sections=[
            CFPSection(
                id="research_proposal",
                title="Research Proposal",
                parent_id=None,
                constraints=[
                    CFPAnalysisConstraint(type="page_limit", value="10 pages maximum"),
                ],
            ),
            CFPSection(
                id="specific_aims",
                title="Specific Aims",
                parent_id="research_proposal",
                constraints=[],
            ),
            CFPSection(
                id="background",
                title="Background and Significance",
                parent_id="research_proposal",
                constraints=[],
            ),
            CFPSection(
                id="research_design",
                title="Research Design and Methods",
                parent_id="research_proposal",
                constraints=[],
            ),
            CFPSection(
                id="timeline",
                title="Project Timeline",
                parent_id="research_proposal",
                constraints=[],
            ),
            CFPSection(
                id="budget_justification",
                title="Budget and Budget Justification",
                parent_id=None,
                constraints=[
                    CFPAnalysisConstraint(type="page_limit", value="2 pages"),
                ],
            ),
            CFPSection(
                id="facilities",
                title="Facilities and Resources",
                parent_id=None,
                constraints=[],
            ),
        ],
        deadlines=["2024-12-15"],
        global_constraints=[],
        organization=OrganizationNamespace(
            id="mra-org-id",
            full_name="Melanoma Research Alliance",
            abbreviation="MRA",
            guidelines="MRA supports innovative melanoma research. Proposals should emphasize scientific rigor, innovation, and potential clinical impact. Collaborative projects encouraged.",
        ),
    )

    performance_context.end_stage()

    performance_context.start_stage("generate_template")

    grant_sections = await handle_template_generation(
        cfp_analysis=cfp_analysis,
        organization_guidelines=cfp_analysis["organization"]["guidelines"],
        job_manager=mock_job_manager,
        trace_id="mra-template-gen-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_template_structure")

    assert grant_sections is not None
    assert len(grant_sections) > 0

    long_form_sections = [s for s in grant_sections if "max_words" in s]
    assert len(long_form_sections) > 0

    performance_context.end_stage()

    performance_context.start_stage("validate_research_proposal")

    research_plan_sections = [s for s in long_form_sections if s.get("is_detailed_research_plan")]
    assert len(research_plan_sections) == 1

    research_plan = research_plan_sections[0]
    assert len(research_plan["keywords"]) >= 5
    assert len(research_plan["topics"]) >= 3
    assert len(research_plan["generation_instructions"]) >= 50
    assert len(research_plan["search_queries"]) >= 3

    performance_context.end_stage()

    performance_context.start_stage("validate_melanoma_specificity")

    section_titles = [s["title"].lower() for s in grant_sections]
    has_research_section = any("research" in title or "proposal" in title for title in section_titles)
    has_budget_section = any("budget" in title for title in section_titles)

    assert has_research_section
    assert has_budget_section

    performance_context.end_stage()

    total_words = sum(s.get("max_words", 0) for s in long_form_sections)
    performance_context.set_metadata("total_sections", len(grant_sections))
    performance_context.set_metadata("total_word_count", total_words)

    logger.info(
        "✅ MRA template generation E2E test completed successfully",
        extra={"total_sections": len(grant_sections), "total_words": total_words},
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
