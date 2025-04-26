from asyncio import gather
from collections.abc import Callable, Coroutine
from functools import partial
from itertools import batched
from typing import Any, cast

from anyio.to_thread import run_sync as any_io_run_sync


async def run_sync[**P, T](sync_fn: Callable[P, T], *args: P.args, **kwargs: P.kwargs) -> T:
    handler = partial(sync_fn, **kwargs)
    return cast("T", await any_io_run_sync(handler, *args))  # pyright: ignore [reportCallIssue]


def as_async_callable[**P, T](sync_fn: Callable[P, T]) -> Callable[P, Coroutine[Any, Any, T]]:
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        return await run_sync(sync_fn, *args, **kwargs)

    return wrapper


async def batched_gather[T](
    *coroutines: Coroutine[Any, Any, T],
    batch_size: int,
) -> list[T]:
    ret: list[T] = []
    for batch in batched(coroutines, batch_size):
        ret.extend(await gather(*batch))
    return ret
