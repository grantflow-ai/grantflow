from typing import TYPE_CHECKING, cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.autofill.research_deep_dive_handler import (
    RESEARCH_DEEP_DIVE_FIELD_MAPPING,
    ResearchDeepDiveDraft,
    _format_research_objectives,
    _validate_research_deep_dive_draft,
    _validate_research_deep_dive_refined,
    generate_research_deep_dive_content,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective


@pytest.fixture
def mock_logger() -> MagicMock:
    return MagicMock()


def _make_text(prefix: str, words: int) -> str:
    return " ".join(f"{prefix}_{i}" for i in range(words))


def test_field_mapping_keys() -> None:
    expected_fields = {
        "background_context",
        "hypothesis",
        "rationale",
        "novelty_and_innovation",
        "impact",
        "team_excellence",
        "research_feasibility",
        "preliminary_data",
    }

    actual_fields = set(RESEARCH_DEEP_DIVE_FIELD_MAPPING.keys())
    assert actual_fields == expected_fields

    for description in RESEARCH_DEEP_DIVE_FIELD_MAPPING.values():
        assert description.strip()
        assert description.endswith("?")


def test_format_research_objectives(mock_logger: MagicMock) -> None:
    objectives_data = [
        {
            "number": 1,
            "title": "First Objective",
            "description": "Description of first objective",
            "research_tasks": [],
        },
        {"number": 2, "title": "Second Objective", "research_tasks": []},
    ]

    objectives = cast("list[ResearchObjective]", objectives_data)
    result = _format_research_objectives(objectives)

    assert "1. First Objective" in result
    assert "Description of first objective" in result
    assert "2. Second Objective" in result

    empty_objectives = cast("list[ResearchObjective]", [])
    assert _format_research_objectives(empty_objectives) == ""


def test_validate_research_deep_dive_draft() -> None:
    valid_draft = cast(
        "ResearchDeepDiveDraft",
        {key: _make_text("draft", 150) for key in RESEARCH_DEEP_DIVE_FIELD_MAPPING},
    )
    _validate_research_deep_dive_draft(valid_draft)

    invalid_draft = valid_draft.copy()
    invalid_draft["hypothesis"] = _make_text("short", 40)

    with pytest.raises(ValidationError, match="hypothesis draft too short"):
        _validate_research_deep_dive_draft(invalid_draft)


def test_validate_research_deep_dive_refined() -> None:
    refined = cast(
        "ResearchDeepDive",
        {key: _make_text("refined", 260) for key in RESEARCH_DEEP_DIVE_FIELD_MAPPING},
    )
    _validate_research_deep_dive_refined(refined)

    too_long: ResearchDeepDive = refined.copy()
    too_long["impact"] = _make_text("long", 480)

    with pytest.raises(ValidationError, match="impact answer should be 200-420 words"):
        _validate_research_deep_dive_refined(too_long)

    empty_answer: ResearchDeepDive = refined.copy()
    empty_answer["impact"] = " "

    with pytest.raises(ValidationError, match="impact answer empty after refinement"):
        _validate_research_deep_dive_refined(empty_answer)


async def test_generate_research_deep_dive_content_with_mocks(
    mock_logger: MagicMock,
    trace_id: str,
) -> None:
    from packages.db.src.tables import GrantApplication

    draft_response = cast(
        "ResearchDeepDiveDraft",
        {key: _make_text("draft", 150) for key in RESEARCH_DEEP_DIVE_FIELD_MAPPING},
    )
    refined_response = cast(
        "ResearchDeepDive",
        {key: _make_text("refined", 260) for key in RESEARCH_DEEP_DIVE_FIELD_MAPPING},
    )

    with (
        patch(
            "services.rag.src.autofill.research_deep_dive_handler.handle_create_search_queries",
            new_callable=AsyncMock,
        ) as mock_search,
        patch(
            "services.rag.src.autofill.research_deep_dive_handler.retrieve_documents",
            new_callable=AsyncMock,
        ) as mock_retrieve,
        patch(
            "services.rag.src.autofill.research_deep_dive_handler.handle_completions_request",
            new_callable=AsyncMock,
        ) as mock_completion,
    ):
        mock_search.return_value = ["search query 1", "search query 2"]
        mock_retrieve.return_value = ["Document content 1", "Document content 2"]
        mock_completion.side_effect = [draft_response, refined_response]

        app = GrantApplication(id="test-id", title="Test Application", research_objectives=[])

        result = await generate_research_deep_dive_content(
            application=app,
            trace_id=trace_id,
        )

        assert isinstance(result, dict)
        assert "background_context" in result
        assert result["hypothesis"].startswith("refined_")

        assert mock_completion.call_count == 2
        first_call_kwargs = mock_completion.await_args_list[0].kwargs
        second_call_kwargs = mock_completion.await_args_list[1].kwargs

        assert first_call_kwargs["prompt_identifier"] == "research_deep_dive_draft"
        assert second_call_kwargs["prompt_identifier"] == "research_deep_dive_refinement"

        mock_search.assert_called_once()
        mock_retrieve.assert_called_once()
