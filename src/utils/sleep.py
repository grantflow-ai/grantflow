import logging
from asyncio import sleep

logger = logging.getLogger(__name__)


async def sleep_with_message(duration: float, identifier: str) -> None:
    """Sleep for a duration and log messages.

    Args:
        duration: The duration to sleep for.
        identifier: The identifier for the sleep.

    Returns:
        None
    """
    logger.info("Beginning sleep for %d seconds: %s", duration, identifier)
    await sleep(int(duration))
    logger.info("Finished sleeping: %s", identifier)
