from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError

from services.rag.src.grant_template.extract_sections import ExtractedSectionDTO
from services.rag.src.grant_template.generate_metadata import (
    SectionMetadata,
    TemplateSectionsResponse,
    generate_grant_template,
    handle_generate_grant_template_metadata,
    validate_template_sections,
)



class TestSectionMetadata:
    """Test SectionMetadata TypedDict structure."""

    def test_section_metadata_structure(self) -> None:
        """Test SectionMetadata TypedDict structure."""
        metadata: SectionMetadata = {
            "id": "project_summary",
            "keywords": ["research", "innovation", "methodology"],
            "topics": ["background", "objectives"],
            "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives and methodology",
            "depends_on": ["research_plan"],
            "max_words": 300,
            "search_queries": ["project summary examples", "research objectives format"],
        }

        assert metadata["id"] == "project_summary"
        assert len(metadata["keywords"]) == 3
        assert len(metadata["topics"]) == 2
        assert len(metadata["generation_instructions"]) > 50
        assert metadata["max_words"] == 300
        assert len(metadata["search_queries"]) == 2


class TestValidateTemplateSections:
    """Test validate_template_sections function."""

    def test_valid_template_sections(self) -> None:
        """Test validation passes for valid template sections."""
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "order": 2,
                "is_long_form": True,
            },
        ]

        response: TemplateSectionsResponse = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives and methodology",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                },
                {
                    "id": "research_plan",
                    "keywords": ["methodology", "approach", "design"],
                    "topics": ["methods", "timeline"],
                    "generation_instructions": "Develop a detailed research plan with methodology and timeline information",
                    "depends_on": ["project_summary"],
                    "max_words": 2000,
                    "search_queries": ["research methodology examples", "project timeline format", "detailed research plan"],
                },
            ]
        }

        # Should not raise any exception
        validate_template_sections(response, input_sections=input_sections)

    def test_error_field_raises_insufficient_context(self) -> None:
        """Test error field raises InsufficientContextError."""
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            }
        ]

        response: TemplateSectionsResponse = {
            "sections": [],
            "error": "Insufficient context to generate metadata",
        }

        with pytest.raises(InsufficientContextError, match="Insufficient context"):
            validate_template_sections(response, input_sections=input_sections)

    def test_empty_sections_raises_validation_error(self) -> None:
        """Test empty sections list raises ValidationError."""
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            }
        ]

        response: TemplateSectionsResponse = {"sections": []}

        with pytest.raises(ValidationError, match="No sections generated"):
            validate_template_sections(response, input_sections=input_sections)

    def test_section_id_mismatch_raises_validation_error(self) -> None:
        """Test section ID mismatch raises ValidationError."""
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            }
        ]

        response: TemplateSectionsResponse = {
            "sections": [
                {
                    "id": "different_id",  # Wrong ID
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                }
            ]
        }

        with pytest.raises(ValidationError, match="Section mismatch detected"):
            validate_template_sections(response, input_sections=input_sections)

    def test_insufficient_keywords_raises_validation_error(self) -> None:
        """Test insufficient keywords raise ValidationError."""
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            }
        ]

        response: TemplateSectionsResponse = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation"],  # Only 2 keywords, need 3+
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                }
            ]
        }

        with pytest.raises(ValidationError, match="Insufficient keywords provided"):
            validate_template_sections(response, input_sections=input_sections)

    def test_insufficient_topics_raises_validation_error(self) -> None:
        """Test insufficient topics raise ValidationError."""
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            }
        ]

        response: TemplateSectionsResponse = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background"],  # Only 1 topic, need 2+
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                }
            ]
        }

        with pytest.raises(ValidationError, match="Insufficient topics provided"):
            validate_template_sections(response, input_sections=input_sections)

    def test_short_generation_instructions_raises_validation_error(self) -> None:
        """Test short generation instructions raise ValidationError."""
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            }
        ]

        response: TemplateSectionsResponse = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Short",  # Too short, need 50+ characters
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                }
            ]
        }

        with pytest.raises(ValidationError, match="Generation instructions too short"):
            validate_template_sections(response, input_sections=input_sections)

    def test_invalid_max_words_raises_validation_error(self) -> None:
        """Test invalid max_words values raise ValidationError."""
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            }
        ]

        # Test negative max_words
        response_negative: TemplateSectionsResponse = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                    "depends_on": [],
                    "max_words": -100,  # Invalid negative value
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                }
            ]
        }

        with pytest.raises(ValidationError, match="Invalid word count"):
            validate_template_sections(response_negative, input_sections=input_sections)

        # Test zero max_words
        response_zero: TemplateSectionsResponse = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                    "depends_on": [],
                    "max_words": 0,  # Invalid zero value
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                }
            ]
        }

        with pytest.raises(ValidationError, match="Invalid word count"):
            validate_template_sections(response_zero, input_sections=input_sections)


