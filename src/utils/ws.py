import logging

from sanic import Websocket

from src.api_types import ChatNotification
from src.utils.env import get_env
from src.utils.serialization import serialize

logger = logging.getLogger(__name__)


class NotificationSender:
    """A class to send notifications to the frontend via websocket or SSE.

    Args:
            ws: The websocket object.
    """

    def __init__(self, ws: Websocket) -> None:
        self.ws = ws

    async def _send(self, message: str) -> None:
        """Send a notification to the frontend.

        Args:
            message: The message to send.
        """
        logger.debug("Sending notification: %s", message)
        await self.ws.send(
            serialize(
                ChatNotification(
                    type="notification",
                    text=message,
                )
            ).decode()
        )

    async def debug(self, message: str) -> None:
        """Send a debug message to the frontend.

        Args:
            message: The message to send.
        """
        logger.debug("sending DEBUG notification: %s", message)
        if get_env("DEBUG", "") == "true":
            await self._send(f"DEBUG: {message}")

    async def info(self, message: str) -> None:
        """Send an info message to the frontend.

        Args:
            message: The message to send.
        """
        logger.info("sending INFO notification: %s", message)
        await self._send(message)
