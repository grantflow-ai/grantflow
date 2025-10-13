from typing import TYPE_CHECKING, cast
from unittest.mock import AsyncMock, patch

import pytest
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.autofill.research_plan_handler import (
    ResearchPlanDraft,
    ResearchPlanResponse,
    _format_existing_objectives,
    _validate_research_plan_draft,
    _validate_research_plan_refinement,
    generate_research_plan_content,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import ResearchObjective


def _make_words(prefix: str, count: int) -> str:
    return " ".join(f"{prefix}_{i}" for i in range(count))


def test_format_existing_objectives() -> None:
    objectives: list[ResearchObjective] = cast(
        "list[ResearchObjective]",
        [
            {
                "number": 1,
                "title": "Objective One",
                "description": "First description",
                "research_tasks": [
                    {"number": 1, "title": "Task A", "description": "Task detail A"},
                    {"number": 2, "title": "Task B", "description": "Task detail B"},
                ],
            }
        ],
    )

    formatted = _format_existing_objectives(objectives)
    assert "Objective 1" in formatted
    assert "Task 1" in formatted
    assert "Task 2" in formatted

    assert _format_existing_objectives(None) == "No existing objectives provided."
    assert _format_existing_objectives(cast("list[ResearchObjective]", [])) == "No existing objectives provided."


def test_validate_research_plan_draft() -> None:
    draft: ResearchPlanDraft = {
        "objectives": [
            {
                "num": 1,
                "title": "Detailed objective title",
                "desc": _make_words("draft_desc", 60),
                "tasks": [
                    {"num": 1, "title": "Task title first", "desc": _make_words("task_desc", 55)},
                    {"num": 2, "title": "Task title second", "desc": _make_words("task_desc", 55)},
                ],
            },
            {
                "num": 2,
                "title": "Second detailed objective title",
                "desc": _make_words("draft_desc", 65),
                "tasks": [
                    {"num": 1, "title": "Task title third", "desc": _make_words("task_desc", 55)},
                    {"num": 2, "title": "Task title fourth", "desc": _make_words("task_desc", 55)},
                ],
            },
        ]
    }
    _validate_research_plan_draft(draft)

    invalid = draft.copy()
    invalid["objectives"] = draft["objectives"] + [
        {
            "num": 2,
            "title": "Duplicate number objective",
            "desc": _make_words("draft_desc", 65),
            "tasks": draft["objectives"][0]["tasks"],
        }
    ]

    with pytest.raises(ValidationError, match="Duplicate objective number"):
        _validate_research_plan_draft(invalid)


def test_validate_research_plan_refinement() -> None:
    refined: ResearchPlanResponse = {
        "research_objectives": [
            {
                "number": 1,
                "title": "Objective One Refined",
                "description": _make_words("objective", 210),
                "research_tasks": [
                    {"number": 1, "title": "Task One Refined", "description": _make_words("task", 90)},
                    {"number": 2, "title": "Task Two Refined", "description": _make_words("task", 95)},
                ],
            },
            {
                "number": 2,
                "title": "Objective Two Refined",
                "description": _make_words("objective", 215),
                "research_tasks": [
                    {"number": 1, "title": "Task Three Refined", "description": _make_words("task", 90)},
                    {"number": 2, "title": "Task Four Refined", "description": _make_words("task", 92)},
                ],
            },
        ]
    }
    _validate_research_plan_refinement(refined)

    too_short = refined.copy()
    too_short["research_objectives"][0]["description"] = _make_words("objective", 80)

    with pytest.raises(ValidationError, match="description should be 100-300 words"):
        _validate_research_plan_refinement(too_short)


async def test_generate_research_plan_content_with_mocks(trace_id: str) -> None:
    from packages.db.src.tables import GrantApplication

    draft_response: ResearchPlanDraft = {
        "objectives": [
            {
                "num": 1,
                "title": "Objective Draft One",
                "desc": _make_words("draft_desc", 70),
                "tasks": [
                    {"num": 1, "title": "Task One", "desc": _make_words("task_desc", 60)},
                    {"num": 2, "title": "Task Two", "desc": _make_words("task_desc", 60)},
                ],
            },
            {
                "num": 2,
                "title": "Objective Draft Two",
                "desc": _make_words("draft_desc", 75),
                "tasks": [
                    {"num": 1, "title": "Task Three", "desc": _make_words("task_desc", 60)},
                    {"num": 2, "title": "Task Four", "desc": _make_words("task_desc", 60)},
                ],
            },
        ]
    }

    refined_response: ResearchPlanResponse = {
        "research_objectives": [
            {
                "number": 1,
                "title": "Objective One Refined",
                "description": _make_words("objective", 210),
                "research_tasks": [
                    {"number": 1, "title": "Task One Refined", "description": _make_words("task", 90)},
                    {"number": 2, "title": "Task Two Refined", "description": _make_words("task", 95)},
                ],
            },
            {
                "number": 2,
                "title": "Objective Two Refined",
                "description": _make_words("objective", 215),
                "research_tasks": [
                    {"number": 1, "title": "Task Three Refined", "description": _make_words("task", 90)},
                    {"number": 2, "title": "Task Four Refined", "description": _make_words("task", 92)},
                ],
            },
        ]
    }

    with (
        patch(
            "services.rag.src.autofill.research_plan_handler.handle_create_search_queries",
            new_callable=AsyncMock,
        ) as mock_search,
        patch(
            "services.rag.src.autofill.research_plan_handler.retrieve_documents",
            new_callable=AsyncMock,
        ) as mock_retrieve,
        patch(
            "services.rag.src.autofill.research_plan_handler.handle_completions_request",
            new_callable=AsyncMock,
        ) as mock_completion,
    ):
        mock_search.return_value = ["query one", "query two"]
        mock_retrieve.return_value = ["context one", "context two"]
        mock_completion.side_effect = [draft_response, refined_response]

        app = GrantApplication(id="test-app", title="Test Application", research_objectives=[])

        result = await generate_research_plan_content(application=app, trace_id=trace_id)

        assert len(result) == 2
        assert result[0]["number"] == 1
        assert result[0]["title"] == "Objective One Refined"

        assert mock_completion.call_count == 2
        assert mock_completion.await_args_list[0].kwargs["prompt_identifier"] == "research_plan_draft_generation"
        assert mock_completion.await_args_list[1].kwargs["prompt_identifier"] == "research_plan_refinement"

        mock_search.assert_called_once()
        mock_retrieve.assert_called_once()
