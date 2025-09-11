from httpx import AsyncClient, Timeout
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)
client = AsyncClient(timeout=Timeout(15))


async def download_page_html(url: str) -> str:
    response = await client.get(url, follow_redirects=True)
    response.raise_for_status()

    logger.debug(
        "Downloaded page HTML",
        url=url,
        status_code=response.status_code,
        content_type=response.headers.get("content-type", "unknown"),
        content_length=len(response.content),
    )

    return response.text
