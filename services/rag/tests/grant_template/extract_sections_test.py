from typing import TYPE_CHECKING, Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from packages.db.src.json_objects import CFPAnalysis
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError

from services.rag.src.grant_template.extract_sections import (
    EXCLUDE_CATEGORIES,
    ExtractedSectionDTO,
    ExtractedSections,
    _finalize_processed_sections,
    _should_keep_section,
    extract_sections,
    filter_extracted_sections,
    get_exclude_embeddings,
    handle_extract_sections,
    validate_section_extraction,
)

if TYPE_CHECKING:
    from packages.shared_utils.src.dto import ProcessedSectionDTO


@pytest.fixture
def mock_cfp_analysis() -> CFPAnalysis:
    return {
        "cfp_analysis": {
            "required_sections": [],
            "length_constraints": [],
            "evaluation_criteria": [],
            "additional_requirements": [],
            "count": 0,
            "constraints_count": 0,
            "criteria_count": 0,
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
            "content_length": 1000,
            "categories_found": 5,
            "total_sentences": 50,
        },
    }


def test_extracted_section_dto_required_fields() -> None:
    section: ProcessedSectionDTO = {
        "title": "Project Summary",
        "id": "project_summary",
        "order": 1,
        "long_form": True,
        "is_plan": True,
        "evidence": "CFP evidence for Project Summary",
    }

    assert section["title"] == "Project Summary"
    assert section["id"] == "project_summary"
    assert section["order"] == 1
    assert section["long_form"] is True


def test_extracted_section_dto_optional_fields() -> None:
    section: ProcessedSectionDTO = {
        "title": "Research Plan",
        "id": "research_plan",
        "order": 2,
        "long_form": True,
        "parent": "parent_section",
        "is_plan": True,
        "title_only": False,
        "clinical": True,
        "evidence": "CFP evidence for Research Plan",
    }

    assert section["parent"] == "parent_section"
    assert section["is_plan"] is True
    assert section["title_only"] is False
    assert section["clinical"] is True


def test_validate_section_extraction_valid_sections() -> None:
    response: ExtractedSections = {
        "sections": [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "long_form": True,
                "is_plan": False,
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "order": 2,
                "long_form": True,
                "is_plan": True,
            },
        ]
    }

    validate_section_extraction(response)


def test_validate_section_extraction_error_field_raises_insufficient_context() -> None:
    response: ExtractedSections = {
        "sections": [],
        "error": "Insufficient context to extract sections",
    }

    with pytest.raises(InsufficientContextError, match="Insufficient context"):
        validate_section_extraction(response)


def test_validate_section_extraction_null_string_error_ignored() -> None:
    response: ExtractedSections = {
        "sections": [
            {
                "title": "Valid Section",
                "id": "valid",
                "order": 1,
                "long_form": True,
                "is_plan": True,
            }
        ],
        "error": "null",
    }

    validate_section_extraction(response)


def test_validate_section_extraction_empty_sections_raises_validation_error() -> None:
    response: ExtractedSections = {"sections": []}

    with pytest.raises(ValidationError, match="No sections extracted"):
        validate_section_extraction(response)


def test_validate_section_extraction_short_title_raises_validation_error() -> None:
    response: ExtractedSections = {
        "sections": [
            {
                "title": "AB",
                "id": "short_title",
                "order": 1,
                "long_form": True,
                "is_plan": True,
            }
        ]
    }

    with pytest.raises(ValidationError, match="Section title too short"):
        validate_section_extraction(response)


def test_validate_section_extraction_duplicate_titles_raises_validation_error() -> None:
    response: ExtractedSections = {
        "sections": [
            {
                "title": "Same Title",
                "id": "section1",
                "order": 1,
                "long_form": True,
                "is_plan": True,
            },
            {
                "title": "Same Title",
                "id": "section2",
                "order": 2,
                "long_form": True,
                "is_plan": False,
            },
        ]
    }

    with pytest.raises(ValidationError, match="Duplicate section titles"):
        validate_section_extraction(response)


def test_validate_section_extraction_duplicate_orders_raises_validation_error() -> None:
    response: ExtractedSections = {
        "sections": [
            {
                "title": "Section One",
                "id": "section1",
                "order": 1,
                "long_form": True,
                "is_plan": True,
            },
            {
                "title": "Section Two",
                "id": "section2",
                "order": 1,
                "long_form": True,
                "is_plan": False,
            },
        ]
    }

    with pytest.raises(ValidationError, match="Duplicate order values"):
        validate_section_extraction(response)


