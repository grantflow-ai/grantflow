import asyncio
import base64
import json
import os
from datetime import datetime, UTC
from uuid import uuid4

import httpx
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)

INDEXER_URL = "http://localhost:8001"
RETRY_DELAY = 1.0
MAX_RETRIES = 3


def is_development_environment() -> bool:
    env = os.getenv("ENVIRONMENT", "development")
    return env in ("development", "dev", "local")


async def trigger_dev_indexing(object_path: str, trace_id: str = "") -> None:
    if not is_development_environment():
        return

    logger.info(
        "Triggering dev indexing bypass",
        object_path=object_path,
        trace_id=trace_id,
    )

    event_data = {
        "bucket": "grantflow-uploads",
        "name": object_path,
    }

    encoded_data = base64.b64encode(json.dumps(event_data).encode()).decode()

    pubsub_message = {
        "message": {
            "attributes": {
                "bucketId": "grantflow-uploads",
                "eventType": "OBJECT_FINALIZE",
                "objectId": object_path,
                "customMetadata_trace-id": trace_id,
            },
            "data": encoded_data,
            "message_id": f"dev-{datetime.now(UTC).timestamp()}-{uuid4().hex[:8]}",
            "publish_time": datetime.now(UTC).isoformat(),
        }
    }

    async with httpx.AsyncClient() as client:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = await client.post(
                    INDEXER_URL,
                    json=pubsub_message,
                    headers={"Content-Type": "application/json"},
                    timeout=30.0,
                )

                if response.status_code == 200:
                    logger.info(
                        "Successfully triggered dev indexing",
                        object_path=object_path,
                        trace_id=trace_id,
                        attempt=attempt,
                    )
                    return

                logger.warning(
                    "Indexer returned non-success status",
                    status_code=response.status_code,
                    response_text=response.text[:500],
                    object_path=object_path,
                    trace_id=trace_id,
                    attempt=attempt,
                )

            except httpx.RequestError as e:
                logger.warning(
                    "Failed to connect to indexer",
                    error=str(e),
                    object_path=object_path,
                    trace_id=trace_id,
                    attempt=attempt,
                )
            except Exception as e:
                logger.error(
                    "Unexpected error triggering dev indexing",
                    error=str(e),
                    error_type=type(e).__name__,
                    object_path=object_path,
                    trace_id=trace_id,
                    attempt=attempt,
                )

            if attempt < MAX_RETRIES:
                delay = RETRY_DELAY * attempt
                logger.debug(
                    "Retrying dev indexing trigger",
                    delay_seconds=delay,
                    next_attempt=attempt + 1,
                    trace_id=trace_id,
                )
                await asyncio.sleep(delay)

    logger.error(
        "Failed to trigger dev indexing after all retries",
        object_path=object_path,
        trace_id=trace_id,
        max_retries=MAX_RETRIES,
    )
