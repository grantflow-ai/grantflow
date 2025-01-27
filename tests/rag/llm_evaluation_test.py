from unittest.mock import AsyncMock

import pytest
from pytest_mock import MockerFixture

from src.exceptions import EvaluationError
from src.rag.llm_evaluation import (
    EvaluationToolResponse,
    evaluate_prompt_output,
    with_prompt_evaluation,
)
from src.utils.prompt_template import PromptTemplate

TEST_PROMPT = PromptTemplate("test prompt")


@pytest.fixture
def passing_evaluation() -> EvaluationToolResponse:
    return {
        "scores": {
            "accuracy": {"score": 100, "reasoning": "Highly accurate content"},
            "completeness": {"score": 100, "reasoning": "Complete coverage"},
            "correctness": {"score": 100, "reasoning": "Follows all guidelines"},
            "coherence": {"score": 100, "reasoning": "Clear and coherent"},
            "information_density": {"score": 100, "reasoning": "High information density"},
        },
        "instructions": "No improvements needed.",
    }


@pytest.fixture
def failing_evaluation() -> EvaluationToolResponse:
    return {
        "scores": {
            "accuracy": {"score": 60, "reasoning": "Contains inaccuracies"},
            "completeness": {"score": 50, "reasoning": "Missing key information"},
            "correctness": {"score": 40, "reasoning": "Doesn't follow guidelines"},
            "coherence": {"score": 70, "reasoning": "Some lack of clarity"},
            "information_density": {"score": 55, "reasoning": "Low information density"},
        },
        "instructions": "Please improve accuracy and completeness. Follow guidelines more closely.",
    }


@pytest.fixture
def borderline_evaluation() -> EvaluationToolResponse:
    return {
        "scores": {
            "accuracy": {"score": 85, "reasoning": "Generally accurate"},
            "completeness": {"score": 85, "reasoning": "Most requirements met"},
            "correctness": {"score": 85, "reasoning": "Mostly follows guidelines"},
            "coherence": {"score": 85, "reasoning": "Mostly clear"},
            "information_density": {"score": 85, "reasoning": "Good information density"},
        },
        "instructions": "Minor improvements needed in all areas.",
    }


async def test_evaluate_prompt_output(mocker: MockerFixture) -> None:
    mock_completions = mocker.patch("src.rag.llm_evaluation.make_completions_request", new_callable=AsyncMock)

    await evaluate_prompt_output(prompt="test prompt", model_output="test output")
    mock_completions.assert_called_once()


async def test_with_prompt_evaluation_success(
    mocker: MockerFixture,
    passing_evaluation: EvaluationToolResponse,
) -> None:
    mock_handler = AsyncMock(return_value="test output")
    mock_completions = mocker.patch(
        "src.rag.llm_evaluation.make_completions_request",
        new_callable=AsyncMock,
        return_value=passing_evaluation,
    )

    result = await with_prompt_evaluation(
        prompt_handler=mock_handler,
        prompt=TEST_PROMPT,
    )

    assert result == "test output"
    mock_handler.assert_called_once_with(TEST_PROMPT)
    mock_completions.assert_called_once()


async def test_with_prompt_evaluation_failure(
    mocker: MockerFixture,
    failing_evaluation: EvaluationToolResponse,
) -> None:
    mock_handler = AsyncMock(return_value="test output")
    mocker.patch(
        "src.rag.llm_evaluation.make_completions_request",
        new_callable=AsyncMock,
        return_value=failing_evaluation,
    )

    with pytest.raises(EvaluationError):
        await with_prompt_evaluation(
            prompt_handler=mock_handler,
            prompt=TEST_PROMPT,
            passing_score=80,
            retries=1,
        )


async def test_with_prompt_evaluation_retry_success(
    mocker: MockerFixture,
    failing_evaluation: EvaluationToolResponse,
    passing_evaluation: EvaluationToolResponse,
) -> None:
    mock_handler = AsyncMock(return_value="test output")
    mock_completions = mocker.patch(
        "src.rag.llm_evaluation.make_completions_request",
        new_callable=AsyncMock,
        side_effect=[failing_evaluation, passing_evaluation],
    )

    result = await with_prompt_evaluation(
        prompt_handler=mock_handler,
        prompt=TEST_PROMPT,
        passing_score=80,
    )

    assert result == "test output"
    assert mock_handler.call_count == 2
    assert mock_completions.call_count == 2


@pytest.mark.parametrize(
    "passing_score,multiplier,expected_calls,should_raise",
    [
        (95, 2.5, 4, True),  # Will fail with 85 score (95, 92.5, 90, 87.5)
        (87, 2.5, 2, False),  # Passes on second try (87, 84.5)
        (85, 2.5, 1, False),  # Passes immediately
        (90, 5, 2, False),  # Passes with score 85
    ],
)
async def test_with_prompt_evaluation_different_scores(
    mocker: MockerFixture,
    borderline_evaluation: EvaluationToolResponse,
    passing_score: int,
    multiplier: float,
    expected_calls: int,
    should_raise: bool,
) -> None:
    """Test the evaluation with different passing scores and multipliers."""
    mock_handler = AsyncMock(return_value="test output")
    mock_completions = mocker.patch(
        "src.rag.llm_evaluation.make_completions_request",
        new_callable=AsyncMock,
        return_value=borderline_evaluation,
    )

    if should_raise:
        with pytest.raises(EvaluationError):
            await with_prompt_evaluation(
                prompt_handler=mock_handler,
                prompt=TEST_PROMPT,
                passing_score=passing_score,
                increment=multiplier,
            )
    else:
        result = await with_prompt_evaluation(
            prompt_handler=mock_handler,
            prompt=TEST_PROMPT,
            passing_score=passing_score,
            increment=multiplier,
        )
        assert result == "test output"

    assert mock_handler.call_count == expected_calls
    assert mock_completions.call_count == expected_calls
