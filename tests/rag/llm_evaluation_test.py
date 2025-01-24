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
        "relevance": {"score": 90, "reasoning": "Good relevance"},
        "accuracy": {"score": 95, "reasoning": "Highly accurate"},
        "completeness": {"score": 90, "reasoning": "Complete coverage"},
        "instruction_adherence": {"score": 85, "reasoning": "Follows instructions"},
        "coherence_clarity": {"score": 95, "reasoning": "Clear and coherent"},
        "hallucination": {"score": 100, "reasoning": "No hallucinations"},
    }


@pytest.fixture
def failing_evaluation() -> EvaluationToolResponse:
    return {
        "relevance": {"score": 60, "reasoning": "Poor relevance"},
        "accuracy": {"score": 50, "reasoning": "Inaccurate content"},
        "completeness": {"score": 40, "reasoning": "Incomplete"},
        "instruction_adherence": {"score": 30, "reasoning": "Doesn't follow instructions"},
        "coherence_clarity": {"score": 70, "reasoning": "Somewhat clear"},
        "hallucination": {"score": 20, "reasoning": "Many hallucinations"},
    }


@pytest.fixture
def low_score_evaluation() -> EvaluationToolResponse:
    return {
        "relevance": {"score": 35, "reasoning": "Low relevance"},
        "accuracy": {"score": 35, "reasoning": "Low accuracy"},
        "completeness": {"score": 35, "reasoning": "Low completeness"},
        "instruction_adherence": {"score": 35, "reasoning": "Basic instructions"},
        "coherence_clarity": {"score": 35, "reasoning": "Basic clarity"},
        "hallucination": {"score": 35, "reasoning": "Some hallucinations"},
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
        min_passing_score=85,
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
            min_passing_score=85,
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
        min_passing_score=85,
    )

    assert result == "test output"
    assert mock_handler.call_count == 2
    assert mock_completions.call_count == 2


@pytest.mark.parametrize(
    "min_score,should_pass",
    [
        (30, True),
        (40, False),
        (50, False),
    ],
)
async def test_with_prompt_evaluation_different_min_scores(
    mocker: MockerFixture,
    low_score_evaluation: EvaluationToolResponse,
    min_score: int,
    should_pass: bool,
) -> None:
    mock_handler = AsyncMock(return_value="test output")
    mock_completions = mocker.patch(
        "src.rag.llm_evaluation.make_completions_request",
        new_callable=AsyncMock,
        return_value=low_score_evaluation,
    )

    if should_pass:
        result = await with_prompt_evaluation(
            prompt_handler=mock_handler,
            prompt=TEST_PROMPT,
            min_passing_score=min_score,
        )
        assert result == "test output"
        mock_completions.assert_called_once()
    else:
        with pytest.raises(EvaluationError):
            await with_prompt_evaluation(
                prompt_handler=mock_handler,
                prompt=TEST_PROMPT,
                min_passing_score=min_score,
            )
