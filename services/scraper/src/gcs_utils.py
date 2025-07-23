"""GCS utilities for the scraper service."""

from __future__ import annotations

import time
from typing import TYPE_CHECKING

from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.gcs import get_storage_client
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import run_sync
from services.scraper.src.url_utils import get_identifier_from_filename

if TYPE_CHECKING:
    from google.cloud.storage import Bucket

logger = get_logger(__name__)


async def get_scraper_bucket() -> Bucket:
    """Get the scraper-specific GCS bucket."""
    bucket_name = get_env("SCRAPER_GCS_BUCKET_NAME", fallback="grantflow-scraper")
    storage_client = await run_sync(get_storage_client)
    bucket = storage_client.bucket(bucket_name)

    try:
        if not await run_sync(bucket.exists):
            await run_sync(bucket.create)
            logger.info("Created scraper GCS bucket", bucket_name=bucket_name)
    except Exception:
        logger.debug("Bucket creation skipped (likely already exists)", bucket_name=bucket_name)

    return bucket


async def upload_blob(blob_path: str, content: bytes) -> None:
    """Upload blob to scraper bucket."""
    start_time = time.time()
    bucket = await get_scraper_bucket()
    blob = bucket.blob(blob_path)

    await run_sync(lambda: blob.upload_from_string(content))

    duration = time.time() - start_time
    logger.info(
        "Uploaded blob to scraper bucket",
        blob_path=blob_path,
        size_bytes=len(content),
        duration_ms=round(duration * 1000, 2),
    )


async def get_existing_file_identifiers() -> set[str]:
    """Get existing file identifiers from GCS storage."""
    bucket = await get_scraper_bucket()
    prefix = "scraper-results/"

    try:
        blobs = await run_sync(lambda: list(bucket.list_blobs(prefix=prefix)))

        filenames = []
        for blob in blobs:
            if blob.name.startswith(prefix):
                filename = blob.name[len(prefix) :]
                if filename:
                    filenames.append(filename)

        identifiers = {get_identifier_from_filename(filename) for filename in filenames}
        logger.info(
            "Retrieved existing file identifiers from GCS",
            file_count=len(filenames),
            identifier_count=len(identifiers),
        )
        return identifiers

    except Exception:
        logger.error("Failed to list existing files in GCS", prefix=prefix)
        return set()
