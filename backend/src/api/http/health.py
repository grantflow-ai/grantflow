from litestar import get


@get("/health", media_type="text/plain", operation_id="HealthCheck")
async def health_check() -> str:
    return "OK"
