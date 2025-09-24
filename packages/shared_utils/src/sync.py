from asyncio import gather
from collections.abc import Callable, Coroutine
from functools import partial
from itertools import batched
from typing import Any, Literal, cast, overload

from anyio.to_thread import run_sync as any_io_run_sync


async def run_sync[**P, T](
    sync_fn: Callable[P, T], *args: P.args, **kwargs: P.kwargs
) -> T:
    handler = partial(sync_fn, **kwargs)
    return cast("T", await any_io_run_sync(handler, *args))  # pyright: ignore [reportCallIssue]


def as_async_callable[**P, T](
    sync_fn: Callable[P, T],
) -> Callable[P, Coroutine[Any, Any, T]]:
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
        return await run_sync(sync_fn, *args, **kwargs)

    return wrapper


@overload
async def batched_gather[T](
    *coroutines: Coroutine[Any, Any, T],
    batch_size: int,
    return_exceptions: Literal[False] = False,
) -> list[T]: ...


@overload
async def batched_gather[T](
    *coroutines: Coroutine[Any, Any, T],
    batch_size: int,
    return_exceptions: Literal[True],
) -> list[T | BaseException]: ...


async def batched_gather[T](
    *coroutines: Coroutine[Any, Any, T],
    batch_size: int,
    return_exceptions: bool = False,
) -> list[T] | list[T | BaseException]:
    ret: list[T | BaseException] = []
    for batch in batched(coroutines, batch_size, strict=False):
        ret.extend(await gather(*batch, return_exceptions=return_exceptions))
    return ret
