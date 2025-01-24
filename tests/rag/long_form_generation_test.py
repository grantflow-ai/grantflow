from typing import Final

import pytest
from pytest_mock import MockerFixture

from src.exceptions import EvaluationError
from src.rag.long_form import (
    LONG_FORM_GENERATION_USER_PROMPT,
    LongFormToolResponse,
    generate_long_form_text,
    handle_long_form_text_generation,
)
from src.utils.prompt_template import PromptTemplate

TEST_PROMPT: Final[PromptTemplate] = LONG_FORM_GENERATION_USER_PROMPT.substitute(
    task_description="Test task",
    min_words=100,
    max_words=200,
    sources={"test": "test data"},
)


@pytest.fixture
def mock_completions_single() -> LongFormToolResponse:
    return LongFormToolResponse(
        text="Generated text",
        is_complete=True,
    )


@pytest.fixture
def mock_completions_multi() -> list[LongFormToolResponse]:
    return [
        LongFormToolResponse(
            text="Generated text 1",
            is_complete=False,
        ),
        LongFormToolResponse(
            text="Generated text 2",
            is_complete=False,
        ),
        LongFormToolResponse(
            text="Generated text 3",
            is_complete=True,
        ),
    ]


async def test_generate_segmented_text_single_response(
    mocker: MockerFixture, mock_completions_single: LongFormToolResponse
) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.long_form.handle_completions_request",
        return_value=mock_completions_single,
    )

    result = await generate_long_form_text(TEST_PROMPT, prompt_identifier="test")

    assert result == mock_completions_single["text"]
    mock_handle_completions.assert_called_once()


async def test_generate_segmented_text_multiple_responses(
    mocker: MockerFixture, mock_completions_multi: list[LongFormToolResponse]
) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.long_form.handle_completions_request",
        side_effect=mock_completions_multi,
    )

    result = await generate_long_form_text(TEST_PROMPT, prompt_identifier="test")

    assert all(response["text"] in result for response in mock_completions_multi)
    assert mock_handle_completions.call_count == len(mock_completions_multi)


async def test_handle_segmented_text_generation_success(
    mocker: MockerFixture, mock_completions_single: LongFormToolResponse
) -> None:
    mocker.patch(
        "src.rag.long_form.generate_long_form_text",
        return_value=mock_completions_single["text"],
    )
    mocker.patch(
        "src.rag.long_form.with_prompt_evaluation",
        return_value=mock_completions_single["text"],
    )

    result = await handle_long_form_text_generation(
        prompt_identifier="test",
        task_description="Test task",
        min_words=100,
        max_words=200,
    )

    assert result == mock_completions_single["text"]


async def test_handle_segmented_text_generation_failure(mocker: MockerFixture) -> None:
    mocker.patch(
        "src.rag.long_form.with_prompt_evaluation",
        side_effect=EvaluationError("Test error"),
    )

    result = await handle_long_form_text_generation(
        prompt_identifier="test",
        task_description="Test task",
        min_words=100,
        max_words=200,
    )

    assert "Failed to generate section text" in result


@pytest.mark.parametrize(
    ("retries", "expected_calls"),
    [
        (1, 1),
        (3, 3),
        (5, 5),
    ],
)
async def test_handle_segmented_text_generation_retries(
    mocker: MockerFixture, retries: int, expected_calls: int
) -> None:
    mock_evaluation = mocker.patch(
        "src.rag.long_form.with_prompt_evaluation",
        side_effect=EvaluationError("Test error"),
    )

    result = await handle_long_form_text_generation(
        prompt_identifier="test",
        task_description="Test task",
        min_words=100,
        max_words=200,
        retries=retries,
    )

    assert "Failed to generate section text" in result
    assert mock_evaluation.call_count == 1


async def test_max_api_calls_limit(mocker: MockerFixture) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.long_form.handle_completions_request",
        return_value={"text": "Partial text", "is_complete": False},
    )

    result = await generate_long_form_text(TEST_PROMPT, prompt_identifier="test")

    assert mock_handle_completions.call_count == 4
    assert "Partial text" in result
