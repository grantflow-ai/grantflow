from src.rag.grant_template.extract_sections import (
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
        },
        {
            "title": "Scientific Background",
            "id": "scientific_background",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Research Question",
            "id": "research_question",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Study Design",
            "id": "study_design",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Detailed Plan & Methods",
            "id": "detailed_plan_methods",
            "parent_id": "study_design",
            "is_detailed_workplan": True,
            "is_long_form": True,
        },
        {
            "title": "Sample Size Justification",
            "id": "sample_size_justification",
            "parent_id": "study_design",
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Preliminary Results",
            "id": "preliminary_results",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Schematic Representation",
            "id": "schematic_representation",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Partner Responsibilities",
            "id": "partner_responsibilities",
            "parent_id": "schematic_representation",
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Time Estimate for Each Stage",
            "id": "time_estimate_each_stage",
            "parent_id": "research_plan",
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {"title": "Budget", "id": "budget", "parent_id": None, "is_detailed_workplan": None, "is_long_form": True},
        {
            "title": "Curriculum Vitae",
            "id": "curriculum_vitae",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Collaboration Letters",
            "id": "collaboration_letters",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Bio-Ethics Approvals",
            "id": "bio_ethics_approvals",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Suggested Reviewers",
            "id": "suggested_reviewers",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
        {
            "title": "Checklist",
            "id": "checklist",
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
        },
    ],
}


async def test_section_filtering() -> None:
    """Test basic filtering functionality."""
    result = await filter_extracted_sections(sections=SECTION_OUTPOUT["sections"])
    assert len(result) > 0
    assert any(s.get("is_detailed_workplan") for s in result)


async def test_section_filtering_empty_input() -> None:
    """Test handling of empty input."""
    result = await filter_extracted_sections(sections=[])
    assert result == []


async def test_section_filtering_always_keeps_workplan() -> None:
    """Test that workplan sections are always kept regardless of title."""
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Methods",  # This is in EXCLUDE_CATEGORIES
            "id": "methods",
            "parent_id": None,
            "is_detailed_workplan": True,
            "is_long_form": True,
        }
    ]
    result = await filter_extracted_sections(sections=sections)
    assert len(result) == 1
    assert result[0]["title"] == "Methods"


async def test_section_filtering_keeps_long_form_parents() -> None:
    """Test that non-long-form sections are kept if they have long-form children."""
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "parent_id": None,
            "is_detailed_workplan": False,
            "is_long_form": False,
        },
        {
            "title": "Methods",
            "id": "methods",
            "parent_id": "research_plan",
            "is_detailed_workplan": False,
            "is_long_form": True,
        },
    ]
    result = await filter_extracted_sections(sections=sections)
    assert len(result) == 2
    assert any(s["id"] == "research_plan" for s in result)


async def test_section_filtering_removes_non_long_form() -> None:
    """Test that non-long-form sections without long-form children are removed."""
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "parent_id": None,
            "is_detailed_workplan": False,
            "is_long_form": False,
        }
    ]
    result = await filter_extracted_sections(sections=sections)
    assert len(result) == 0


async def test_section_filtering_threshold() -> None:
    """Test that similarity threshold affects which sections are kept."""
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Methods Section",  # Very similar to 'Methods'
            "id": "methods",
            "parent_id": None,
            "is_detailed_workplan": False,
            "is_long_form": True,
        }
    ]
    # High threshold should keep the section
    high_result = await filter_extracted_sections(sections=sections, threshold=0.9)
    assert len(high_result) == 1

    # Low threshold should filter it out
    low_result = await filter_extracted_sections(sections=sections, threshold=0.5)
    assert len(low_result) == 0