class TestGenerateGrantTemplate:
    """Test generate_grant_template function."""

    @patch("services.rag.src.grant_template.generate_metadata.handle_completions_request")
    async def test_generate_grant_template_success(self, mock_completions) -> None:
        """Test successful grant template generation."""
        mock_response = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives and methodology",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                }
            ]
        }
        mock_completions.return_value = mock_response

        # Create input sections for testing
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
                "is_detailed_research_plan": False,
            }
        ]

        result = await generate_grant_template("Test CFP content", input_sections=input_sections)

        assert "sections" in result
        assert len(result["sections"]) == 1
        assert result["sections"][0]["id"] == "project_summary"
        mock_completions.assert_called_once()

    @patch("services.rag.src.grant_template.generate_metadata.handle_completions_request")
    async def test_generate_grant_template_validation_error(self, mock_completions) -> None:
        """Test generate_grant_template with validation error."""
        # Mock to raise ValidationError as would happen with empty sections
        mock_completions.side_effect = ValidationError("No sections generated. Please provide an error message.")

        # Create input sections for testing
        input_sections: list[ExtractedSectionDTO] = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
                "is_detailed_research_plan": False,
            }
        ]

        with pytest.raises(ValidationError, match="No sections generated"):
            await generate_grant_template("Test CFP content", input_sections=input_sections)


class TestHandleGenerateGrantTemplateMetadata:
    """Test handle_generate_grant_template_metadata function."""

    @patch("services.rag.src.grant_template.generate_metadata.with_prompt_evaluation")
    @patch("services.rag.src.grant_template.generate_metadata.retrieve_documents")
    async def test_handle_generate_grant_template_metadata_success(
        self, mock_retrieve, mock_evaluation
    ) -> None:
        """Test successful metadata generation handling."""
        # Setup mocks
        mock_retrieve.return_value = "Organization guidelines content"
        mock_evaluation.return_value = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives and methodology",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                },
                {
                    "id": "research_plan",
                    "keywords": ["methodology", "approach", "design"],
                    "topics": ["methods", "timeline"],
                    "generation_instructions": "Develop a detailed research plan with methodology and timeline information",
                    "depends_on": ["project_summary"],
                    "max_words": 2000,
                    "search_queries": ["research methodology examples", "project timeline format", "detailed research plan"],
                },
            ]
        }

        long_form_sections = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "order": 2,
                "is_long_form": True,
            },
        ]

        result = await handle_generate_grant_template_metadata(
            cfp_content="Test CFP content",
            cfp_subject="Test Grant Program",
            organization={
                "organization_id": uuid4(),
                "full_name": "Test Organization",
                "abbreviation": "TO",
            },
            long_form_sections=long_form_sections,
        )

        assert len(result) == 2
        assert result[0]["id"] == "project_summary"
        assert result[1]["id"] == "research_plan"
        assert result[0]["max_words"] == 300
        assert result[1]["max_words"] == 2000
        mock_retrieve.assert_called_once()
        mock_evaluation.assert_called_once()

    @patch("services.rag.src.grant_template.generate_metadata.with_prompt_evaluation")
    @patch("services.rag.src.grant_template.generate_metadata.retrieve_documents")
    async def test_handle_generate_grant_template_metadata_no_organization(
        self, mock_retrieve, mock_evaluation
    ) -> None:
        """Test metadata generation with no organization provided."""
        mock_retrieve.return_value = ""
        mock_evaluation.return_value = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                }
            ]
        }

        result = await handle_generate_grant_template_metadata(
            cfp_content="Test CFP content",
            cfp_subject="Test Grant",
            organization=None,
            long_form_sections=[
                {
                    "title": "Project Summary",
                    "id": "project_summary",
                    "order": 1,
                    "is_long_form": True,
                }
            ],
        )

        assert len(result) == 1
        assert result[0]["id"] == "project_summary"
        # Should not call retrieve_documents when no organization
        mock_retrieve.assert_not_called()

    async def test_handle_generate_grant_template_metadata_empty_sections(self) -> None:
        """Test handling of empty long form sections."""
        with patch("services.rag.src.grant_template.generate_metadata.with_prompt_evaluation") as mock_evaluation:
            mock_evaluation.return_value = {"sections": []}

            result = await handle_generate_grant_template_metadata(
                cfp_content="Test CFP content",
                cfp_subject="Test Grant",
                organization=None,
                long_form_sections=[],
            )

            assert result == []

    @patch("services.rag.src.grant_template.generate_metadata.with_prompt_evaluation")
    async def test_handle_generate_metadata_word_count_calculation(
        self, mock_evaluation
    ) -> None:
        """Test word count calculation logic."""
        mock_evaluation.return_value = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology"],
                    "topics": ["background", "objectives"],
                    "generation_instructions": "Generate a comprehensive project summary highlighting key research objectives",
                    "depends_on": [],
                    "max_words": 300,  # Default for project summary
                    "search_queries": ["project summary examples", "research objectives format", "grant proposal structure"],
                },
                {
                    "id": "research_plan",
                    "keywords": ["methodology", "approach", "design"],
                    "topics": ["methods", "timeline"],
                    "generation_instructions": "Develop a detailed research plan with methodology and timeline",
                    "depends_on": [],
                    "max_words": 2000,  # Default for research plan
                    "search_queries": ["research methodology examples", "project timeline format", "detailed research plan"],
                },
            ]
        }

        result = await handle_generate_grant_template_metadata(
            cfp_content="Test CFP content with no page limits specified",
            cfp_subject="Test Grant",
            organization=None,
            long_form_sections=[
                {
                    "title": "Project Summary",
                    "id": "project_summary",
                    "order": 1,
                    "is_long_form": True,
                },
                {
                    "title": "Research Plan",
                    "id": "research_plan",
                    "order": 2,
                    "is_long_form": True,
                },
            ],
        )

        # Verify default word counts are applied
        project_summary = next(s for s in result if s["id"] == "project_summary")
        research_plan = next(s for s in result if s["id"] == "research_plan")

        assert project_summary["max_words"] == 300
        assert research_plan["max_words"] == 2000


