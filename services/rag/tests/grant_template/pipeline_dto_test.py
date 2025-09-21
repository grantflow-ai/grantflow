from typing import TYPE_CHECKING
from uuid import uuid4

if TYPE_CHECKING:
    from packages.db.src.json_objects import CFPAnalysisResult

    from services.rag.src.grant_template.dto import (
        AnalyzeCFPContentStageDTO,
        ExtractCFPContentStageDTO,
        ExtractedCFPData,
        ExtractionSectionsStageDTO,
        OrganizationNamespace,
        StageDTO,
    )
    from services.rag.src.grant_template.extract_sections import ExtractedSectionDTO


def test_extract_cfp_content_stage_dto_structure() -> None:
    org_id = uuid4()
    organization: OrganizationNamespace = {
        "organization_id": org_id,
        "full_name": "National Institutes of Health",
        "abbreviation": "NIH",
    }

    extracted_data: ExtractedCFPData = {
        "organization_id": str(org_id),
        "cfp_subject": "Advanced Research Grant",
        "submission_date": "2025-03-31",
        "content": [
            {
                "title": "Project Summary",
                "subtitles": ["Overview", "Objectives"],
            }
        ],
    }

    stage_dto: ExtractCFPContentStageDTO = {
        "organization": organization,
        "extracted_data": extracted_data,
    }

    assert stage_dto["organization"] == organization
    assert stage_dto["extracted_data"] == extracted_data
    assert stage_dto["organization"]["organization_id"] == org_id
    assert stage_dto["extracted_data"]["cfp_subject"] == "Advanced Research Grant"


def test_extract_cfp_content_stage_dto_no_organization() -> None:
    extracted_data: ExtractedCFPData = {
        "organization_id": None,
        "cfp_subject": "Generic Grant",
        "submission_date": None,
        "content": [],
    }

    stage_dto: ExtractCFPContentStageDTO = {
        "organization": None,
        "extracted_data": extracted_data,
    }

    assert stage_dto["organization"] is None
    assert stage_dto["extracted_data"]["organization_id"] is None
    assert stage_dto["extracted_data"]["cfp_subject"] == "Generic Grant"


def test_extract_cfp_content_stage_dto_complex_data() -> None:
    org_id = uuid4()
    organization: OrganizationNamespace = {
        "organization_id": org_id,
        "full_name": "National Science Foundation",
        "abbreviation": "NSF",
    }

    extracted_data: ExtractedCFPData = {
        "organization_id": str(org_id),
        "cfp_subject": "Multi-disciplinary Research Initiative",
        "submission_date": "2025-09-15",
        "content": [
            {
                "title": "Project Description",
                "subtitles": [
                    "Research Objectives",
                    "Innovation and Significance",
                    "Preliminary Studies",
                ],
            },
            {
                "title": "Research Plan",
                "subtitles": [
                    "Specific Aims",
                    "Background and Significance",
                    "Research Design and Methods",
                ],
            },
        ],
    }

    stage_dto: ExtractCFPContentStageDTO = {
        "organization": organization,
        "extracted_data": extracted_data,
    }

    assert len(stage_dto["extracted_data"]["content"]) == 2
    assert stage_dto["extracted_data"]["content"][0]["title"] == "Project Description"
    assert len(stage_dto["extracted_data"]["content"][0]["subtitles"]) == 3


def test_analyze_cfp_content_stage_dto_inheritance() -> None:
    org_id = uuid4()
    organization: OrganizationNamespace = {
        "organization_id": org_id,
        "full_name": "Department of Energy",
        "abbreviation": "DOE",
    }

    extracted_data: ExtractedCFPData = {
        "organization_id": str(org_id),
        "cfp_subject": "Energy Research Grant",
        "submission_date": "2025-06-30",
        "content": [
            {
                "title": "Research Plan",
                "subtitles": ["Methodology"],
            }
        ],
    }

    analysis_results: CFPAnalysisResult = {
        "cfp_analysis": {
            "sections_count": 3,
            "length_constraints_found": 2,
            "evaluation_criteria_count": 4,
            "required_sections": [],
            "length_constraints": [],
            "evaluation_criteria": [],
            "additional_requirements": [],
        },
        "nlp_analysis": {
            "money": ["$500,000 total budget"],
            "date_time": ["submission deadline March 15"],
            "writing_related": ["must submit proposal"],
            "other_numbers": ["3 year duration"],
            "recommendations": ["strongly recommended"],
            "orders": ["submit by deadline"],
            "positive_instructions": ["include detailed methodology"],
            "negative_instructions": ["do not exceed page limit"],
            "evaluation_criteria": ["innovation and impact"],
        },
        "analysis_metadata": {
            "categories_found": 5,
            "total_sentences": 20,
            "content_length": 1000,
        },
    }

    stage_dto: AnalyzeCFPContentStageDTO = {
        "organization": organization,
        "extracted_data": extracted_data,
        "analysis_results": analysis_results,
    }

    assert stage_dto["organization"] == organization
    assert stage_dto["extracted_data"] == extracted_data

    assert stage_dto["analysis_results"] == analysis_results
    assert stage_dto["analysis_results"]["analysis_metadata"]["categories_found"] == 5


