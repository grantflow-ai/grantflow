from asyncio import sleep
from typing import Any
from uuid import UUID

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateRagSource,
    RagSource,
)
from packages.shared_utils.src.exceptions import DatabaseError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import RagProcessingStatus, publish_notification
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.constants import NotificationEvents

logger = get_logger(__name__)


async def verify_rag_sources_indexed(
    parent_id: UUID,
    session_maker: async_sessionmaker[Any],
    entity_type: type[GrantApplication | GrantTemplate],
    total_sleep_duration: int = 0,
) -> None:
    async with session_maker() as session:
        try:
            if entity_type == GrantApplication:
                rag_sources = list(
                    await session.scalars(
                        select(RagSource)
                        .join(GrantApplicationRagSource)
                        .join(GrantApplication)
                        .where(GrantApplicationRagSource.grant_application_id == parent_id)
                    )
                )
            else:
                rag_sources = list(
                    await session.scalars(
                        select(RagSource)
                        .join(GrantTemplateRagSource)
                        .join(GrantTemplate)
                        .where(GrantTemplateRagSource.grant_template_id == parent_id)
                    )
                )

            if any(
                source.indexing_status in (SourceIndexingStatusEnum.INDEXING, SourceIndexingStatusEnum.CREATED)
                for source in rag_sources
            ):
                await publish_notification(
                    logger=logger,
                    parent_id=parent_id,
                    event=NotificationEvents.INDEXING_IN_PROGRESS,
                    data=RagProcessingStatus(
                        event=NotificationEvents.INDEXING_IN_PROGRESS,
                        message="Document indexing in progress. This may take a few minutes for large documents.",
                        data={"wait_time": total_sleep_duration, "max_wait": 30},
                    ),
                )
                await sleep(10)
                return await verify_rag_sources_indexed(
                    parent_id, session_maker, entity_type, total_sleep_duration + 10
                )

            if not any(source.indexing_status == SourceIndexingStatusEnum.FINISHED for source in rag_sources):
                failed_sources = [
                    source for source in rag_sources if source.indexing_status == SourceIndexingStatusEnum.FAILED
                ]
                total_sources = len(list(rag_sources))

                await publish_notification(
                    logger=logger,
                    parent_id=parent_id,
                    event=NotificationEvents.INDEXING_FAILED,
                    data=RagProcessingStatus(
                        event=NotificationEvents.INDEXING_FAILED,
                        message="Document indexing failed. Please upload new documents and try again.",
                        data={
                            "failed_count": len(failed_sources),
                            "total_count": total_sources,
                            "recoverable": True,
                        },
                    ),
                )

                entity_name = "grant_application" if entity_type == GrantApplication else "grant_template"
                raise ValidationError(
                    "All rag sources have failed to be indexed",
                    context={
                        f"{entity_name}_id": str(parent_id),
                        "failed_sources": len(failed_sources),
                        "total_sources": total_sources,
                        "error_type": "indexing_failure",
                    },
                )

        except SQLAlchemyError as e:
            raise DatabaseError("Error verifying rag sources indexed", context=str(e)) from e
