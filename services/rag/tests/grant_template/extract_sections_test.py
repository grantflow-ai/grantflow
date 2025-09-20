from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError

from services.rag.src.grant_template.extract_sections import (
    EXCLUDE_CATEGORIES,
    ExtractedSectionDTO,
    ExtractedSections,
    _maintain_hierarchy_integrity,
    _should_keep_section,
    extract_sections,
    filter_extracted_sections,
    get_exclude_embeddings,
    handle_extract_sections,
    validate_section_extraction,
)


class TestExtractedSectionDTO:
    """Test ExtractedSectionDTO TypedDict structure."""

    def test_required_fields(self) -> None:
        """Test required fields in ExtractedSectionDTO."""
        section: ExtractedSectionDTO = {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "is_long_form": True,
            "is_detailed_research_plan": True,
        }

        assert section["title"] == "Project Summary"
        assert section["id"] == "project_summary"
        assert section["order"] == 1
        assert section["is_long_form"] is True

    def test_optional_fields(self) -> None:
        """Test optional fields in ExtractedSectionDTO."""
        section: ExtractedSectionDTO = {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 2,
            "is_long_form": True,
            "parent_id": "parent_section",
            "is_detailed_research_plan": True,
            "is_title_only": False,
            "is_clinical_trial": True,
        }

        assert section["parent_id"] == "parent_section"
        assert section["is_detailed_research_plan"] is True
        assert section["is_title_only"] is False
        assert section["is_clinical_trial"] is True


class TestValidateSectionExtraction:
    """Test validate_section_extraction function."""

    def test_valid_sections(self) -> None:
        """Test validation passes for valid sections."""
        response: ExtractedSections = {
            "sections": [
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
                    "is_detailed_research_plan": True,  # Required: exactly one
                },
            ]
        }

        # Should not raise any exception
        validate_section_extraction(response)

    def test_error_field_raises_insufficient_context(self) -> None:
        """Test error field raises InsufficientContextError."""
        response: ExtractedSections = {
            "sections": [],
            "error": "Insufficient context to extract sections",
        }

        with pytest.raises(InsufficientContextError, match="Insufficient context"):
            validate_section_extraction(response)

    def test_null_string_error_ignored(self) -> None:
        """Test that 'null' string error is ignored."""
        response: ExtractedSections = {
            "sections": [
                {
                    "title": "Valid Section",
                    "id": "valid",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": True,
                }
            ],
            "error": "null",
        }

        # Should not raise any exception despite error field
        validate_section_extraction(response)

    def test_empty_sections_raises_validation_error(self) -> None:
        """Test empty sections list raises ValidationError."""
        response: ExtractedSections = {"sections": []}

        with pytest.raises(ValidationError, match="No sections extracted"):
            validate_section_extraction(response)

    def test_short_title_raises_validation_error(self) -> None:
        """Test short section title raises ValidationError."""
        response: ExtractedSections = {
            "sections": [
                {
                    "title": "AB",  # Too short
                    "id": "short_title",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": True,
                }
            ]
        }

        with pytest.raises(ValidationError, match="Section title too short"):
            validate_section_extraction(response)

    def test_duplicate_titles_raises_validation_error(self) -> None:
        """Test duplicate section titles raise ValidationError."""
        response: ExtractedSections = {
            "sections": [
                {
                    "title": "Same Title",
                    "id": "section1",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": True,
                },
                {
                    "title": "Same Title",
                    "id": "section2",
                    "order": 2,
                    "is_long_form": True,
                    "is_detailed_research_plan": False,
                },
            ]
        }

        with pytest.raises(ValidationError, match="Duplicate section titles"):
            validate_section_extraction(response)

    def test_duplicate_orders_raises_validation_error(self) -> None:
        """Test duplicate order values raise ValidationError."""
        response: ExtractedSections = {
            "sections": [
                {
                    "title": "Section One",
                    "id": "section1",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": True,
                },
                {
                    "title": "Section Two",
                    "id": "section2",
                    "order": 1,  # Duplicate order
                    "is_long_form": True,
                    "is_detailed_research_plan": False,
                },
            ]
        }

        with pytest.raises(ValidationError, match="Duplicate order values"):
            validate_section_extraction(response)

    def test_non_consecutive_orders_raises_validation_error(self) -> None:
        """Test non-consecutive order values raise ValidationError."""
        response: ExtractedSections = {
            "sections": [
                {
                    "title": "Section One",
                    "id": "section1",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": True,
                },
                {
                    "title": "Section Two",
                    "id": "section2",
                    "order": 3,  # Skip 2, not consecutive
                    "is_long_form": True,
                    "is_detailed_research_plan": False,
                },
            ]
        }

        with pytest.raises(ValidationError, match="Order values must start at 1"):
            validate_section_extraction(response)


