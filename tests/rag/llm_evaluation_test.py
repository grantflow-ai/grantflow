from unittest.mock import AsyncMock, patch

import pytest

from src.exceptions import EvaluationError
from src.rag.llm_evaluation import (
    EvaluationToolResponse,
    evaluate_prompt_output,
    with_prompt_evaluation,
)


@pytest.fixture
def mock_make_completions_request() -> AsyncMock:
    return AsyncMock()


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


async def test_evaluate_prompt_output(mock_make_completions_request: AsyncMock) -> None:
    with patch("src.rag.llm_evaluation.make_completions_request", mock_make_completions_request):
        await evaluate_prompt_output(original_prompt="test prompt", model_output="test output")

    mock_make_completions_request.assert_called_once()


async def test_with_prompt_evaluation_success(
    mock_make_completions_request: AsyncMock,
    passing_evaluation: EvaluationToolResponse,
) -> None:
    mock_handler = AsyncMock(return_value="test output")
    mock_make_completions_request.return_value = passing_evaluation

    with patch("src.rag.llm_evaluation.make_completions_request", mock_make_completions_request):
        result = await with_prompt_evaluation(
            prompt_handler=mock_handler,
            task_description="test prompt",
            min_passing_score=85,
        )

    assert result == "test output"
    mock_handler.assert_called_once_with("test prompt")
    mock_make_completions_request.assert_called_once()


async def test_with_prompt_evaluation_failure(
    mock_make_completions_request: AsyncMock,
    failing_evaluation: EvaluationToolResponse,
) -> None:
    mock_handler = AsyncMock(return_value="test output")
    mock_make_completions_request.return_value = failing_evaluation

    with (
        patch("src.rag.llm_evaluation.make_completions_request", mock_make_completions_request),
        pytest.raises(EvaluationError),
    ):
        await with_prompt_evaluation(
            prompt_handler=mock_handler,
            task_description="test prompt",
            min_passing_score=85,
            retries=1,
        )


async def test_with_prompt_evaluation_retry_success(
    mock_make_completions_request: AsyncMock,
    failing_evaluation: EvaluationToolResponse,
    passing_evaluation: EvaluationToolResponse,
) -> None:
    mock_handler = AsyncMock(return_value="test output")
    mock_make_completions_request.side_effect = [failing_evaluation, passing_evaluation]

    with patch("src.rag.llm_evaluation.make_completions_request", mock_make_completions_request):
        result = await with_prompt_evaluation(
            prompt_handler=mock_handler,
            task_description="test prompt",
            min_passing_score=85,
        )

    assert result == "test output"
    assert mock_handler.call_count == 2
    assert mock_make_completions_request.call_count == 2


async def test_with_prompt_evaluation_different_min_score(
    mock_make_completions_request: AsyncMock,
    low_score_evaluation: EvaluationToolResponse,
) -> None:
    mock_handler = AsyncMock(return_value="test output")
    mock_make_completions_request.return_value = low_score_evaluation

    with patch("src.rag.llm_evaluation.make_completions_request", mock_make_completions_request):
        result = await with_prompt_evaluation(
            prompt_handler=mock_handler,
            task_description="test prompt",
            min_passing_score=30,
        )

    assert result == "test output"
    mock_handler.assert_called_once()
    mock_make_completions_request.assert_called_once()