class TestIntegrationGenerateMetadata:
    """Test integration scenarios for metadata generation."""

    @patch("services.rag.src.grant_template.generate_metadata.retrieve_documents")
    @patch("services.rag.src.grant_template.generate_metadata.with_prompt_evaluation")
    async def test_end_to_end_metadata_generation(self, mock_evaluation, mock_retrieve) -> None:
        """Test complete end-to-end metadata generation workflow."""
        # Mock retrieve_documents to avoid deep call chain
        mock_retrieve.return_value = "Mocked organizational guidelines content"

        # Setup comprehensive mock response
        mock_evaluation.return_value = {
            "sections": [
                {
                    "id": "project_summary",
                    "keywords": ["research", "innovation", "methodology", "objectives", "impact"],
                    "topics": ["background", "objectives", "significance"],
                    "generation_instructions": "Generate a comprehensive project summary that clearly articulates the research objectives, methodology, and expected impact of the proposed work",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": [
                        "project summary examples for research grants",
                        "how to write research objectives",
                        "grant proposal project summary format",
                    ],
                },
                {
                    "id": "research_plan",
                    "keywords": ["methodology", "approach", "design", "timeline", "milestones"],
                    "topics": ["methods", "timeline", "deliverables", "evaluation"],
                    "generation_instructions": "Develop a detailed research plan that outlines the methodology, timeline, key milestones, and evaluation criteria for the proposed research",
                    "depends_on": ["project_summary"],
                    "max_words": 2000,
                    "search_queries": [
                        "research methodology examples",
                        "project timeline for research grants",
                        "research plan structure and format",
                    ],
                },
                {
                    "id": "expected_outcomes",
                    "keywords": ["outcomes", "impact", "deliverables", "dissemination", "benefits"],
                    "topics": ["results", "impact", "publications", "applications"],
                    "generation_instructions": "Describe the expected outcomes, potential impact, and plans for dissemination of research results to relevant communities",
                    "depends_on": ["research_plan"],
                    "max_words": 400,
                    "search_queries": [
                        "research outcomes and impact examples",
                        "dissemination plan for research",
                        "how to describe research benefits",
                    ],
                },
            ]
        }

        long_form_sections: list[ExtractedSectionDTO] = [
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
                "title": "Expected Outcomes",
                "id": "expected_outcomes",
                "order": 3,
                "is_long_form": True,
                "is_detailed_research_plan": False,
            },
        ]

        result = await handle_generate_grant_template_metadata(
            cfp_content="Comprehensive CFP content with detailed requirements and evaluation criteria",
            cfp_subject="Advanced Multi-disciplinary Research Initiative",
            organization={
                "organization_id": uuid4(),
                "full_name": "National Science Foundation",
                "abbreviation": "NSF",
            },
            long_form_sections=long_form_sections,
        )

        # Verify all sections are generated
        assert len(result) == 3

        # Verify dependency chain
        project_summary = next(s for s in result if s["id"] == "project_summary")
        research_plan = next(s for s in result if s["id"] == "research_plan")
        expected_outcomes = next(s for s in result if s["id"] == "expected_outcomes")

        assert project_summary["depends_on"] == []
        assert research_plan["depends_on"] == ["project_summary"]
        assert expected_outcomes["depends_on"] == ["research_plan"]

        # Verify metadata quality
        for section in result:
            assert len(section["keywords"]) >= 3
            assert len(section["topics"]) >= 2
            assert len(section["generation_instructions"]) >= 50
            assert section["max_words"] > 0
            assert len(section["search_queries"]) >= 1

        # Verify word count distribution
        total_words = sum(s["max_words"] for s in result)
        assert total_words == 2700  # 300 + 2000 + 400

        # Verify research plan gets the largest allocation
        assert research_plan["max_words"] == 2000
        assert research_plan["max_words"] > project_summary["max_words"]
        assert research_plan["max_words"] > expected_outcomes["max_words"]