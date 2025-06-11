import os

import pytest

from packages.shared_utils.src.env import get_env


async def test_get_env_existing() -> None:
    os.environ["TEST_VAR"] = "test_value"
    assert get_env("TEST_VAR") == "test_value"
    del os.environ["TEST_VAR"]


async def test_get_env_missing_with_raise() -> None:
    if "NONEXISTENT_VAR" in os.environ:
        del os.environ["NONEXISTENT_VAR"]

    with pytest.raises(ValueError, match="Missing environment variable: NONEXISTENT_VAR"):
        get_env("NONEXISTENT_VAR")


async def test_get_env_missing_without_raise() -> None:
    if "NONEXISTENT_VAR" in os.environ:
        del os.environ["NONEXISTENT_VAR"]

    assert get_env("NONEXISTENT_VAR", raise_on_missing=False) == ""


async def test_get_env_with_fallback() -> None:
    if "NONEXISTENT_VAR" in os.environ:
        del os.environ["NONEXISTENT_VAR"]

    assert get_env("NONEXISTENT_VAR", raise_on_missing=False, fallback="default_value") == "default_value"