def test_validate_section_extraction_non_consecutive_orders_raises_validation_error() -> None:
    response: ExtractedSections = {
        "sections": [
            {
                "title": "Section One",
                "id": "section1",
                "order": 1,
                "long_form": True,
                "is_plan": True,
            },
            {
                "title": "Section Two",
                "id": "section2",
                "order": 3,
                "long_form": True,
                "is_plan": False,
            },
        ]
    }

    with pytest.raises(ValidationError, match="Order values must start at 1"):
        validate_section_extraction(response)


def test_should_keep_section_high_similarity_section(trace_id: str) -> None:
    with (
        patch("services.rag.src.grant_template.extract_sections.util.cos_sim") as mock_cos_sim,
        patch("services.rag.src.grant_template.extract_sections.run_sync") as mock_run_sync,
    ):
        mock_cos_sim.return_value = 0.9
        mock_model = MagicMock()
        mock_model.encode.return_value = [0.8, 0.9, 0.7]
        mock_run_sync.return_value = mock_model

        section: ProcessedSectionDTO = {
            "title": "Budget Justification",
            "id": "budget",
            "order": 1,
            "long_form": True,
            "is_plan": False,
            "evidence": "CFP evidence for Budget Justification",
        }

        result = _should_keep_section(
            section=section,
            sections=[section],
            threshold=0.8,
            exclude_embeddings=[0.1, 0.2, 0.3],
            trace_id=trace_id,
        )

        assert result is False


def test_should_keep_section_low_similarity_section(trace_id: str) -> None:
    with (
        patch("services.rag.src.grant_template.extract_sections.util.cos_sim") as mock_cos_sim,
        patch("services.rag.src.grant_template.extract_sections.run_sync") as mock_run_sync,
    ):
        mock_cos_sim.return_value = 0.3
        mock_model = MagicMock()
        mock_model.encode.return_value = [0.8, 0.9, 0.7]
        mock_run_sync.return_value = mock_model

        section: ProcessedSectionDTO = {
            "title": "Research Methods",
            "id": "research_methods",
            "order": 1,
            "long_form": True,
            "is_plan": False,
            "evidence": "CFP evidence for Research Methods",
        }

        result = _should_keep_section(
            section=section,
            sections=[section],
            threshold=0.8,
            exclude_embeddings=[0.1, 0.2, 0.3],
            trace_id=trace_id,
        )

        assert result is True


def test_should_keep_section_exact_match_exclusion(trace_id: str) -> None:
    section: ProcessedSectionDTO = {
        "title": "budget justification",
        "id": "budget",
        "order": 1,
        "long_form": True,
        "is_plan": False,
        "evidence": "CFP evidence for budget justification",
    }

    result = _should_keep_section(
        section=section,
        sections=[section],
        threshold=0.8,
        exclude_embeddings=[],
        trace_id=trace_id,
    )

    assert result is False

    section_upper: ProcessedSectionDTO = {
        "title": "BUDGET JUSTIFICATION",
        "id": "budget_upper",
        "order": 1,
        "long_form": True,
        "is_plan": False,
        "evidence": "CFP evidence for BUDGET JUSTIFICATION",
    }

    result = _should_keep_section(
        section=section_upper,
        sections=[section_upper],
        threshold=0.8,
        exclude_embeddings=[],
        trace_id=trace_id,
    )

    assert result is False


@patch("services.rag.src.grant_template.extract_sections.exclude_embeddings_ref")
@patch("services.rag.src.grant_template.extract_sections.run_sync")
async def test_get_exclude_embeddings_cached(mock_run_sync: AsyncMock, mock_ref: MagicMock) -> None:
    mock_ref.value = None

    mock_model = MagicMock()
    mock_tensor = MagicMock()
    mock_tensor.tolist.return_value = [0.1, 0.2, 0.3]
    mock_model.encode.return_value = mock_tensor
    mock_run_sync.return_value = mock_model

    result1 = await get_exclude_embeddings()

    assert mock_ref.value == [0.1, 0.2, 0.3]
    assert result1 == [0.1, 0.2, 0.3]

    result2 = await get_exclude_embeddings()
    assert result2 == [0.1, 0.2, 0.3]

    mock_run_sync.assert_called_once()


def test_exclude_categories_not_empty() -> None:
    assert len(EXCLUDE_CATEGORIES) > 50
    assert "Budget" in EXCLUDE_CATEGORIES
    assert "References" in EXCLUDE_CATEGORIES
    assert "ToC" in EXCLUDE_CATEGORIES


