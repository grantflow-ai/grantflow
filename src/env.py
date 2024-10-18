from __future__ import annotations

import os

from src.exceptions import MissingEnvVariableError


def get_env(key: str, fallback: str | None = None) -> str:
    """Get an environment variable or raise an error if it is unset and a fallback has not been provided.

    Args:
        key: Environment variable key.
        fallback: An optional fallback value to use if the environment variable is unset.

    Returns:
        A string containing the value of the environment variable.

    Raises:
        MissingEnvVariableError: If the environment variable is unset and a fallback has not been provided.
    """
    value = os.environ.get(key, fallback)
    if value is None:
        raise MissingEnvVariableError(f"Required ENV variable {key} is not set.")

    return value
