from typing import TYPE_CHECKING
from uuid import uuid4

if TYPE_CHECKING:
    from packages.db.src.json_objects import CFPAnalysisResult

    from services.rag.src.grant_template.dto import ExtractedCFPData, OrganizationNamespace
    from services.rag.src.grant_template.extract_sections import ExtractedSectionDTO
    from services.rag.src.grant_template.pipeline_dto import (
        AnalyzeCFPContentStageDTO,
        ExtractCFPContentStageDTO,
        ExtractionSectionsStageDTO,
        StageDTO,
    )


class TestExtractCFPContentStageDTO:
    """Test ExtractCFPContentStageDTO structure."""

    def test_extract_cfp_content_stage_dto_structure(self) -> None:
        """Test ExtractCFPContentStageDTO required fields."""
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

    def test_extract_cfp_content_stage_dto_no_organization(self) -> None:
        """Test ExtractCFPContentStageDTO with no organization."""
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

    def test_extract_cfp_content_stage_dto_complex_data(self) -> None:
        """Test ExtractCFPContentStageDTO with complex extracted data."""
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


class TestAnalyzeCFPContentStageDTO:
    """Test AnalyzeCFPContentStageDTO structure."""

    def test_analyze_cfp_content_stage_dto_inheritance(self) -> None:
        """Test AnalyzeCFPContentStageDTO inherits from ExtractCFPContentStageDTO."""
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

        # Test inheritance - should have all base class fields
        assert stage_dto["organization"] == organization
        assert stage_dto["extracted_data"] == extracted_data

        # Test new field
        assert stage_dto["analysis_results"] == analysis_results
        assert stage_dto["analysis_results"]["analysis_metadata"]["categories_found"] == 5

    def test_analyze_cfp_content_stage_dto_complete_analysis(self) -> None:
        """Test AnalyzeCFPContentStageDTO with complete analysis results."""
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
                    "required_sections": ["project_summary", "research_plan"],
                    "length_constraints": ["15 pages maximum", "2 page summary"],
                    "evaluation_criteria": ["significance", "innovation", "approach"],
                    "additional_requirements": ["IRB approval required"],
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

        # Verify all components
        assert stage_dto["organization"]["full_name"] == "National Institutes of Health"
        assert stage_dto["extracted_data"]["cfp_subject"] == "Biomedical Research Initiative"
        assert stage_dto["analysis_results"]["cfp_analysis"]["sections_count"] == 5
        assert len(stage_dto["analysis_results"]["cfp_analysis"]["required_sections"]) == 2


class TestExtractionSectionsStageDTO:
    """Test ExtractionSectionsStageDTO structure."""

    def test_extraction_sections_stage_dto_inheritance(self) -> None:
        """Test ExtractionSectionsStageDTO inherits from AnalyzeCFPContentStageDTO."""
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
                "parent_id": None,
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

        # Test inheritance - should have all parent class fields
        assert stage_dto["organization"]["abbreviation"] == "NSF"
        assert stage_dto["extracted_data"]["cfp_subject"] == "Computer Science Research"
        assert stage_dto["analysis_results"]["analysis_metadata"]["categories_found"] == 2

        # Test new field
        assert stage_dto["extracted_sections"] == extracted_sections
        assert len(stage_dto["extracted_sections"]) == 2
        assert stage_dto["extracted_sections"][0]["title"] == "Project Summary"
        assert stage_dto["extracted_sections"][1]["is_detailed_research_plan"] is True

    def test_extraction_sections_stage_dto_complex_sections(self) -> None:
        """Test ExtractionSectionsStageDTO with complex section hierarchy."""
        org_id = uuid4()

        extracted_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
                "is_detailed_research_plan": False,
                "parent_id": None,
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "order": 2,
                "is_long_form": True,
                "is_detailed_research_plan": True,
                "parent_id": None,
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

        # Verify section hierarchy
        parent_sections = [s for s in stage_dto["extracted_sections"] if s.get("parent_id") is None]
        child_sections = [s for s in stage_dto["extracted_sections"] if s.get("parent_id") is not None]

        assert len(parent_sections) == 2  # project_summary and research_plan
        assert len(child_sections) == 2  # specific_aims and expected_outcomes

        # Verify research plan is detailed
        research_plans = [s for s in stage_dto["extracted_sections"] if s.get("is_detailed_research_plan")]
        assert len(research_plans) == 1
        assert research_plans[0]["id"] == "research_plan"


class TestStageDTOUnion:
    """Test StageDTO union type."""

    def test_stage_dto_union_extract_cfp(self) -> None:
        """Test StageDTO union with ExtractCFPContentStageDTO."""
        stage_dto: StageDTO = {
            "organization": None,
            "extracted_data": {
                "organization_id": None,
                "cfp_subject": "Test Grant",
                "submission_date": None,
                "content": [],
            },
        }

        # Should be valid StageDTO
        assert "organization" in stage_dto
        assert "extracted_data" in stage_dto
        assert stage_dto["extracted_data"]["cfp_subject"] == "Test Grant"

    def test_stage_dto_union_analyze_cfp(self) -> None:
        """Test StageDTO union with AnalyzeCFPContentStageDTO."""
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

        # Should be valid StageDTO
        assert "analysis_results" in stage_dto
        assert stage_dto["analysis_results"]["cfp_analysis"]["sections_count"] == 1

    def test_stage_dto_union_extraction_sections(self) -> None:
        """Test StageDTO union with ExtractionSectionsStageDTO."""
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

        # Should be valid StageDTO
        assert "extracted_sections" in stage_dto
        assert len(stage_dto["extracted_sections"]) == 1
        assert stage_dto["extracted_sections"][0]["title"] == "Test Section"


class TestPipelineDTOIntegration:
    """Test integration scenarios between pipeline DTOs."""

    def test_data_flow_through_pipeline_stages(self) -> None:
        """Test data flow from one stage to the next."""
        org_id = uuid4()

        # Start with ExtractCFPContentStageDTO
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

        # Evolve to AnalyzeCFPContentStageDTO (adds analysis)
        analyze_stage: AnalyzeCFPContentStageDTO = {
            **extract_stage,  # Inherit all fields
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

        # Evolve to ExtractionSectionsStageDTO (adds sections)
        sections_stage: ExtractionSectionsStageDTO = {
            **analyze_stage,  # Inherit all fields
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

        # Verify data preservation through pipeline
        assert extract_stage["organization"]["organization_id"] == org_id
        assert analyze_stage["organization"]["organization_id"] == org_id
        assert sections_stage["organization"]["organization_id"] == org_id

        assert extract_stage["extracted_data"]["cfp_subject"] == "Pipeline Test Grant"
        assert analyze_stage["extracted_data"]["cfp_subject"] == "Pipeline Test Grant"
        assert sections_stage["extracted_data"]["cfp_subject"] == "Pipeline Test Grant"

        # Verify progressive enhancement
        assert "analysis_results" not in extract_stage
        assert "analysis_results" in analyze_stage
        assert "analysis_results" in sections_stage

        assert "extracted_sections" not in extract_stage
        assert "extracted_sections" not in analyze_stage
        assert "extracted_sections" in sections_stage

        assert len(sections_stage["extracted_sections"]) == 1
