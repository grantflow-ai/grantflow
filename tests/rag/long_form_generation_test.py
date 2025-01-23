import pytest
from pytest_mock import MockerFixture

from src.exceptions import EvaluationError
from src.rag.long_form import (
    LongFormToolResponse,
    generate_long_form_text,
    handle_long_form_text_generation,
)


@pytest.fixture
def mock_completions_single() -> LongFormToolResponse:
    return LongFormToolResponse(
        text="Generated text",
        is_complete=True,
        missing_information=[],
    )


@pytest.fixture
def mock_completions_multi() -> list[LongFormToolResponse]:
    return [
        LongFormToolResponse(
            text="Generated text 1",
            is_complete=False,
            missing_information=[],
        ),
        LongFormToolResponse(
            text="Generated text 2",
            is_complete=False,
            missing_information=[],
        ),
        LongFormToolResponse(
            text="Generated text 3",
            is_complete=True,
            missing_information=[],
        ),
    ]


async def test_generate_segmented_text_single_response(
    mocker: MockerFixture, mock_completions_single: LongFormToolResponse
) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.segmented_tool_generation.handle_completions_request",
        return_value=mock_completions_single,
    )

    result = await generate_long_form_text("test prompt", prompt_identifier="test")

    assert result == mock_completions_single["text"]
    mock_handle_completions.assert_called_once()


async def test_generate_segmented_text_multiple_responses(
    mocker: MockerFixture, mock_completions_multi: list[LongFormToolResponse]
) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.segmented_tool_generation.handle_completions_request",
        side_effect=mock_completions_multi,
    )

    result = await generate_long_form_text("test prompt", prompt_identifier="test")

    assert all(response["text"] in result for response in mock_completions_multi)
    assert mock_handle_completions.call_count == len(mock_completions_multi)


async def test_handle_segmented_text_generation_success(
    mocker: MockerFixture, mock_completions_single: LongFormToolResponse
) -> None:
    mocker.patch(
        "src.rag.segmented_tool_generation.generate_segmeneted_text",
        return_value=mock_completions_single["text"],
    )
    mocker.patch(
        "src.rag.segmented_tool_generation.with_prompt_evaluation",
        return_value=mock_completions_single["text"],
    )

    result = await handle_long_form_text_generation(prompt_identifier="test", user_prompt="test prompt")

    assert result == mock_completions_single["text"]


async def test_handle_segmented_text_generation_failure(mocker: MockerFixture) -> None:
    mocker.patch(
        "src.rag.segmented_tool_generation.with_prompt_evaluation",
        side_effect=EvaluationError("Test error"),
    )

    result = await handle_long_form_text_generation(prompt_identifier="test", user_prompt="test prompt")

    assert "Failed to generate text" in result


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
        "src.rag.segmented_tool_generation.with_prompt_evaluation",
        side_effect=EvaluationError("Test error"),
    )

    result = await handle_long_form_text_generation(
        prompt_identifier="test",
        user_prompt="test prompt",
        retries=retries,
    )

    assert "Failed to generate text" in result
    assert mock_evaluation.call_count == 1


async def test_max_api_calls_limit(
    mocker: MockerFixture,
) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.segmented_tool_generation.handle_completions_request",
        return_value={"text": "Partial text", "is_complete": False},
    )

    result = await generate_long_form_text("test prompt", prompt_identifier="test")

    assert mock_handle_completions.call_count == 4
    assert "Partial text" in result
