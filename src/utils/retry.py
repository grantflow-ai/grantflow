from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Final, ParamSpec, TypeVar, cast

from tenacity import (
    before_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

P = ParamSpec("P")
R = TypeVar("R")

RETRY_ATTEMPTS_WITH_JITTER: Final[int] = 3
INITIAL_WAIT_JITTER: Final[int] = 10
MAX_WAIT_JITTER: Final[int] = 60
EXP_BASE_JITTER: Final[int] = 2
JITTER_VALUE: Final[int] = 30


logger = logging.getLogger(__name__)

DecoratorType = Callable[[Callable[P, R]], Callable[P, R]]


def exponential_backoff_retry(*exc: type[Exception]) -> DecoratorType:  # type: ignore[type-arg]
    """Retry decorator for retrying a function multiple times with exponential backoff.


    Args:
        *exc: The exception types to retry on.

    Returns:
        A decorator that retries the function multiple times with exponential backoff.
    """
    return cast(
        DecoratorType,  # type: ignore[type-arg]
        retry(
            retry=retry_if_exception_type(exc) if exc else retry,  # type: ignore
            wait=wait_exponential_jitter(
                initial=INITIAL_WAIT_JITTER, max=MAX_WAIT_JITTER, exp_base=EXP_BASE_JITTER, jitter=JITTER_VALUE
            ),
            stop=stop_after_attempt(RETRY_ATTEMPTS_WITH_JITTER),
            before=before_log(logger, logging.INFO),
        ),
    )
