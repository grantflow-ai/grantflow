from collections.abc import Callable, Coroutine
from functools import partial
from typing import Any

from anyio.to_thread import run_sync as any_io_run_sync  # use anyio to simplify asyncio and ensure multi loop compat


async def run_sync[**P, T](sync_fn: Callable[P, T], *args: P.args, **kwargs: P.kwargs) -> T:
    """Run a synchronous function in an asynchronous context.

    Args:
        sync_fn: The synchronous function to run.
        *args: The positional arguments to pass to the function.
        **kwargs: The keyword arguments to pass to the function.

    Returns:
        The result of the synchronous function.
    """
    handler = partial(sync_fn, **kwargs)  # type: ignore[call-arg]
    return await any_io_run_sync(handler, *args)


def as_async_callable[**P, T](sync_fn: Callable[P, T]) -> Callable[P, Coroutine[Any, Any, T]]:
    """Convert a synchronous function to an asynchronous one.

    Args:
        sync_fn: The synchronous function to convert.

    Returns:
        The asynchronous function.
    """

    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        return await run_sync(sync_fn, *args, **kwargs)

    return wrapper