def test_analyze_cfp_content_stage_dto_complete_analysis() -> None:
    org_id = uuid4()
    stage_dto: AnalyzeCFPContentStageDTO = {
        "organization": {
            "organization_id": org_id,
            "full_name": "National Institutes of Health",
            "abbreviation": "NIH",
        },
        "extracted_data": {
            "organization_id": str(org_id),
            "cfp_subject": "Biomedical Research Initiative",
            "submission_date": "2025-08-31",
            "content": [
                {
                    "title": "Significance",
                    "subtitles": ["Impact", "Innovation"],
                }
            ],
        },
        "analysis_results": {
            "cfp_analysis": {
                "sections_count": 5,
                "length_constraints_found": 3,
                "evaluation_criteria_count": 6,
                "required_sections": [],
                "length_constraints": [],
                "evaluation_criteria": [],
                "additional_requirements": [],
            },
            "nlp_analysis": {
                "money": ["$2,000,000 direct costs"],
                "date_time": ["5 year project period"],
                "writing_related": ["grant application", "research proposal"],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
            "analysis_metadata": {
                "categories_found": 3,
                "total_sentences": 45,
                "content_length": 2500,
            },
        },
    }

    assert stage_dto["organization"] is not None
    assert stage_dto["organization"]["full_name"] == "National Institutes of Health"
    assert stage_dto["extracted_data"]["cfp_subject"] == "Biomedical Research Initiative"
    assert stage_dto["analysis_results"]["cfp_analysis"]["sections_count"] == 5
    assert len(stage_dto["analysis_results"]["cfp_analysis"]["required_sections"]) == 0


def test_extraction_sections_stage_dto_inheritance() -> None:
    org_id = uuid4()

    extracted_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
            "is_detailed_research_plan": False,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
            "is_detailed_research_plan": True,
        },
    ]

    stage_dto: ExtractionSectionsStageDTO = {
        "organization": {
            "organization_id": org_id,
            "full_name": "National Science Foundation",
            "abbreviation": "NSF",
        },
        "extracted_data": {
            "organization_id": str(org_id),
            "cfp_subject": "Computer Science Research",
            "submission_date": "2025-07-15",
            "content": [
                {
                    "title": "Technical Approach",
                    "subtitles": ["Algorithm Design"],
                }
            ],
        },
        "analysis_results": {
            "cfp_analysis": {
                "sections_count": 2,
                "length_constraints_found": 1,
                "evaluation_criteria_count": 3,
                "required_sections": [],
                "length_constraints": [],
                "evaluation_criteria": [],
                "additional_requirements": [],
            },
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
            "analysis_metadata": {
                "categories_found": 2,
                "total_sentences": 15,
                "content_length": 800,
            },
        },
        "extracted_sections": extracted_sections,
    }

    assert stage_dto["organization"] is not None
    assert stage_dto["organization"]["abbreviation"] == "NSF"
    assert stage_dto["extracted_data"]["cfp_subject"] == "Computer Science Research"
    assert stage_dto["analysis_results"]["analysis_metadata"]["categories_found"] == 2

    assert stage_dto["extracted_sections"] == extracted_sections
    assert len(stage_dto["extracted_sections"]) == 2
    assert stage_dto["extracted_sections"][0]["title"] == "Project Summary"
    assert stage_dto["extracted_sections"][1]["is_detailed_research_plan"] is True


def test_extraction_sections_stage_dto_complex_sections() -> None:
    org_id = uuid4()

    extracted_sections: list[ExtractedSectionDTO] = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
            "is_detailed_research_plan": False,
        },
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
            "is_detailed_research_plan": True,
        },
        {
            "title": "Specific Aims",
            "id": "specific_aims",
            "order": 3,
            "is_long_form": True,
            "is_detailed_research_plan": False,
            "parent_id": "research_plan",
        },
        {
            "title": "Expected Outcomes",
            "id": "expected_outcomes",
            "order": 4,
            "is_long_form": True,
            "is_detailed_research_plan": False,
            "parent_id": "research_plan",
            "is_clinical_trial": False,
        },
    ]

    stage_dto: ExtractionSectionsStageDTO = {
        "organization": {
            "organization_id": org_id,
            "full_name": "National Institutes of Health",
            "abbreviation": "NIH",
        },
        "extracted_data": {
            "organization_id": str(org_id),
            "cfp_subject": "Clinical Research Grant",
            "submission_date": "2025-10-01",
            "content": [],
        },
        "analysis_results": {
            "cfp_analysis": {
                "sections_count": 4,
                "length_constraints_found": 2,
                "evaluation_criteria_count": 5,
                "required_sections": [],
                "length_constraints": [],
                "evaluation_criteria": [],
                "additional_requirements": [],
            },
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
            "analysis_metadata": {
                "categories_found": 4,
                "total_sentences": 35,
                "content_length": 1500,
            },
        },
        "extracted_sections": extracted_sections,
    }

    parent_sections = [s for s in stage_dto["extracted_sections"] if s.get("parent_id") is None]
    child_sections = [s for s in stage_dto["extracted_sections"] if s.get("parent_id") is not None]

    assert len(parent_sections) == 2
    assert len(child_sections) == 2

    research_plans = [s for s in stage_dto["extracted_sections"] if s.get("is_detailed_research_plan")]
    assert len(research_plans) == 1
    assert research_plans[0]["id"] == "research_plan"


