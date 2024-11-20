from collections.abc import Coroutine
from typing import Any, TypeVar

from src.utils.sleep import sleep_with_message

T = TypeVar("T")


async def delayed_async(coroutine: Coroutine[Any, Any, T], delay: int) -> T:
    """Delay the execution of a coroutine.

    Args:
        coroutine: The coroutine to execute.
        delay: The delay in seconds.

    Returns:
        The result of the coroutine.
    """
    if delay:
        await sleep_with_message(delay, "Coroutine fanout delay")

    return await coroutine
