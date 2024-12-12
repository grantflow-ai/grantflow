from collections.abc import Generator

import pytest

from src.exceptions import MissingEnvVariableError
from src.utils.env import get_env


@pytest.fixture
def env_setup(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    monkeypatch.setenv("VALID_ENV", "valid value")
    yield
    monkeypatch.delenv("VALID_ENV", raising=False)


@pytest.mark.parametrize(
    ("key", "fallback", "expected"),
    [("VALID_ENV", None, "valid value"), ("VALID_ENV", "fallback", "valid value")],
)
def test_get_env_valid(key: str, fallback: str | None, expected: str, env_setup: Generator[None, None, None]) -> None:
    assert get_env(key, fallback) == expected


@pytest.mark.parametrize(
    ("key", "fallback", "expected"),
    [("UNSET_ENV", "fallback_value", "fallback_value")],
)
def test_get_env_with_fallback(key: str, fallback: str, expected: str, env_setup: Generator[None, None, None]) -> None:
    assert get_env(key, fallback) == expected


@pytest.mark.parametrize("key", ["UNSET_ENV"])
def test_missing_env_variable_error(key: str, env_setup: Generator[None, None, None]) -> None:
    with pytest.raises(MissingEnvVariableError):
        get_env(key)