def test_maintain_hierarchy_integrity_valid_hierarchy() -> None:
    sections: list[ProcessedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 1,
            "long_form": True,
            "is_plan": True,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Specific Aims",
            "id": "specific_aims",
            "order": 2,
            "long_form": True,
            "parent": "research_plan",
            "is_plan": False,
            "evidence": "CFP evidence for Specific Aims",
        },
    ]

    result = _finalize_processed_sections(sections)
    assert len(result) == 2
    assert result[0]["id"] == "research_plan"
    assert result[1]["id"] == "specific_aims"


def test_maintain_hierarchy_integrity_remove_orphaned_children() -> None:
    sections: list[ProcessedSectionDTO] = [
        {
            "title": "Research Plan",
            "id": "research_plan",
            "order": 1,
            "long_form": True,
            "is_plan": True,
            "evidence": "CFP evidence for Research Plan",
        },
        {
            "title": "Orphaned Section",
            "id": "orphaned",
            "order": 2,
            "long_form": True,
            "parent": "non_existent_parent",
            "is_plan": False,
            "evidence": "CFP evidence for Orphaned Section",
        },
    ]

    result = _finalize_processed_sections(sections)

    assert len(result) == 2
    research_plan = next(s for s in result if s["id"] == "research_plan")
    orphaned = next(s for s in result if s["id"] == "orphaned")

    assert research_plan["id"] == "research_plan"
    assert not research_plan.get("parent")

    assert orphaned["id"] == "orphaned"
    assert orphaned.get("parent") is None


@patch("services.rag.src.grant_template.extract_sections.get_exclude_embeddings")
@patch("services.rag.src.grant_template.extract_sections.get_embedding_model")
@patch("services.rag.src.grant_template.extract_sections.run_sync")
async def test_filter_extracted_sections_success(
    mock_run_sync: AsyncMock, mock_get_model: AsyncMock, mock_get_exclude: AsyncMock, trace_id: str
) -> None:
    mock_get_exclude.return_value = [0.1, 0.2, 0.3]
    mock_model = MagicMock()
    mock_model.encode.return_value = [0.4, 0.5, 0.6]
    mock_run_sync.return_value = mock_model

    sections: list[ProcessedSectionDTO] = [
        {
            "title": "Research Methods",
            "id": "research_methods",
            "order": 1,
            "long_form": True,
            "is_plan": True,
            "evidence": "CFP evidence for Research Methods",
        },
        {
            "title": "Budget",
            "id": "budget",
            "order": 2,
            "long_form": True,
            "is_plan": False,
            "evidence": "CFP evidence for Budget",
        },
    ]

    with patch("services.rag.src.grant_template.extract_sections._should_keep_section") as mock_should_keep:

        def mock_keep(section: ExtractedSectionDTO, **kwargs: Any) -> bool:
            return bool(section["title"] == "Research Methods")

        mock_should_keep.side_effect = mock_keep

        result = await filter_extracted_sections(sections, trace_id)

        assert len(result) == 1
        assert result[0]["title"] == "Research Methods"


@patch("services.rag.src.grant_template.extract_sections.handle_completions_request")
async def test_extract_sections_success(
    mock_completions: AsyncMock, trace_id: str, mock_cfp_analysis: CFPAnalysis
) -> None:
    mock_response = {
        "sections": [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "long_form": True,
                "is_plan": False,
                "evidence": "CFP evidence for Project Summary",
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "order": 2,
                "long_form": True,
                "is_plan": False,
                "evidence": "CFP evidence for Research Plan",
            },
        ]
    }
    mock_completions.return_value = mock_response

    result = await extract_sections(
        "Test CFP content for Test Subject",
        trace_id=trace_id,
        cfp_analysis=mock_cfp_analysis,
    )

    assert "sections" in result
    assert len(result["sections"]) == 2
    assert result["sections"][0]["title"] == "Project Summary"
    mock_completions.assert_called_once()


@patch("services.rag.src.grant_template.extract_sections.handle_completions_request")
async def test_extract_sections_validation_error(
    mock_completions: AsyncMock, trace_id: str, mock_cfp_analysis: CFPAnalysis
) -> None:
    mock_completions.side_effect = ValidationError("No sections extracted. Please provide an error message.")

    with pytest.raises(ValidationError, match="No sections extracted"):
        await extract_sections(
            "Invalid CFP content for Test Subject",
            trace_id=trace_id,
            cfp_analysis=mock_cfp_analysis,
        )


