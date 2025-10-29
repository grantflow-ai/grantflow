"""
Webhook for cleaning up orphaned RAG file records where the GCS file no longer exists.

This can be triggered by Cloud Scheduler to run periodically and clean up inconsistencies
between the database and GCS storage.
"""

from typing import Any, Literal, TypedDict

from litestar import post
from litestar.response import Response
from litestar.status_codes import HTTP_201_CREATED, HTTP_500_INTERNAL_SERVER_ERROR
from packages.db.src.tables import RagFile
from packages.shared_utils.src.gcs import get_bucket
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class OrphanedFilesCleanupResponse(TypedDict):
    status: Literal["success", "error"]
    files_checked: int
    orphaned_records_deleted: int
    errors: int


@post(
    "/webhooks/scheduler/orphaned-files-cleanup",
    operation_id="OrphanedFilesCleanupWebhook",
    tags=["Webhooks"],
    status_code=HTTP_201_CREATED,
)
async def handle_orphaned_files_cleanup_webhook(
    session_maker: async_sessionmaker[Any],
) -> OrphanedFilesCleanupResponse | Response[OrphanedFilesCleanupResponse]:
    """
    Clean up orphaned RAG file records where the GCS file no longer exists.

    This webhook should be called periodically (e.g., daily) by Cloud Scheduler.
    It checks all rag_files records and deletes those where the corresponding GCS blob doesn't exist.
    """
    try:
        files_checked = 0
        orphaned_records_deleted = 0
        errors = 0

        async with session_maker() as session:
            # Get all non-deleted rag_files
            stmt = select(RagFile).where(RagFile.deleted_at.is_(None))
            rag_files = await session.scalars(stmt)

            orphaned_file_ids = []

            bucket = get_bucket()

            for rag_file in rag_files:
                files_checked += 1
                try:
                    # Check if the GCS file exists by trying to get its metadata
                    blob = bucket.blob(rag_file.object_path)
                    exists = blob.exists()

                    if not exists:
                        logger.info(
                            "Found orphaned rag_file record",
                            file_id=str(rag_file.id),
                            object_path=rag_file.object_path,
                            filename=rag_file.filename,
                        )
                        orphaned_file_ids.append(rag_file.id)

                except Exception as e:
                    errors += 1
                    logger.error(
                        "Error checking GCS blob existence",
                        file_id=str(rag_file.id),
                        object_path=rag_file.object_path,
                        error=str(e),
                    )

            # Soft delete orphaned records
            if orphaned_file_ids:
                for file_id in orphaned_file_ids:
                    rag_file = await session.get(RagFile, file_id)
                    if rag_file:
                        rag_file.soft_delete()
                        orphaned_records_deleted += 1

                await session.commit()

                logger.info(
                    "Orphaned files cleanup completed",
                    files_checked=files_checked,
                    orphaned_records_deleted=orphaned_records_deleted,
                    errors=errors,
                )

        return OrphanedFilesCleanupResponse(
            status="success",
            files_checked=files_checked,
            orphaned_records_deleted=orphaned_records_deleted,
            errors=errors,
        )

    except Exception as e:
        logger.exception("Orphaned files cleanup webhook failed", error=str(e))

        return Response(
            content=OrphanedFilesCleanupResponse(
                status="error",
                files_checked=0,
                orphaned_records_deleted=0,
                errors=1,
            ),
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )
