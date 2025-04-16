from litestar import get


@get("/health", media_type="text/plain", operation_id="HealthCheck")
async def health_check() -> str:
    """Route handler for the health check endpoint.

    Returns:
        Args string
    """
    return "OK"