class TestShouldKeepSection:
    """Test _should_keep_section function."""

    def test_keep_high_similarity_section(self) -> None:
        """Test excluding section with high similarity to exclude categories."""
        # Mock high similarity score
        with patch("services.rag.src.grant_template.extract_sections.util.cos_sim") as mock_cos_sim:
            with patch("services.rag.src.grant_template.extract_sections.run_sync") as mock_run_sync:
                mock_cos_sim.return_value = 0.9  # High similarity to exclude categories
                mock_model = MagicMock()
                mock_model.encode.return_value = [0.8, 0.9, 0.7]
                mock_run_sync.return_value = mock_model

                section: ExtractedSectionDTO = {
                    "title": "Budget Justification",  # Should be excluded
                    "id": "budget",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": False,
                }

                result = _should_keep_section(
                    section=section,
                    sections=[section],
                    threshold=0.8,
                    exclude_embeddings=[0.1, 0.2, 0.3],
                    trace_id="test-trace",
                )

                assert result is False  # Should be excluded

    def test_keep_low_similarity_section(self) -> None:
        """Test keeping section with low similarity to exclude categories."""
        with patch("services.rag.src.grant_template.extract_sections.util.cos_sim") as mock_cos_sim:
            with patch("services.rag.src.grant_template.extract_sections.run_sync") as mock_run_sync:
                mock_cos_sim.return_value = 0.3  # Low similarity
                mock_model = MagicMock()
                mock_model.encode.return_value = [0.8, 0.9, 0.7]
                mock_run_sync.return_value = mock_model

                section: ExtractedSectionDTO = {
                    "title": "Research Methods",  # Should be kept
                    "id": "research_methods",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": False,
                }

                result = _should_keep_section(
                    section=section,
                    sections=[section],
                    threshold=0.8,
                    exclude_embeddings=[0.1, 0.2, 0.3],
                    trace_id="test-trace",
                )

                assert result is True  # Should be kept

    def test_exact_match_exclusion(self) -> None:
        """Test exact string match exclusion."""
        # Test case-insensitive exact match
        section: ExtractedSectionDTO = {
            "title": "budget justification",  # Exact match to exclude category
            "id": "budget",
            "order": 1,
            "is_long_form": True,
            "is_detailed_research_plan": False,
        }

        result = _should_keep_section(
            section=section,
            sections=[section],
            threshold=0.8,
            exclude_embeddings=[],
            trace_id="test-trace",
        )

        assert result is False

        # Test case insensitive match
        section_upper: ExtractedSectionDTO = {
            "title": "BUDGET JUSTIFICATION",  # Case insensitive match
            "id": "budget_upper",
            "order": 1,
            "is_long_form": True,
            "is_detailed_research_plan": False,
        }

        result = _should_keep_section(
            section=section_upper,
            sections=[section_upper],
            threshold=0.8,
            exclude_embeddings=[],
            trace_id="test-trace",
        )

        assert result is False


class TestGetExcludeEmbeddings:
    """Test get_exclude_embeddings function."""

    @patch("services.rag.src.grant_template.extract_sections.get_embedding_model")
    @patch("services.rag.src.grant_template.extract_sections.run_sync")
    async def test_get_exclude_embeddings_cached(self, mock_run_sync, mock_get_model) -> None:
        """Test get_exclude_embeddings with caching."""
        # Mock embedding model
        mock_model = MagicMock()
        mock_tensor = MagicMock()
        mock_tensor.tolist.return_value = [0.1, 0.2, 0.3]
        mock_model.encode.return_value = mock_tensor
        mock_run_sync.return_value = mock_model

        # First call should use model
        result1 = await get_exclude_embeddings()
        assert result1 == [0.1, 0.2, 0.3]

        # Second call should use cache
        result2 = await get_exclude_embeddings()
        assert result2 == [0.1, 0.2, 0.3]

        # Model should only be called once due to caching
        mock_run_sync.assert_called_once()

    def test_exclude_categories_not_empty(self) -> None:
        """Test EXCLUDE_CATEGORIES constant is properly defined."""
        assert len(EXCLUDE_CATEGORIES) > 50  # Has many categories
        assert "Budget" in EXCLUDE_CATEGORIES
        assert "References" in EXCLUDE_CATEGORIES
        assert "ToC" in EXCLUDE_CATEGORIES


