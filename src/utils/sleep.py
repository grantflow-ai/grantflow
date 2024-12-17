from asyncio import sleep

from src.utils.logging import get_logger

logger = get_logger(__name__)


async def sleep_with_message(duration: float, identifier: str) -> None:
    """Sleep for a duration and log messages.

    Args:
        duration: The duration to sleep for.
        identifier: The identifier for the sleep.

    Returns:
        None
    """
    logger.info("Beginning sleep", duration=duration, identifier=identifier)
    await sleep(int(duration))
    logger.info("Finished sleeping", identifier=identifier)
