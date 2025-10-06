import logging
from unittest.mock import AsyncMock

import pytest
from packages.db.src.json_objects import CFPAnalysis, CFPAnalysisConstraint, CFPSection, OrganizationNamespace
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.template_generation import handle_template_generation


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_TEMPLATE, timeout=1800)
async def test_nih_par_25_450_template_generation_end_to_end(
    logger: logging.Logger,
    performance_context: PerformanceTestContext,
    mock_job_manager: AsyncMock,
) -> None:
    performance_context.set_metadata("cfp_type", "nih_par_25_450")
    performance_context.set_metadata("test_type", "template_generation_e2e")

    logger.info("🧪 Starting NIH PAR-25-450 template generation E2E test")

    performance_context.start_stage("setup_cfp_analysis")

    cfp_analysis = CFPAnalysis(
        subject="Clinical Trial Readiness for Rare Diseases, Disorders, and Syndromes (R21 Clinical Trial Not Allowed)",
        sections=[
            CFPSection(
                id="research_strategy",
                title="Research Strategy",
                parent_id=None,
                constraints=[
                    CFPAnalysisConstraint(type="page_limit", value="6 pages maximum"),
                    CFPAnalysisConstraint(type="font", value="Arial 11pt or Times New Roman 12pt"),
                ],
            ),
            CFPSection(
                id="rare_disease_classification",
                title="Evidence Supporting Rare Disease Classification",
                parent_id="research_strategy",
                constraints=[],
            ),
            CFPSection(
                id="clinical_trial_readiness",
                title="Urgent Need for Clinical Trial Readiness",
                parent_id="research_strategy",
                constraints=[],
            ),
            CFPSection(
                id="biomarkers_context_of_use",
                title="Biomarkers and Context of Use",
                parent_id="research_strategy",
                constraints=[],
            ),
            CFPSection(
                id="specific_aims",
                title="Specific Aims",
                parent_id="research_strategy",
                constraints=[],
            ),
            CFPSection(
                id="significance",
                title="Significance",
                parent_id="research_strategy",
                constraints=[],
            ),
            CFPSection(
                id="innovation",
                title="Innovation",
                parent_id="research_strategy",
                constraints=[],
            ),
            CFPSection(
                id="approach",
                title="Approach",
                parent_id="research_strategy",
                constraints=[],
            ),
            CFPSection(
                id="budget_justification",
                title="Budget Justification",
                parent_id=None,
                constraints=[],
            ),
            CFPSection(
                id="facilities_resources",
                title="Facilities & Other Resources",
                parent_id=None,
                constraints=[],
            ),
        ],
        deadlines=["2025-09-07", "2026-01-07", "2026-05-07"],
        global_constraints=[
            CFPAnalysisConstraint(type="margin", value="At least ½ inch margins"),
        ],
        organization=OrganizationNamespace(
            id="nih-org-id",
            full_name="National Institutes of Health",
            abbreviation="NIH",
            guidelines="NIH grant applications follow SF424 R&R format. Research Strategy limited to 6 pages for R21 mechanism. Must use BEST Resource terminology for biomarkers and clinical outcome assessments.",
        ),
    )

    performance_context.end_stage()

    performance_context.start_stage("generate_template")

    grant_sections = await handle_template_generation(
        cfp_analysis=cfp_analysis,
        organization_guidelines=cfp_analysis["organization"]["guidelines"],
        job_manager=mock_job_manager,
        trace_id="nih-par-25-450-template-gen-test",
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_template_structure")

    assert grant_sections is not None, "Template generation should return grant sections"
    assert len(grant_sections) > 0, "Should generate at least one grant section"

    long_form_sections = [s for s in grant_sections if "max_words" in s]
    short_form_sections = [s for s in grant_sections if "max_words" not in s]

    assert len(long_form_sections) > 0, "Should have long-form sections requiring writing"

    logger.info(
        "Generated %d total sections: %d long-form, %d short-form",
        len(grant_sections),
        len(long_form_sections),
        len(short_form_sections),
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_research_strategy")

    research_plan_sections = [s for s in long_form_sections if s.get("is_detailed_research_plan")]
    assert len(research_plan_sections) == 1, (
        f"Exactly one section should be research plan, found {len(research_plan_sections)}"
    )

    research_plan = research_plan_sections[0]

    assert research_plan["keywords"], "Research plan should have keywords"
    assert len(research_plan["keywords"]) >= 5, (
        f"Research plan should have 5+ keywords, has {len(research_plan['keywords'])}"
    )

    assert research_plan["topics"], "Research plan should have topics"
    assert len(research_plan["topics"]) >= 3, f"Research plan should have 3+ topics, has {len(research_plan['topics'])}"

    assert research_plan["generation_instructions"], "Research plan should have generation instructions"
    assert len(research_plan["generation_instructions"]) >= 50, "Generation instructions should be detailed"

    assert research_plan["search_queries"], "Research plan should have search queries"
    assert len(research_plan["search_queries"]) >= 3, (
        f"Research plan should have 3+ queries, has {len(research_plan['search_queries'])}"
    )

    assert "max_words" in research_plan, "Research plan should have word count"
    assert research_plan["max_words"] >= 500, (
        f"Research plan should have substantial word count, has {research_plan['max_words']}"
    )

    assert "depends_on" in research_plan, "Research plan should have dependencies"
    assert isinstance(research_plan["depends_on"], list), "Dependencies should be a list"

    performance_context.end_stage()

    performance_context.start_stage("validate_word_count_allocation")

    total_words = sum(s.get("max_words", 0) for s in long_form_sections)

    expected_range = (1000, 5000)
    assert expected_range[0] <= total_words <= expected_range[1], (
        f"Total word count {total_words} outside expected range {expected_range}"
    )

    logger.info("Total allocated words: %d", total_words)

    performance_context.end_stage()

    performance_context.start_stage("validate_dependencies")

    section_ids = {s["id"] for s in grant_sections}

    for section in long_form_sections:
        for dep_id in section["depends_on"]:
            assert dep_id in section_ids, f"Invalid dependency '{dep_id}' in section '{section['id']}'"

        assert section["id"] not in section["depends_on"], f"Section '{section['id']}' cannot depend on itself"

    performance_context.end_stage()

    performance_context.start_stage("validate_nih_specific_requirements")

    section_titles = [s["title"].lower() for s in grant_sections]

    core_sections = ["research", "budget", "specific aims"]
    for core in core_sections:
        found = any(core in title for title in section_titles)
        assert found, f"Should include '{core}' section"

    has_rare_disease_section = any("rare disease" in title or "classification" in title for title in section_titles)
    has_biomarker_section = any("biomarker" in title or "outcome" in title for title in section_titles)

    assert has_rare_disease_section or has_biomarker_section, (
        "Should include rare disease-specific or biomarker sections for PAR-25-450"
    )

    performance_context.end_stage()

    performance_context.start_stage("validate_metadata_quality")

    for section in long_form_sections:
        assert all(len(kw) > 2 for kw in section["keywords"]), (
            f"Keywords too short in {section['id']}: {section['keywords']}"
        )

        assert all(len(topic) > 5 for topic in section["topics"]), (
            f"Topics too short in {section['id']}: {section['topics']}"
        )

        assert all(len(query.split()) >= 2 for query in section["search_queries"]), (
            f"Search queries too simple in {section['id']}: {section['search_queries']}"
        )

    performance_context.end_stage()

    performance_context.set_metadata("total_sections", len(grant_sections))
    performance_context.set_metadata("long_form_sections", len(long_form_sections))
    performance_context.set_metadata("total_word_count", total_words)
    performance_context.set_metadata("research_plan_keywords", len(research_plan["keywords"]))

    logger.info(
        "✅ NIH PAR-25-450 template generation E2E test completed successfully",
        extra={
            "total_sections": len(grant_sections),
            "long_form_sections": len(long_form_sections),
            "total_words": total_words,
            "research_plan_id": research_plan["id"],
        },
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
