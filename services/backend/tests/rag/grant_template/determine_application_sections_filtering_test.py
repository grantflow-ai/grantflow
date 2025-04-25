from src.rag.grant_template.determine_application_sections import (
    ExtractedSectionDTO,
    ExtractedSections,
    filter_extracted_sections,
)

SECTION_OUTPOUT: ExtractedSections = {
    "error": None,
    "sections": [
        {
            "title": "Abstracts",
            "id": "abstracts",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 1,
        },
        {
            "title": "Scientific Background",
            "id": "scientific_background",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 3,
        },
        {
            "title": "Research Question",
            "id": "research_question",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 4,
        },
        {
            "title": "Study Design",
            "id": "study_design",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 5,
        },
        {
            "title": "Detailed Plan & Methods",
            "id": "detailed_plan_methods",
            "parent_id": "study_design",
            "is_detailed_workplan": True,
            "is_long_form": True,
            "order": 6,
        },
        {
            "title": "Sample Size Justification",
            "id": "sample_size_justification",
            "parent_id": "study_design",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 7,
        },
        {
            "title": "Preliminary Results",
            "id": "preliminary_results",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 8,
        },
        {
            "title": "Schematic Representation",
            "id": "schematic_representation",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 9,
        },
        {
            "title": "Partner Responsibilities",
            "id": "partner_responsibilities",
            "parent_id": "schematic_representation",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 10,
        },
        {
            "title": "Time Estimate for Each Stage",
            "id": "time_estimate_each_stage",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 11,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 2,
        },
        {
            "title": "Budget",
            "id": "budget",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 12,
        },
        {
            "title": "Curriculum Vitae",
            "id": "curriculum_vitae",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 13,
        },
        {
            "title": "Collaboration Letters",
            "id": "collaboration_letters",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 14,
        },
        {
            "title": "Bio-Ethics Approvals",
            "id": "bio_ethics_approvals",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 15,
        },
        {
            "title": "Suggested Reviewers",
            "id": "suggested_reviewers",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 16,
        },
        {
            "title": "Checklist",
            "id": "checklist",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "order": 17,
        },
    ],
}


async def test_section_filtering() -> None:
    result = await filter_extracted_sections(sections=SECTION_OUTPOUT["sections"])
    assert len(result) > 0
    assert any(s.get("is_detailed_workplan") for s in result)


async def test_section_filtering_empty_input() -> None:
    result = await filter_extracted_sections(sections=[])
    assert result == []


async def test_section_filtering_always_keeps_workplan() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Methods",
            "id": "methods",
            "parent_id": None,
            "is_detailed_workplan": True,
            "is_long_form": True,
            "order": 1,
        }
    ]
    result = await filter_extracted_sections(sections=sections, initial_threshold=0.1)
    assert len(result) == 1
    assert result[0]["title"] == "Methods"


async def test_section_filtering_keeps_long_form_parents() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "parent_id": None,
            "is_detailed_workplan": False,
            "is_long_form": False,
            "order": 1,
        },
        {
            "title": "Methods",
            "id": "methods",
            "parent_id": "research_plan",
            "is_detailed_workplan": True,
            "is_long_form": True,
            "order": 2,
        },
    ]
    result = await filter_extracted_sections(sections=sections, initial_threshold=0.9)
    assert len(result) == 2
    assert any(s["id"] == "research_plan" for s in result)


async def test_section_filtering_removes_non_long_form() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Workplan",
            "id": "workplan",
            "parent_id": None,
            "is_detailed_workplan": True,
            "is_long_form": True,
            "order": 1,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "parent_id": None,
            "is_detailed_workplan": False,
            "is_long_form": False,
            "order": 2,
        },
    ]
    result = await filter_extracted_sections(sections=sections, initial_threshold=0.9)
    assert len(result) == 1
    assert result[0]["id"] == "workplan"


async def test_section_filtering_threshold() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Methods Section",
            "id": "methods",
            "parent_id": None,
            "is_detailed_workplan": False,
            "is_long_form": True,
            "order": 1,
        }
    ]

    high_result = await filter_extracted_sections(sections=sections, initial_threshold=0.9)
    assert len(high_result) == 1

    await filter_extracted_sections(sections=sections, initial_threshold=0.5)


async def test_adaptive_threshold_preserves_workplan() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Methods",
            "id": "methods",
            "parent_id": None,
            "is_detailed_workplan": True,
            "is_long_form": True,
            "order": 1,
        }
    ]

    result = await filter_extracted_sections(sections=sections, initial_threshold=0.1)
    assert len(result) == 1
    assert result[0]["is_detailed_workplan"] is True


async def test_maintain_hierarchy_integrity() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "parent_id": None,
            "is_detailed_workplan": False,
            "is_long_form": True,
            "order": 1,
        },
        {
            "title": "Methods",
            "id": "methods",
            "parent_id": "research_plan",
            "is_detailed_workplan": True,
            "is_long_form": True,
            "order": 2,
        },
        {
            "title": "Budget",
            "id": "budget",
            "parent_id": None,
            "is_detailed_workplan": False,
            "is_long_form": False,
            "order": 3,
        },
    ]

    result = await filter_extracted_sections(sections=sections, initial_threshold=0.5)

    assert any(s["is_detailed_workplan"] for s in result)

    orders = [s["order"] for s in result]
    assert min(orders) == 1
    assert max(orders) == len(orders)

    for section in result:
        if section.get("parent_id"):
            assert any(s["id"] == section["parent_id"] for s in result)
