from typing import TYPE_CHECKING, Any, cast
from uuid import UUID

from sqlalchemy import exists, insert, select, update
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload, with_polymorphic

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    RagFile,
    RagSource,
    RagUrl,
    TextVector,
)
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.pubsub import SourceProcessingResult, publish_notification

if TYPE_CHECKING:
    from structlog.typing import FilteringBoundLogger


async def check_exists_files_being_indexed(
    *,
    application_id: UUID | str | None = None,
    organization_id: UUID | str | None = None,
    session_maker: async_sessionmaker[Any],
) -> bool:
    if not application_id and not organization_id:
        raise ValidationError("Either application_id or organization_id must be provided.")

    file_table_cls = GrantApplicationSource if application_id else GrantingInstitutionSource

    async with session_maker() as session:
        return cast(
            "bool",
            await session.scalar(
                select(
                    exists(
                        select(file_table_cls)
                        .join(RagFile, RagFile.id == file_table_cls.rag_source_id)
                        .where(
                            file_table_cls.grant_application_id == application_id
                            if hasattr(file_table_cls, "grant_application_id")
                            else file_table_cls.granting_institution_id == organization_id
                        )
                        .where(RagFile.indexing_status == SourceIndexingStatusEnum.INDEXING)
                    )
                )
            ),
        )


async def retrieve_application(*, application_id: UUID | str, session: AsyncSession) -> GrantApplication:
    poly_rag_source = with_polymorphic(RagSource, [RagFile, RagUrl])

    try:
        # First get the application with basic relationships
        result = await session.execute(
            select(GrantApplication)
            .options(selectinload(GrantApplication.grant_template).selectinload(GrantTemplate.granting_institution))
            .where(
                GrantApplication.id == application_id,
                GrantApplication.deleted_at.is_(None),
            )
        )
        application = result.scalar_one()

        # Load non-deleted application sources
        app_sources_result = await session.execute(
            select(GrantApplicationSource)
            .options(selectinload(GrantApplicationSource.rag_source.of_type(poly_rag_source)))
            .where(
                GrantApplicationSource.grant_application_id == application.id,
                GrantApplicationSource.deleted_at.is_(None),
            )
            .join(RagSource, RagSource.id == GrantApplicationSource.rag_source_id)
            .where(RagSource.deleted_at.is_(None))
        )
        application.rag_sources = list(app_sources_result.scalars().all())

        # Load non-deleted template sources if template exists
        if application.grant_template:
            template_sources_result = await session.execute(
                select(GrantTemplateSource)
                .options(selectinload(GrantTemplateSource.rag_source.of_type(poly_rag_source)))
                .where(
                    GrantTemplateSource.grant_template_id == application.grant_template.id,
                    GrantTemplateSource.deleted_at.is_(None),
                )
                .join(RagSource, RagSource.id == GrantTemplateSource.rag_source_id)
                .where(RagSource.deleted_at.is_(None))
            )
            application.grant_template.rag_sources = list(template_sources_result.scalars().all())

        return application
    except NoResultFound as e:
        raise ValidationError("Application not found.", context=str(e)) from e


async def update_source_indexing_status(
    *,
    logger: "FilteringBoundLogger",
    session_maker: async_sessionmaker[Any],
    source_id: UUID,
    parent_id: UUID,
    identifier: str,
    text_content: str,
    vectors: list[VectorDTO] | None,
    indexing_status: SourceIndexingStatusEnum,
) -> None:
    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(RagSource)
                .where(
                    RagSource.id == source_id,
                    RagSource.deleted_at.is_(None),
                )
                .values({"indexing_status": indexing_status, "text_content": text_content})
            )
            if vectors:
                await session.execute(insert(TextVector).values(vectors))
            await session.commit()

            await publish_notification(
                logger=logger,
                parent_id=parent_id,
                event="source_processing",
                data=SourceProcessingResult(
                    source_id=source_id,
                    indexing_status=indexing_status,
                    identifier=identifier,
                ),
            )
        except SQLAlchemyError as e:
            logger.exception(
                "Database operation error",
                source_id=source_id,
                identifier=identifier,
                error_type="DatabaseError" if "connection" in str(e).lower() else "SQLAlchemyError",
            )
            await session.rollback()
            await publish_notification(
                logger=logger,
                parent_id=parent_id,
                event="source_processing",
                data=SourceProcessingResult(
                    source_id=source_id,
                    indexing_status=SourceIndexingStatusEnum.FAILED,
                    identifier=identifier,
                ),
            )