@patch("services.rag.src.grant_template.extract_sections.with_evaluation")
@patch("services.rag.src.grant_template.extract_sections.filter_extracted_sections")
@patch("services.rag.src.grant_template.extract_sections.retrieve_documents")
async def test_handle_extract_sections_success(
    mock_retrieve: AsyncMock,
    mock_filter: AsyncMock,
    mock_evaluation: AsyncMock,
    mock_job_manager: AsyncMock,
    trace_id: str,
    mock_cfp_analysis: CFPAnalysis,
) -> None:
    mock_retrieve.return_value = "Organization guidelines content"
    mock_evaluation.return_value = {
        "sections": [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "order": 1,
                "long_form": True,
                "is_plan": True,
            }
        ]
    }
    mock_filter.return_value = [
        {
            "title": "Project Summary",
            "id": "project_summary",
            "order": 1,
            "long_form": True,
            "is_plan": True,
            "evidence": "CFP evidence for Project Summary",
        }
    ]

    result = await handle_extract_sections(
        trace_id=trace_id,
        cfp_analysis=mock_cfp_analysis,
        job_manager=mock_job_manager,
    )

    assert len(result) == 1
    assert result[0]["title"] == "Project Summary"
    mock_retrieve.assert_called_once()
    mock_evaluation.assert_called_once()
    mock_filter.assert_called_once()


@patch("services.rag.src.grant_template.extract_sections.with_evaluation")
@patch("services.rag.src.grant_template.extract_sections.retrieve_documents")
async def test_handle_extract_sections_no_organization(
    mock_retrieve: AsyncMock,
    mock_evaluation: AsyncMock,
    mock_job_manager: AsyncMock,
    trace_id: str,
    mock_cfp_analysis: CFPAnalysis,
) -> None:
    mock_retrieve.return_value = ""
    mock_evaluation.return_value = {"sections": []}

    with patch("services.rag.src.grant_template.extract_sections.filter_extracted_sections") as mock_filter:
        mock_filter.return_value = []

        result = await handle_extract_sections(
            trace_id=trace_id,
            cfp_analysis=mock_cfp_analysis,
            job_manager=mock_job_manager,
        )

        assert result == []
        mock_retrieve.assert_not_called()


async def test_handle_extract_sections_empty_cfp_content(
    mock_job_manager: AsyncMock, trace_id: str, mock_cfp_analysis: CFPAnalysis
) -> None:
    with (
        patch("services.rag.src.grant_template.extract_sections.with_evaluation") as mock_evaluation,
        patch("services.rag.src.grant_template.extract_sections.filter_extracted_sections") as mock_filter,
    ):
        mock_evaluation.return_value = {"sections": []}
        mock_filter.return_value = []

        result = await handle_extract_sections(
            trace_id=trace_id,
            cfp_analysis=mock_cfp_analysis,
            job_manager=mock_job_manager,
        )

        assert result == []


@patch("services.rag.src.grant_template.extract_sections.with_evaluation")
@patch("services.rag.src.grant_template.extract_sections.get_exclude_embeddings")
@patch("services.rag.src.grant_template.extract_sections.get_embedding_model")
@patch("services.rag.src.grant_template.extract_sections.run_sync")
async def test_end_to_end_section_extraction(
    mock_run_sync: AsyncMock,
    mock_get_model: AsyncMock,
    mock_get_exclude: AsyncMock,
    mock_evaluation: AsyncMock,
    mock_job_manager: AsyncMock,
    trace_id: str,
    mock_cfp_analysis: CFPAnalysis,
) -> None:
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
                "long_form": True,
                "is_plan": False,
                "evidence": "CFP evidence for Project Summary",
            },
            {
                "title": "Budget Justification",
                "id": "budget",
                "order": 2,
                "long_form": True,
                "is_plan": False,
                "evidence": "CFP evidence for Budget Justification",
            },
            {
                "title": "Research Plan",
                "id": "research_plan",
                "order": 3,
                "long_form": True,
                "is_plan": True,
                "evidence": "CFP evidence for Research Plan",
            },
        ]
    }

    with patch("services.rag.src.grant_template.extract_sections._should_keep_section") as mock_should_keep:
        mock_should_keep.side_effect = [True, False, True]

        result = await handle_extract_sections(
            trace_id=trace_id,
            cfp_analysis=mock_cfp_analysis,
            job_manager=mock_job_manager,
        )

        assert len(result) == 2
        assert result[0]["title"] == "Project Summary"
        assert result[1]["title"] == "Research Plan"

        titles = [section["title"] for section in result]
        assert "Budget Justification" not in titles
