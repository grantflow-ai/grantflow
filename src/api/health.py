from sanic import HTTPResponse, text

from src.api_types import APIRequest


async def health_check(_: APIRequest) -> HTTPResponse:
    """Route handler for the health check endpoint.

    Returns:
        The response object.
    """
    return text("OK")
