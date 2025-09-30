from collections.abc import Callable
from typing import cast

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)


def with_retry[**P, R](
    *exc: type[Exception],
    max_retries: int = 3,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    return cast(
        "Callable[[Callable[P, R]], Callable[P, R]]",
        retry(
            retry=retry_if_exception_type(exc),
            stop=stop_after_attempt(max_retries),
        ),
    )


def with_exponential_backoff_retry[**P, R](
    *exc: type[Exception],
    max_retries: int = 5,
    initial_wait: int = 5,
    max_wait: int = 60,
    jitter: int = 5,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    return cast(
        "Callable[[Callable[P, R]], Callable[P, R]]",
        retry(
            retry=retry_if_exception_type(exc),
            wait=wait_exponential_jitter(
                initial=initial_wait, max=max_wait, jitter=jitter
            ),
            stop=stop_after_attempt(max_retries),
        ),
    )
