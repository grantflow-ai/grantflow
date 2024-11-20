from asyncio import gather
from collections.abc import Coroutine
from typing import Any, TypeVar, cast

from src.rag_backend.constants import TWO_SECONDS
from src.utils.sleep import sleep_with_message

T = TypeVar("T")


async def _coroutine_wrapper(coroutine: Coroutine[Any, Any, T], index: int) -> T:
    if delay := index * TWO_SECONDS:
        await sleep_with_message(delay, "Coroutine fanout delay")

    return await coroutine


async def gather_with_delay(
    *coroutines: Coroutine[Any, Any, T],
) -> list[T]:
    """Gather coroutines with a delay between each coroutine.

    Args:
        *coroutines: The coroutines to gather.

    Returns:
        The results of the coroutines.
    """
    return cast(
        list[T],
        list(await gather(*[_coroutine_wrapper(coroutine, index) for index, coroutine in enumerate(coroutines)])),
    )
