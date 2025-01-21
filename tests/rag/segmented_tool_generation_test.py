import pytest
from pytest_mock import MockerFixture

from src.exceptions import EvaluationError
from src.rag.segmented_tool_generation import (
    SegmentedToolGenerationToolResponse,
    generate_segmeneted_text,
    handle_segmented_text_generation,
)


@pytest.fixture
def mock_completions_single() -> SegmentedToolGenerationToolResponse:
    return {"text": "Generated text content", "is_complete": True}


@pytest.fixture
def mock_completions_multi() -> list[SegmentedToolGenerationToolResponse]:
    return [
        {"text": "First part of text", "is_complete": False},
        {"text": "Second part of text", "is_complete": False},
        {"text": "Final part of text", "is_complete": True},
    ]


async def test_generate_segmented_text_single_response(
    mocker: MockerFixture, mock_completions_single: SegmentedToolGenerationToolResponse
) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.segmented_tool_generation.handle_completions_request",
        return_value=mock_completions_single,
    )

    result = await generate_segmeneted_text("test prompt", prompt_identifier="test")

    assert result == mock_completions_single["text"]
    mock_handle_completions.assert_called_once()


async def test_generate_segmented_text_multiple_responses(
    mocker: MockerFixture, mock_completions_multi: list[SegmentedToolGenerationToolResponse]
) -> None:
    mock_handle_completions = mocker.patch(
        "src.rag.segmented_tool_generation.handle_completions_request",
        side_effect=mock_completions_multi,
    )

    result = await generate_segmeneted_text("test prompt", prompt_identifier="test")

    assert all(response["text"] in result for response in mock_completions_multi)
    assert mock_handle_completions.call_count == len(mock_completions_multi)


async def test_handle_segmented_text_generation_success(
    mocker: MockerFixture, mock_completions_single: SegmentedToolGenerationToolResponse
) -> None:
    mocker.patch(
        "src.rag.segmented_tool_generation.generate_segmeneted_text",
        return_value=mock_completions_single["text"],
    )
    mocker.patch(
        "src.rag.segmented_tool_generation.with_prompt_evaluation",
        return_value=mock_completions_single["text"],
    )

    result = await handle_segmented_text_generation(prompt_identifier="test", user_prompt="test prompt")

    assert result == mock_completions_single["text"]


async def test_handle_segmented_text_generation_failure(mocker: MockerFixture) -> None:
    mocker.patch(
        "src.rag.segmented_tool_generation.with_prompt_evaluation",
        side_effect=EvaluationError("Test error"),
    )

    result = await handle_segmented_text_generation(prompt_identifier="test", user_prompt="test prompt")

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

    result = await handle_segmented_text_generation(
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

    result = await generate_segmeneted_text("test prompt", prompt_identifier="test")

    assert mock_handle_completions.call_count == 4
    assert "Partial text" in result
