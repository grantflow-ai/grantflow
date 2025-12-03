from asyncio import sleep
from typing import Any
from uuid import UUID

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantTemplate,
    GrantTemplateSource,
    RagSource,
)
from packages.shared_utils.src.exceptions import DatabaseError, ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


async def verify_rag_sources_indexed(
    parent_id: UUID,
    session_maker: async_sessionmaker[Any],
    entity_type: type[GrantApplication | GrantTemplate],
    trace_id: str,
    total_sleep_duration: int = 0,
    max_wait_seconds: int = 600,
) -> None:
    if total_sleep_duration >= max_wait_seconds:
        logger.error(
            "Timeout waiting for sources to be indexed",
            parent_id=str(parent_id),
            entity_type=entity_type.__name__,
            total_wait_seconds=total_sleep_duration,
            trace_id=trace_id,
        )
        raise ValidationError(
            f"Indexing Timeout waiting for sources to be indexed after {total_sleep_duration} seconds",
            context={
                "parent_id": str(parent_id),
                "entity_type": entity_type.__name__,
                "max_wait_seconds": max_wait_seconds,
            },
        )

    async with session_maker() as session:
        try:
            if entity_type == GrantApplication:
                rag_sources = list(
                    await session.scalars(
                        select_active(RagSource)
                        .join(GrantApplicationSource)
                        .join(GrantApplication)
                        .where(GrantApplicationSource.grant_application_id == parent_id)
                    )
                )
            else:
                rag_sources = list(
                    await session.scalars(
                        select_active(RagSource)
                        .join(GrantTemplateSource)
                        .join(GrantTemplate)
                        .where(GrantTemplateSource.grant_template_id == parent_id)
                    )
                )
        except SQLAlchemyError as e:
            logger.error(
                "Database error while checking indexing status",
                parent_id=str(parent_id),
                entity_type=entity_type.__name__,
                error=str(e),
                trace_id=trace_id,
            )
            raise DatabaseError("Error verifying rag sources indexed", context=str(e)) from e

    all_sources = list(rag_sources)

    if all_sources:
        failed_sources = [source for source in all_sources if source.indexing_status == SourceIndexingStatusEnum.FAILED]

        non_pending_sources = [
            source for source in all_sources if source.indexing_status != SourceIndexingStatusEnum.PENDING_UPLOAD
        ]

        if non_pending_sources and len(failed_sources) == len(non_pending_sources):
            failed_details = []
            for source in failed_sources:
                detail = {
                    "id": str(source.id),
                    "error": source.error_message or "Unknown error",
                    "source_type": source.source_type,
                }
                failed_details.append(detail)

            logger.error(
                "All sources have failed, aborting indexing wait",
                parent_id=str(parent_id),
                entity_type=entity_type.__name__,
                failed_count=len(failed_sources),
                total_count=len(non_pending_sources),
                failed_sources_details=failed_details,
                trace_id=trace_id,
            )

            entity_name = "grant_application" if entity_type == GrantApplication else "grant_template"

            primary_error = failed_sources[0].error_message or "Indexer service unavailable"

            raise ValidationError(
                f"Source indexing failed: {primary_error}",
                context={
                    f"{entity_name}_id": str(parent_id),
                    "failed_sources_count": len(failed_sources),
                    "total_sources": len(non_pending_sources),
                    "error_type": "indexing_failure",
                    "failed_sources": failed_details,
                },
            )

    active_sources = [
        source for source in rag_sources if source.indexing_status != SourceIndexingStatusEnum.PENDING_UPLOAD
    ]

    if not active_sources and rag_sources:
        logger.warning(
            "No uploaded sources found",
            parent_id=str(parent_id),
            entity_type=entity_type.__name__,
            pending_upload_count=len(rag_sources),
            trace_id=trace_id,
        )
        raise ValidationError(
            "No sources have been uploaded yet. Please complete file uploads before generating.",
            context={
                "pending_upload_count": len(rag_sources),
                "parent_id": str(parent_id),
            },
        )

    sources_still_indexing = [
        source
        for source in active_sources
        if source.indexing_status in (SourceIndexingStatusEnum.INDEXING, SourceIndexingStatusEnum.CREATED)
    ]

    if sources_still_indexing:
        logger.debug(
            "Sources still indexing, waiting",
            parent_id=str(parent_id),
            entity_type=entity_type.__name__,
            sources_indexing=len(sources_still_indexing),
            total_sources=len(active_sources),
            wait_duration=total_sleep_duration,
            trace_id=trace_id,
        )
        await sleep(10)
        return await verify_rag_sources_indexed(
            parent_id=parent_id,
            session_maker=session_maker,
            entity_type=entity_type,
            trace_id=trace_id,
            total_sleep_duration=total_sleep_duration + 10,
            max_wait_seconds=max_wait_seconds,
        )

    if not any(source.indexing_status == SourceIndexingStatusEnum.FINISHED for source in active_sources):
        failed_sources = [
            source for source in active_sources if source.indexing_status == SourceIndexingStatusEnum.FAILED
        ]
        total_sources = len(active_sources)

        logger.warning(
            "Document indexing failed",
            parent_id=str(parent_id),
            entity_type=entity_type.__name__,
            failed_count=len(failed_sources),
            total_count=total_sources,
            trace_id=trace_id,
        )

        entity_name = "grant_application" if entity_type == GrantApplication else "grant_template"
        raise ValidationError(
            "Indexing failed as all rag sources have failed to be indexed",
            context={
                f"{entity_name}_id": str(parent_id),
                "failed_sources": len(failed_sources),
                "total_sources": total_sources,
                "error_type": "indexing_failure",
            },
        )

    finished_sources = [
        source for source in active_sources if source.indexing_status == SourceIndexingStatusEnum.FINISHED
    ]
    logger.info(
        "Sources indexed successfully",
        parent_id=str(parent_id),
        entity_type=entity_type.__name__,
        finished_count=len(finished_sources),
        total_count=len(active_sources),
        total_wait_seconds=total_sleep_duration,
        trace_id=trace_id,
    )
    return None
