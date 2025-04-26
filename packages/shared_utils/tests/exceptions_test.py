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
