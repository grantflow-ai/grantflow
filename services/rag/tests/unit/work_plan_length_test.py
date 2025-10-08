from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock

import pytest

from services.rag.src.grant_application.generate_work_plan_text import (
    MAX_LENGTH_ADJUST_ATTEMPTS,
    _truncate_to_word_limit,
    adjust_component_length,
)

if TYPE_CHECKING:
    from pytest_mock import MockerFixture

    from services.rag.src.grant_application.dto import ResearchComponentGenerationDTO


@pytest.mark.asyncio
async def test_adjust_component_length_includes_work_plan_context(mocker: MockerFixture) -> None:
    component: ResearchComponentGenerationDTO = {
        "number": "1.1",
        "title": "Test Task",
        "description": "Detailed description",
        "instructions": "Follow the instructions strictly.",
        "guiding_questions": ["Q1", "Q2"],
        "search_queries": ["test query"],
        "relationships": [("1.0", "Relies on objective output")],
        "max_words": 50,
        "type": "task",
    }

    # Create text slightly above the limit to force an adjustment pass.
    component_text = " ".join(["word"] * 70)
    work_plan_so_far = "# Existing Work Plan\n\nPrevious content."

    job_manager = AsyncMock()
    mock_with_evaluation = mocker.patch(
        "services.rag.src.grant_application.generate_work_plan_text.with_evaluation",
        autospec=True,
        return_value=" ".join(["short"] * 45),
    )

    result = await adjust_component_length(
        component=component,
        component_text=component_text,
        rag_results=["Context snippet"],
        form_inputs={},
        work_plan_text=work_plan_so_far,
        trace_id="test-trace",
        job_manager=job_manager,
    )

    assert mock_with_evaluation.await_count == 1, "Should perform a single adjustment when first attempt passes."
    called_prompt = mock_with_evaluation.await_args_list[0].kwargs["prompt"]
    assert "Work Plan So Far" in called_prompt, "Adjustment prompt should include work plan context header."
    assert work_plan_so_far in called_prompt, "Adjustment prompt should embed the existing work plan text."
    assert _truncate_to_word_limit(result, component["max_words"]) == result, "Result must respect max words."


@pytest.mark.asyncio
async def test_adjust_component_length_fallback_truncation_evaluated(mocker: MockerFixture) -> None:
    component: ResearchComponentGenerationDTO = {
        "number": "1.1",
        "title": "Lengthy Objective",
        "description": "Detailed description",
        "instructions": "Preserve critical details.",
        "guiding_questions": ["Q1", "Q2"],
        "search_queries": ["long query"],
        "relationships": [],
        "max_words": 60,
        "type": "objective",
    }

    long_text = " ".join(["content"] * 150)
    truncated_expected = _truncate_to_word_limit(long_text, component["max_words"])

    job_manager = AsyncMock()
    evaluation_mock = mocker.patch(
        "services.rag.src.grant_application.generate_work_plan_text.with_evaluation",
        autospec=True,
        side_effect=[long_text] * MAX_LENGTH_ADJUST_ATTEMPTS + [truncated_expected],
    )

    result = await adjust_component_length(
        component=component,
        component_text=long_text,
        rag_results=["Reference context"],
        form_inputs={},
        work_plan_text="Existing work plan content.",
        trace_id="test-trace",
        job_manager=job_manager,
    )

    assert evaluation_mock.await_count == MAX_LENGTH_ADJUST_ATTEMPTS + 1, (
        "Fallback should trigger an additional evaluation call."
    )
    assert result == truncated_expected, "Final result should match the evaluated truncated text."

    final_call_kwargs = evaluation_mock.await_args_list[-1].kwargs
    assert final_call_kwargs["prompt_identifier"] == "adjust_work_component_length_truncate", (
        "Fallback evaluation should use truncate identifier."
    )
    assert final_call_kwargs["prompt"].count(truncated_expected.split()[0]) > 0, "Prompt should include truncated text."
