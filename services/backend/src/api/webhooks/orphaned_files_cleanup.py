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
    try:
        files_checked = 0
        orphaned_records_deleted = 0
        errors = 0

        async with session_maker() as session:
            stmt = select(RagFile).where(RagFile.deleted_at.is_(None))
            rag_files = await session.scalars(stmt)

            orphaned_file_ids = []

            bucket = get_bucket()

            for rag_file in rag_files:
                files_checked += 1
                try:
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
