from src.rag.grant_template.extract_sections import filter_extracted_sections

SECTION_OUTPOUT = {
    "error": None,
    "sections": [
        {"title": "Abstracts", "id": "abstracts", "parent_id": None, "is_detailed_workplan": None},
        {
            "title": "Scientific Background",
            "id": "scientific_background",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
        },
        {
            "title": "Research Question",
            "id": "research_question",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
        },
        {"title": "Study Design", "id": "study_design", "parent_id": "research_plan", "is_detailed_workplan": None},
        {
            "title": "Detailed Plan & Methods",
            "id": "detailed_plan_methods",
            "parent_id": "study_design",
            "is_detailed_workplan": True,
        },
        {
            "title": "Sample Size Justification",
            "id": "sample_size_justification",
            "parent_id": "study_design",
            "is_detailed_workplan": None,
        },
        {
            "title": "Preliminary Results",
            "id": "preliminary_results",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
        },
        {
            "title": "Schematic Representation",
            "id": "schematic_representation",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
        },
        {
            "title": "Partner Responsibilities",
            "id": "partner_responsibilities",
            "parent_id": "schematic_representation",
            "is_detailed_workplan": None,
        },
        {
            "title": "Time Estimate for Each Stage",
            "id": "time_estimate_each_stage",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
        },
        {"title": "Budget", "id": "budget", "parent_id": None, "is_detailed_workplan": None},
        {"title": "Curriculum Vitae", "id": "curriculum_vitae", "parent_id": None, "is_detailed_workplan": None},
        {
            "title": "Collaboration Letters",
            "id": "collaboration_letters",
            "parent_id": None,
            "is_detailed_workplan": None,
        },
        {
            "title": "Bio-Ethics Approvals",
            "id": "bio_ethics_approvals",
            "parent_id": None,
            "is_detailed_workplan": None,
        },
        {"title": "Suggested Reviewers", "id": "suggested_reviewers", "parent_id": None, "is_detailed_workplan": None},
        {"title": "Checklist", "id": "checklist", "parent_id": None, "is_detailed_workplan": None},
    ],
}


async def test_section_filtering() -> None:
    result = await filter_extracted_sections(sections=SECTION_OUTPOUT["sections"])
    assert result
