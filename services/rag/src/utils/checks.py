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
) -> None:
    async with session_maker() as session:
        try:
            if entity_type == GrantApplication:
                rag_sources = list(
                    await session.scalars(
                        select_active(RagSource)
                        .join(GrantApplicationSource, GrantApplicationSource.rag_source_id == RagSource.id)
                        .join(GrantApplication)
                        .where(GrantApplicationSource.grant_application_id == parent_id)
                    )
                )
            else:
                rag_sources = list(
                    await session.scalars(
                        select_active(RagSource)
                        .join(GrantTemplateSource, GrantTemplateSource.rag_source_id == RagSource.id)
                        .join(GrantTemplate)
                        .where(GrantTemplateSource.grant_template_id == parent_id)
                    )
                )
        except SQLAlchemyError as e:
            raise DatabaseError("Error verifying rag sources indexed", context=str(e)) from e
        else:
            if any(
                source.indexing_status in (SourceIndexingStatusEnum.INDEXING, SourceIndexingStatusEnum.CREATED)
                for source in rag_sources
            ):
                await sleep(10)
                return await verify_rag_sources_indexed(
                    parent_id=parent_id,
                    session_maker=session_maker,
                    entity_type=entity_type,
                    trace_id=trace_id,
                    total_sleep_duration=total_sleep_duration + 10,
                )

            if not any(source.indexing_status == SourceIndexingStatusEnum.FINISHED for source in rag_sources):
                failed_sources = [
                    source for source in rag_sources if source.indexing_status == SourceIndexingStatusEnum.FAILED
                ]
                total_sources = len(list(rag_sources))

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
                    "All rag sources have failed to be indexed",
                    context={
                        f"{entity_name}_id": str(parent_id),
                        "failed_sources": len(failed_sources),
                        "total_sources": total_sources,
                        "error_type": "indexing_failure",
                    },
                )
