from unittest.mock import Mock

import pytest

from packages.shared_utils.src.retry import with_exponential_backoff_retry, with_retry


async def test_with_retry_success_without_retry() -> None:
    mock_fn = Mock(return_value="success")
    decorated = with_retry(ValueError)(mock_fn)

    result = decorated()

    assert result == "success"
    assert mock_fn.call_count == 1


async def test_with_retry_eventually_succeeds() -> None:
    mock_fn = Mock(side_effect=[ValueError, ValueError, "success"])
    decorated = with_retry(ValueError, max_retries=3)(mock_fn)

    result = decorated()

    assert result == "success"
    assert mock_fn.call_count == 3


async def test_with_retry_max_retries_exceeded() -> None:
    from tenacity import RetryError

    mock_fn = Mock(side_effect=[ValueError("error"), ValueError("error"), ValueError("error")])
    decorated = with_retry(ValueError, max_retries=3)(mock_fn)

    with pytest.raises(RetryError):
        decorated()

    assert mock_fn.call_count == 3


async def test_with_retry_ignores_other_exceptions() -> None:
    mock_fn = Mock(side_effect=TypeError("wrong type"))
    decorated = with_retry(ValueError, max_retries=3)(mock_fn)

    with pytest.raises(TypeError):
        decorated()

    assert mock_fn.call_count == 1


async def test_with_exponential_backoff_retry_success() -> None:
    mock_fn = Mock(return_value="success")
    decorated = with_exponential_backoff_retry(ValueError)(mock_fn)

    result = decorated()

    assert result == "success"
    assert mock_fn.call_count == 1


async def test_with_exponential_backoff_retry_eventually_succeeds() -> None:
    mock_fn = Mock(side_effect=[ValueError, ValueError, "success"])
    decorated = with_exponential_backoff_retry(ValueError, max_retries=3)(mock_fn)

    result = decorated()

    assert result == "success"
    assert mock_fn.call_count == 3