class TestMaintainHierarchyIntegrity:
    """Test _maintain_hierarchy_integrity function."""

    def test_valid_hierarchy(self) -> None:
        """Test hierarchy integrity with valid parent-child relationships."""
        sections = [
            {
                "title": "Research Plan",
                "id": "research_plan",
                "order": 1,
                "is_long_form": True,
                "is_detailed_research_plan": True,
            },
            {
                "title": "Specific Aims",
                "id": "specific_aims",
                "order": 2,
                "is_long_form": True,
                "parent_id": "research_plan",
            },
        ]

        result = _maintain_hierarchy_integrity(sections)
        assert len(result) == 2
        assert result[0]["id"] == "research_plan"
        assert result[1]["id"] == "specific_aims"

    def test_remove_orphaned_children(self) -> None:
        """Test removal of sections with non-existent parent_id."""
        sections = [
            {
                "title": "Research Plan",
                "id": "research_plan",
                "order": 1,
                "is_long_form": True,
                "is_detailed_research_plan": True,
            },
            {
                "title": "Orphaned Section",
                "id": "orphaned",
                "order": 2,
                "is_long_form": True,
                "parent_id": "non_existent_parent",  # Invalid parent
            },
        ]

        result = _maintain_hierarchy_integrity(sections)
        assert len(result) == 1
        assert result[0]["id"] == "research_plan"


class TestFilterExtractedSections:
    """Test filter_extracted_sections function."""

    @patch("services.rag.src.grant_template.extract_sections.get_exclude_embeddings")
    @patch("services.rag.src.grant_template.extract_sections.get_embedding_model")
    @patch("services.rag.src.grant_template.extract_sections.run_sync")
    async def test_filter_extracted_sections_success(
        self, mock_run_sync, mock_get_model, mock_get_exclude
    ) -> None:
        """Test successful section filtering."""
        # Setup mocks
        mock_get_exclude.return_value = [0.1, 0.2, 0.3]
        mock_model = MagicMock()
        mock_model.encode.return_value = [0.4, 0.5, 0.6]  # Low similarity
        mock_run_sync.return_value = mock_model

        sections = [
            {
                "title": "Research Methods",  # Should be kept
                "id": "research_methods",
                "order": 1,
                "is_long_form": True,
            },
            {
                "title": "Budget",  # Should be filtered out
                "id": "budget",
                "order": 2,
                "is_long_form": True,
            },
        ]

        with patch("services.rag.src.grant_template.extract_sections._should_keep_section") as mock_should_keep:
            mock_should_keep.side_effect = [True, False]  # Keep first, filter second

            result = await filter_extracted_sections(sections, "test-trace")

            assert len(result) == 1
            assert result[0]["title"] == "Research Methods"


class TestExtractSections:
    """Test extract_sections function."""

    @patch("services.rag.src.grant_template.extract_sections.handle_completions_request")
    async def test_extract_sections_success(self, mock_completions) -> None:
        """Test successful section extraction."""
        mock_response = {
            "sections": [
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
                    "is_detailed_research_plan": False,
                },
            ]
        }
        mock_completions.return_value = mock_response

        result = await extract_sections("Test CFP content")

        assert "sections" in result
        assert len(result["sections"]) == 2
        assert result["sections"][0]["title"] == "Project Summary"
        mock_completions.assert_called_once()

    @patch("services.rag.src.grant_template.extract_sections.handle_completions_request")
    async def test_extract_sections_validation_error(self, mock_completions) -> None:
        """Test extract_sections with validation error."""
        mock_response = {
            "sections": [],  # Empty sections will trigger validation error
        }
        mock_completions.return_value = mock_response

        with pytest.raises(ValidationError, match="No sections extracted"):
            await extract_sections("Invalid CFP content")


