import pytest

from packages.shared_utils.src import exceptions


def test_backend_error_str_and_context(monkeypatch: pytest.MonkeyPatch) -> None:
    context = {"x": 42}
    err = exceptions.BackendError("msg", context=context)
    s = str(err)
    assert "msg" in s
    assert "Context" in s or "context" in s


def test_backend_error_no_context() -> None:
    err = exceptions.BackendError("msg")
    s = str(err)
    assert "msg" in s


def test_subclass_raises() -> None:
    with pytest.raises(exceptions.ValidationError):
        raise exceptions.ValidationError("fail")


def test_rag_job_cancelled_error() -> None:
    error = exceptions.RagJobCancelledError("Job was cancelled")
    assert str(error) == "RagJobCancelledError: Job was cancelled"
    assert isinstance(error, exceptions.BackendError)


def test_rag_job_cancelled_error_with_context() -> None:
    context = {"job_id": "123", "reason": "timeout"}
    error = exceptions.RagJobCancelledError("Job cancelled", context=context)
    error_str = str(error)
    assert "Job cancelled" in error_str
    assert "Context" in error_str or "context" in error_str


def test_llm_timeout_error() -> None:
    error = exceptions.LLMTimeoutError("LLM API request timed out")
    assert str(error) == "LLMTimeoutError: LLM API request timed out"
    assert isinstance(error, exceptions.BackendError)


def test_llm_timeout_error_with_context() -> None:
    context = {"timeout_seconds": 30, "model": "gpt-4"}
    error = exceptions.LLMTimeoutError("Request timeout", context=context)
    error_str = str(error)
    assert "Request timeout" in error_str
    assert "Context" in error_str or "context" in error_str


def test_rag_job_cancelled_error_inheritance() -> None:
    with pytest.raises(exceptions.BackendError):
        raise exceptions.RagJobCancelledError("test")


def test_llm_timeout_error_inheritance() -> None:
    with pytest.raises(exceptions.BackendError):
        raise exceptions.LLMTimeoutError("test")
