from functools import partial

from src.utils.sync import as_async_callable


async def test_as_async_callable_no_args() -> None:
    def sync_fn() -> int:
        return 1

    async_fn = as_async_callable(sync_fn)
    result = await async_fn()
    assert result == 1


async def test_as_async_callable_with_args() -> None:
    def sync_fn(a: int, b: int) -> int:
        return a + b

    async_fn = as_async_callable(sync_fn)
    result = await async_fn(1, 2)
    assert result == 3


async def test_as_async_callable_with_kwargs() -> None:
    def sync_fn(a: int, b: int) -> int:
        return a + b

    async_fn = as_async_callable(sync_fn)
    result = await async_fn(a=1, b=2)
    assert result == 3


async def test_as_async_callable_with_partial_kwargs() -> None:
    def sync_fn(a: int, b: int, c: int) -> int:
        return a + b + c

    async_fn = as_async_callable(sync_fn)
    partial_fn = partial(async_fn, c=3)
    result = await partial_fn(a=1, b=2)
    assert result == 6
