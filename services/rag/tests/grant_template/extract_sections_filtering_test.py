from services.rag.src.grant_template.extract_sections import (
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
            "is_long_form": True,
            "order": 1,
            "evidence": "CFP evidence for Abstracts",
        },
        {
            "title": "Scientific Background",
            "id": "scientific_background",
            "parent_id": "research_plan",
            "is_long_form": True,
            "order": 3,
            "evidence": "CFP evidence for Scientific Background",
        },
        {
            "title": "Research Question",
            "id": "research_question",
            "parent_id": "research_plan",
            "is_long_form": True,
            "order": 4,
            "evidence": "CFP evidence for Research Question",
        },
        {
            "title": "Study Design",
            "id": "study_design",
            "parent_id": "research_plan",
            "is_long_form": True,
            "order": 5,
            "evidence": "CFP evidence for Study Design",
        },
        {
            "title": "Detailed Plan & Methods",
            "id": "detailed_plan_methods",
            "parent_id": "study_design",
            "is_detailed_research_plan": True,
            "is_long_form": True,
            "order": 6,
            "evidence": "CFP evidence for Detailed Plan & Methods",
        },
        {
            "title": "Sample Size Justification",
            "id": "sample_size_justification",
            "parent_id": "study_design",
            "is_long_form": True,
            "order": 7,
            "evidence": "CFP evidence for Sample Size Justification",
        },
        {
            "title": "Preliminary Results",
            "id": "preliminary_results",
            "parent_id": "research_plan",
            "is_long_form": True,
            "order": 8,
            "evidence": "CFP evidence for Preliminary Results",
        },
        {
            "title": "Schematic Representation",
            "id": "schematic_representation",
            "parent_id": "research_plan",
            "is_long_form": True,
            "order": 9,
            "evidence": "CFP evidence for Schematic Representation",
        },
        {
            "title": "Partner Responsibilities",
            "id": "partner_responsibilities",
            "parent_id": "schematic_representation",
            "is_long_form": True,
            "order": 10,
            "evidence": "CFP evidence for Partner Responsibilities",
        },
        {
            "title": "Time Estimate for Each Stage",
            "id": "time_estimate_each_stage",
            "parent_id": "research_plan",
            "is_long_form": True,
            "order": 11,
            "evidence": "CFP evidence for Time Estimate for Each Stage",
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "is_long_form": True,
            "order": 2,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Budget",
            "id": "budget",
            "is_long_form": True,
            "order": 12,
            "evidence": "CFP evidence for Budget",
        },
        {
            "title": "Curriculum Vitae",
            "id": "curriculum_vitae",
            "is_long_form": True,
            "order": 13,
            "evidence": "CFP evidence for Curriculum Vitae",
        },
        {
            "title": "Collaboration Letters",
            "id": "collaboration_letters",
            "is_long_form": True,
            "order": 14,
            "evidence": "CFP evidence for Collaboration Letters",
        },
        {
            "title": "Bio-Ethics Approvals",
            "id": "bio_ethics_approvals",
            "is_long_form": True,
            "order": 15,
            "evidence": "CFP evidence for Bio-Ethics Approvals",
        },
        {
            "title": "Suggested Reviewers",
            "id": "suggested_reviewers",
            "is_long_form": True,
            "order": 16,
            "evidence": "CFP evidence for Suggested Reviewers",
        },
        {
            "title": "Checklist",
            "id": "checklist",
            "is_long_form": True,
            "order": 17,
            "evidence": "CFP evidence for Checklist",
        },
    ],
}


async def test_section_filtering() -> None:
    result = await filter_extracted_sections(sections=SECTION_OUTPOUT["sections"], trace_id="test-trace")
    assert len(result) > 0
    assert any(s.get("is_detailed_research_plan") for s in result)


async def test_section_filtering_empty_input() -> None:
    result = await filter_extracted_sections(sections=[], trace_id="test-trace")
    assert result == []


async def test_section_filtering_always_keeps_research_plan() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Methods",
            "id": "methods",
            "is_detailed_research_plan": True,
            "is_long_form": True,
            "order": 1,
            "evidence": "CFP evidence for Methods",
        }
    ]
    result = await filter_extracted_sections(sections=sections, trace_id="test-trace", initial_threshold=0.1)
    assert len(result) == 1
    assert result[0]["title"] == "Methods"


async def test_section_filtering_keeps_long_form_parents() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "is_detailed_research_plan": False,
            "is_long_form": False,
            "order": 1,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Methods",
            "id": "methods",
            "parent_id": "research_plan",
            "is_detailed_research_plan": True,
            "is_long_form": True,
            "order": 2,
            "evidence": "CFP evidence for Methods",
        },
    ]
    result = await filter_extracted_sections(sections=sections, trace_id="test-trace", initial_threshold=0.9)
    assert len(result) == 2
    assert any(s["id"] == "research_plan" for s in result)


async def test_section_filtering_removes_non_long_form() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "is_detailed_research_plan": True,
            "is_long_form": True,
            "order": 1,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "is_detailed_research_plan": False,
            "is_long_form": False,
            "order": 2,
            "evidence": "CFP evidence for Research Plan",
        },
    ]
    result = await filter_extracted_sections(sections=sections, trace_id="test-trace", initial_threshold=0.9)
    assert len(result) == 1
    assert result[0]["id"] == "research_plan"


async def test_section_filtering_threshold() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Methods Section",
            "id": "methods",
            "is_detailed_research_plan": False,
            "is_long_form": True,
            "order": 1,
            "evidence": "CFP evidence for Research Methods Section",
        }
    ]

    high_result = await filter_extracted_sections(sections=sections, trace_id="test-trace", initial_threshold=0.9)
    assert len(high_result) == 1

    await filter_extracted_sections(sections=sections, trace_id="test-trace", initial_threshold=0.5)


async def test_adaptive_threshold_preserves_research_plan() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Methods",
            "id": "methods",
            "is_detailed_research_plan": True,
            "is_long_form": True,
            "order": 1,
            "evidence": "CFP evidence for Methods",
        }
    ]

    result = await filter_extracted_sections(sections=sections, trace_id="test-trace", initial_threshold=0.1)
    assert len(result) == 1
    assert result[0]["is_detailed_research_plan"] is True


async def test_maintain_hierarchy_integrity() -> None:
    sections: list[ExtractedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "is_detailed_research_plan": False,
            "is_long_form": True,
            "order": 1,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Methods",
            "id": "methods",
            "parent_id": "research_plan",
            "is_detailed_research_plan": True,
            "is_long_form": True,
            "order": 2,
            "evidence": "CFP evidence for Methods",
        },
        {
            "title": "Budget",
            "id": "budget",
            "is_detailed_research_plan": False,
            "is_long_form": False,
            "order": 3,
            "evidence": "CFP evidence for Budget",
        },
    ]

    result = await filter_extracted_sections(sections=sections, trace_id="test-trace", initial_threshold=0.5)

    assert any(s["is_detailed_research_plan"] for s in result)

    orders = [s["order"] for s in result]
    assert min(orders) == 1
    assert max(orders) == len(orders)

    for section in result:
        if section.get("parent_id"):
            assert any(s["id"] == section["parent_id"] for s in result)
