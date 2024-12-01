from collections.abc import Callable, Coroutine
from functools import partial
from typing import Any

from anyio.to_thread import run_sync  # use anyio to simplify asyncio and ensure multi loop compat


def as_async_callable[**P, T](sync_fn: Callable[P, T]) -> Callable[P, Coroutine[Any, Any, T]]:
    """Convert a synchronous function to an asynchronous one.

    Args:
        sync_fn: The synchronous function to convert.

    Returns:
        The asynchronous function.
    """

    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        handler = (
            partial(  # type: ignore[call-arg]
                sync_fn,
                **kwargs,
            )
            if kwargs
            else sync_fn
        )
        return await run_sync(handler, *args)

    return wrapper