def test_stage_dto_union_extract_cfp() -> None:
    stage_dto: StageDTO = {
        "organization": None,
        "extracted_data": {
            "organization_id": None,
            "cfp_subject": "Test Grant",
            "submission_date": None,
            "content": [],
        },
    }

    assert "organization" in stage_dto
    assert "extracted_data" in stage_dto
    assert stage_dto["extracted_data"]["cfp_subject"] == "Test Grant"


def test_stage_dto_union_analyze_cfp() -> None:
    stage_dto: StageDTO = {
        "organization": None,
        "extracted_data": {
            "organization_id": None,
            "cfp_subject": "Test Grant",
            "submission_date": None,
            "content": [],
        },
        "analysis_results": {
            "cfp_analysis": {
                "sections_count": 1,
                "length_constraints_found": 0,
                "evaluation_criteria_count": 0,
                "required_sections": [],
                "length_constraints": [],
                "evaluation_criteria": [],
                "additional_requirements": [],
            },
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
            "analysis_metadata": {
                "categories_found": 0,
                "total_sentences": 0,
                "content_length": 0,
            },
        },
    }

    assert "analysis_results" in stage_dto


def test_stage_dto_union_extraction_sections() -> None:
    stage_dto: StageDTO = {
        "organization": None,
        "extracted_data": {
            "organization_id": None,
            "cfp_subject": "Test Grant",
            "submission_date": None,
            "content": [],
        },
        "analysis_results": {
            "cfp_analysis": {
                "sections_count": 1,
                "length_constraints_found": 0,
                "evaluation_criteria_count": 0,
                "required_sections": [],
                "length_constraints": [],
                "evaluation_criteria": [],
                "additional_requirements": [],
            },
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
            "analysis_metadata": {
                "categories_found": 0,
                "total_sentences": 0,
                "content_length": 0,
            },
        },
        "extracted_sections": [
            {
                "title": "Test Section",
                "id": "test_section",
                "order": 1,
                "is_long_form": True,
                "is_detailed_research_plan": True,
            }
        ],
    }

    assert "extracted_sections" in stage_dto


def test_pipeline_dto_integration_data_flow_through_pipeline_stages() -> None:
    org_id = uuid4()

    extract_stage: ExtractCFPContentStageDTO = {
        "organization": {
            "organization_id": org_id,
            "full_name": "Test Organization",
            "abbreviation": "TO",
        },
        "extracted_data": {
            "organization_id": str(org_id),
            "cfp_subject": "Pipeline Test Grant",
            "submission_date": "2025-12-01",
            "content": [
                {
                    "title": "Overview",
                    "subtitles": ["Background"],
                }
            ],
        },
    }

    analyze_stage: AnalyzeCFPContentStageDTO = {
        "organization": extract_stage["organization"],
        "extracted_data": extract_stage["extracted_data"],
        "analysis_results": {
            "cfp_analysis": {
                "sections_count": 1,
                "length_constraints_found": 0,
                "evaluation_criteria_count": 0,
                "required_sections": [],
                "length_constraints": [],
                "evaluation_criteria": [],
                "additional_requirements": [],
            },
            "nlp_analysis": {
                "money": [],
                "date_time": [],
                "writing_related": [],
                "other_numbers": [],
                "recommendations": [],
                "orders": [],
                "positive_instructions": [],
                "negative_instructions": [],
                "evaluation_criteria": [],
            },
            "analysis_metadata": {
                "categories_found": 1,
                "total_sentences": 5,
                "content_length": 200,
            },
        },
    }

    sections_stage: ExtractionSectionsStageDTO = {
        "organization": analyze_stage["organization"],
        "extracted_data": analyze_stage["extracted_data"],
        "analysis_results": analyze_stage["analysis_results"],
        "extracted_sections": [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
                "is_detailed_research_plan": True,
            }
        ],
    }

    assert extract_stage["organization"] is not None
    assert analyze_stage["organization"] is not None
    assert sections_stage["organization"] is not None
    assert extract_stage["organization"]["organization_id"] == org_id
    assert analyze_stage["organization"]["organization_id"] == org_id
    assert sections_stage["organization"]["organization_id"] == org_id

    assert extract_stage["extracted_data"]["cfp_subject"] == "Pipeline Test Grant"
    assert analyze_stage["extracted_data"]["cfp_subject"] == "Pipeline Test Grant"
    assert sections_stage["extracted_data"]["cfp_subject"] == "Pipeline Test Grant"

    assert hasattr(analyze_stage, "__getitem__")
    assert "analysis_results" in analyze_stage
    assert hasattr(sections_stage, "__getitem__")
    assert "analysis_results" in sections_stage

    assert hasattr(sections_stage, "__getitem__")
    assert "extracted_sections" in sections_stage

    assert len(sections_stage["extracted_sections"]) == 1
