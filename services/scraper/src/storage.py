from __future__ import annotations

import time
from typing import TYPE_CHECKING, Final, Protocol

from anyio import Path as AsyncPath
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.gcs import get_storage_client, upload_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import run_sync
from services.scraper.src.url_utils import get_identifier_from_filename

if TYPE_CHECKING:
    from google.cloud.storage import Bucket

logger = get_logger(__name__)


class Storage(Protocol):
    """A protocol to represent a storage object.

    We implement a filesystem storage object locally, and in production use cloud storage.

    The logic of saving into a directory and deciding on the naming conventions etc. should be abstracted into
    this protocol.
    """

    async def save_file(self, file_name: str, content: bytes | str) -> None:
        """Save file to storage.

        Args:
            file_name: The name of the file to save.
            content: The data to save.

        Returns:
            None
        """

    async def get_existing_file_identifiers(self) -> set[str]:
        """Get a list file identifiers from storage, extracting the id component out of
            `grant_search_result-<identifier>.<extension>`.

        Returns:
            A set of filenames without extension.
        """


class SimpleFileStorage(Storage):
    """A simple file storage implementation."""

    _results_folder: Final[AsyncPath] = AsyncPath("./.results")

    async def save_file(self, file_name: str, content: bytes | str) -> None:
        """Save file to storage.

        Args:
            file_name: The name of the file to save.
            content: The data to save.

        Returns:
            None
        """
        await self._results_folder.mkdir(exist_ok=True)

        target = AsyncPath(self._results_folder / file_name)

        if isinstance(content, str):
            await target.write_text(content)
        else:
            await target.write_bytes(content)

    async def get_existing_file_identifiers(self) -> set[str]:
        """Get a list file identifiers from storage, extracting the id component out of
            `grant_search_result-<identifier>.<extension>`.

        Returns:
            A set of filenames without extension.
        """
        if not await self._results_folder.exists():
            return set()

        filenames = [
            async_path.name async for async_path in self._results_folder.iterdir() if await async_path.is_file()
        ]
        return {get_identifier_from_filename(filename) for filename in filenames}


class GCSStorage(Storage):
    """GCS-based storage implementation for the scraper service."""

    def __init__(self) -> None:
        self._bucket_name = get_env("SCRAPER_GCS_BUCKET_NAME", fallback="grantflow-scraper")

    async def _get_scraper_bucket(self) -> Bucket:
        """Get the scraper-specific GCS bucket."""
        storage_client = await run_sync(get_storage_client)
        bucket = storage_client.bucket(self._bucket_name)

        try:
            if not await run_sync(bucket.exists):
                await run_sync(bucket.create)
                logger.info("Created scraper GCS bucket", bucket_name=self._bucket_name)
        except Exception:  # noqa: BLE001
            logger.debug("Bucket creation skipped (likely already exists)", bucket_name=self._bucket_name)

        return bucket

    async def save_file(self, file_name: str, content: bytes | str) -> None:
        """Save file to GCS storage.

        Args:
            file_name: The name of the file to save.
            content: The data to save.

        Returns:
            None
        """
        start_time = time.time()

        content_bytes = content.encode("utf-8") if isinstance(content, str) else content

        blob_path = f"scraper-results/{file_name}"

        logger.debug(
            "Uploading file to GCS",
            file_name=file_name,
            blob_path=blob_path,
            content_size=len(content_bytes),
            bucket_name=self._bucket_name,
        )

        await upload_blob(blob_path, content_bytes)

        duration = time.time() - start_time
        logger.info(
            "File uploaded to GCS successfully",
            file_name=file_name,
            blob_path=blob_path,
            content_size=len(content_bytes),
            bucket_name=self._bucket_name,
            upload_duration_ms=round(duration * 1000, 2),
        )

    async def get_existing_file_identifiers(self) -> set[str]:
        """Get existing file identifiers from GCS storage.

        Returns:
            A set of filenames without extension.
        """
        start_time = time.time()

        bucket = await self._get_scraper_bucket()
        prefix = "scraper-results/"

        logger.debug(
            "Listing existing files in GCS",
            bucket_name=self._bucket_name,
            prefix=prefix,
        )

        try:
            blobs = await run_sync(lambda: list(bucket.list_blobs(prefix=prefix)))

            filenames = []
            for blob in blobs:
                if blob.name.startswith(prefix):

                    filename = blob.name[len(prefix) :]
                    if filename:
                        filenames.append(filename)

            identifiers = {get_identifier_from_filename(filename) for filename in filenames}

            duration = time.time() - start_time
            logger.info(
                "Retrieved existing file identifiers from GCS",
                bucket_name=self._bucket_name,
                file_count=len(filenames),
                identifier_count=len(identifiers),
                duration_ms=round(duration * 1000, 2),
            )

            return identifiers

        except Exception:  # noqa: BLE001
            logger.error(
                "Failed to list existing files in GCS",
                bucket_name=self._bucket_name,
                prefix=prefix,
            )
            return set()
