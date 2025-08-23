import base64
import binascii

import re
from pathlib import Path
from urllib.parse import urlparse

from httpx import AsyncClient, Timeout

from packages.shared_utils.src.logger import get_logger
from services.crawler.src.constants import SKIP_DOMAINS
from packages.shared_utils.src.pubsub import PubSubEvent, CrawlingRequest
from packages.shared_utils.src.exceptions import ValidationError, DeserializationError
from packages.shared_utils.src.serialization import deserialize

client = AsyncClient(timeout=Timeout(15))
logger = get_logger(__name__)


def safe_filename_from_url(url: str, default_extension: str = ".md") -> str:
    parsed = urlparse(url)
    path = parsed.path
    filename = Path(path).name

    if filename:
        if Path(path).suffix:
            return filename
        return filename + default_extension

    base = parsed.netloc + parsed.path
    safe = re.sub(r"[^0-9A-Za-z._-]", "_", base)

    return safe + default_extension


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


async def download_file(url: str) -> bytes:
    response = await client.get(url, timeout=30, follow_redirects=True)
    response.raise_for_status()

    logger.debug(
        "Downloaded file",
        url=url,
        status_code=response.status_code,
        content_type=response.headers.get("content-type", "unknown"),
        content_length=len(response.content),
    )

    return response.content


def filter_url(url: str) -> bool:
    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    if domain in SKIP_DOMAINS:
        return True

    return parsed.scheme not in {"http", "https"}


async def decode_pubsub_message(event: PubSubEvent) -> CrawlingRequest:
    encoded_data = event.message.data
    if not encoded_data:
        logger.warning("PubSub message missing data field")
        raise ValidationError("PubSub message missing data field")

    logger.debug(
        "Decoding PubSub message",
        message_id=event.message.message_id,
        publish_time=event.message.publish_time,
    )

    try:
        decoded_data = base64.b64decode(encoded_data).decode()
        request = deserialize(decoded_data, CrawlingRequest)

        logger.debug(
            "PubSub message decoded successfully",
            source_id=str(request["source_id"]),
            entity_type=request["entity_type"],
            entity_id=str(request["entity_id"]),
            url=request["url"],
            trace_id=request.get("trace_id"),
        )

        return request
    except (DeserializationError, binascii.Error, UnicodeDecodeError) as e:
        logger.error(
            "Validation error processing PubSub message",
            error_type=type(e).__name__,
            error_message=str(e),
            message_id=event.message.message_id,
        )
        raise ValidationError(
            "Failed to decode PubSub message",
            context={"message": event.message, "error": str(e)},
        ) from e
