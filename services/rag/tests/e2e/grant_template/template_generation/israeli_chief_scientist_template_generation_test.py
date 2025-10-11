import logging
from unittest.mock import AsyncMock

import pytest
from packages.db.src.json_objects import (
    CFPAnalysis,
    CFPSection,
    GrantLongFormSection,
    LengthConstraint,
    OrganizationNamespace,
)
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.template_generation import handle_template_generation, is_long_form_section
from services.rag.src.utils.lengths import WORDS_PER_PAGE, constraint_to_word_limit


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_israeli_chief_scientist_template_generation_end_to_end(
    logger: logging.Logger,
    performance_context: PerformanceTestContext,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("cfp_type", "israeli_chief_scientist")
    performance_context.set_metadata("test_type", "template_generation_e2e")

    logger.info("🧪 Starting Israeli Chief Scientist template generation E2E test")

    performance_context.start_stage("setup_cfp_analysis")

    cfp_analysis = CFPAnalysis(
        subject="Israeli Innovation Authority R&D Support Program - Technology Development Grant",
        sections=[
            CFPSection(
                id="executive_summary",
                title="Executive Summary",
                parent_id=None,
                length_constraint=LengthConstraint(
                    type="words",
                    value=2 * WORDS_PER_PAGE,
                    source="2 pages",
                ),
            ),
            CFPSection(
                id="technology_description",
                title="Technology and Innovation Description",
                parent_id=None,
                length_constraint=LengthConstraint(
                    type="words",
                    value=5 * WORDS_PER_PAGE,
                    source="5 pages",
                ),
            ),
            CFPSection(
                id="market_analysis",
                title="Market Analysis and Commercialization Strategy",
                parent_id=None,
            ),
            CFPSection(
                id="work_plan",
                title="Detailed Work Plan and Milestones",
                parent_id=None,
            ),
            CFPSection(
                id="budget",
                title="Budget and Financial Projections",
                parent_id=None,
                length_constraint=LengthConstraint(
                    type="words",
                    value=3 * WORDS_PER_PAGE,
                    source="3 pages",
                ),
            ),
            CFPSection(
                id="company_background",
                title="Company Background and Capabilities",
                parent_id=None,
            ),
            CFPSection(
                id="team",
                title="Team Qualifications and Experience",
                parent_id=None,
            ),
        ],
        deadlines=["2025-06-30"],
        global_constraints=[],
        organization=OrganizationNamespace(
            id="iia-org-id",
            full_name="Israeli Innovation Authority",
            abbreviation="IIA",
            guidelines="Israeli Innovation Authority supports industrial R&D. Applications must demonstrate technological innovation, market potential, and company capability to execute. Hebrew and English applications accepted.",
        ),
    )

    performance_context.end_stage()

    performance_context.start_stage("generate_template")

    grant_sections = await handle_template_generation(
        cfp_analysis=cfp_analysis,
        job_manager=mock_job_manager,
        trace_id="israeli-template-gen-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_template_structure")

    assert grant_sections is not None
    assert len(grant_sections) > 0

    long_form_sections: list[GrantLongFormSection] = [s for s in grant_sections if is_long_form_section(s)]
    assert len(long_form_sections) > 0

    performance_context.end_stage()

    performance_context.start_stage("validate_work_plan")

    research_plan_sections = [s for s in long_form_sections if s.get("is_detailed_research_plan")]
    assert len(research_plan_sections) == 1

    work_plan = research_plan_sections[0]
    assert len(work_plan["keywords"]) >= 5
    assert len(work_plan["topics"]) >= 3
    assert len(work_plan["generation_instructions"]) >= 50
    assert len(work_plan["search_queries"]) >= 3

    performance_context.end_stage()

    performance_context.start_stage("validate_israeli_specificity")

    section_titles = [s["title"].lower() for s in grant_sections]

    any("market" in title or "commercial" in title for title in section_titles)
    has_tech_section = any("technology" in title or "innovation" in title for title in section_titles)
    has_budget_section = any("budget" in title or "financial" in title for title in section_titles)

    assert has_tech_section
    assert has_budget_section

    performance_context.end_stage()

    total_words = sum(constraint_to_word_limit(section.get("length_constraint")) or 0 for section in long_form_sections)
    performance_context.set_metadata("total_sections", len(grant_sections))
    performance_context.set_metadata("total_word_count", total_words)

    logger.info(
        "✅ Israeli Chief Scientist template generation E2E test completed successfully",
        extra={"total_sections": len(grant_sections), "total_words": total_words},
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