class TestHandleExtractSections:
    """Test handle_extract_sections function."""

    @patch("services.rag.src.grant_template.extract_sections.with_prompt_evaluation")
    @patch("services.rag.src.grant_template.extract_sections.filter_extracted_sections")
    @patch("services.rag.src.grant_template.extract_sections.retrieve_documents")
    async def test_handle_extract_sections_success(
        self, mock_retrieve, mock_filter, mock_evaluation
    ) -> None:
        """Test successful section extraction handling."""
        # Setup mocks
        mock_retrieve.return_value = "Organization guidelines content"
        mock_evaluation.return_value = {
            "sections": [
                {
                    "title": "Project Summary",
                    "id": "project_summary",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": True,
                }
            ]
        }
        mock_filter.return_value = [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "is_long_form": True,
                "is_detailed_research_plan": True,
            }
        ]

        cfp_content = [
            {"title": "Background", "subtitles": ["Introduction", "Problem"]},
            {"title": "Methods", "subtitles": ["Approach", "Timeline"]},
        ]

        result = await handle_extract_sections(
            cfp_content=cfp_content,
            cfp_subject="Test Grant Program",
            trace_id="test-trace",
            organization={
                "organization_id": uuid4(),
                "full_name": "Test Organization",
                "abbreviation": "TO",
            },
        )

        assert len(result) == 1
        assert result[0]["title"] == "Project Summary"
        mock_retrieve.assert_called_once()
        mock_evaluation.assert_called_once()
        mock_filter.assert_called_once()

    @patch("services.rag.src.grant_template.extract_sections.with_prompt_evaluation")
    @patch("services.rag.src.grant_template.extract_sections.retrieve_documents")
    async def test_handle_extract_sections_no_organization(
        self, mock_retrieve, mock_evaluation
    ) -> None:
        """Test section extraction with no organization provided."""
        mock_retrieve.return_value = ""
        mock_evaluation.return_value = {"sections": []}

        with patch("services.rag.src.grant_template.extract_sections.filter_extracted_sections") as mock_filter:
            mock_filter.return_value = []

            result = await handle_extract_sections(
                cfp_content=[],
                cfp_subject="Test Grant",
                trace_id="test-trace",
                organization=None,
            )

            assert result == []
            # Should not call retrieve_documents when no organization
            mock_retrieve.assert_not_called()

    async def test_handle_extract_sections_empty_cfp_content(self) -> None:
        """Test handling of empty CFP content."""
        with patch("services.rag.src.grant_template.extract_sections.with_prompt_evaluation") as mock_evaluation:
            with patch("services.rag.src.grant_template.extract_sections.filter_extracted_sections") as mock_filter:
                mock_evaluation.return_value = {"sections": []}
                mock_filter.return_value = []

                result = await handle_extract_sections(
                    cfp_content=[],
                    cfp_subject="",
                    trace_id="test-trace",
                    organization=None,
                )

                assert result == []


class TestIntegrationExtractSections:
    """Test integration scenarios for section extraction."""

    @patch("services.rag.src.grant_template.extract_sections.with_prompt_evaluation")
    @patch("services.rag.src.grant_template.extract_sections.get_exclude_embeddings")
    @patch("services.rag.src.grant_template.extract_sections.get_embedding_model")
    @patch("services.rag.src.grant_template.extract_sections.run_sync")
    async def test_end_to_end_section_extraction(
        self, mock_run_sync, mock_get_model, mock_get_exclude, mock_evaluation
    ) -> None:
        """Test complete end-to-end section extraction workflow."""
        # Setup comprehensive mocks
        mock_get_exclude.return_value = [0.1, 0.2, 0.3]
        mock_model = MagicMock()
        mock_model.encode.return_value = [0.4, 0.5, 0.6]
        mock_run_sync.return_value = mock_model

        mock_evaluation.return_value = {
            "sections": [
                {
                    "title": "Project Summary",
                    "id": "project_summary",
                    "order": 1,
                    "is_long_form": True,
                    "is_detailed_research_plan": False,
                },
                {
                    "title": "Budget Justification",  # Should be filtered
                    "id": "budget",
                    "order": 2,
                    "is_long_form": True,
                    "is_detailed_research_plan": False,
                },
                {
                    "title": "Research Plan",
                    "id": "research_plan",
                    "order": 3,
                    "is_long_form": True,
                    "is_detailed_research_plan": True,
                },
            ]
        }

        with patch("services.rag.src.grant_template.extract_sections._should_keep_section") as mock_should_keep:
            # Keep Project Summary and Research Plan, filter Budget
            mock_should_keep.side_effect = [True, False, True]

            result = await handle_extract_sections(
                cfp_content=[
                    {"title": "Background", "subtitles": ["Context", "Rationale"]},
                    {"title": "Objectives", "subtitles": ["Primary", "Secondary"]},
                ],
                cfp_subject="Advanced Research Grant",
                trace_id="integration-test",
                organization=None,
            )

            # Should have 2 sections (Budget filtered out)
            assert len(result) == 2
            assert result[0]["title"] == "Project Summary"
            assert result[1]["title"] == "Research Plan"

            # Verify budget was filtered out
            titles = [section["title"] for section in result]
            assert "Budget Justification" not in titles