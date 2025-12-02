from typing import TYPE_CHECKING, Any, cast
from uuid import UUID

from sqlalchemy import exists, insert, select, update
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload, with_polymorphic

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GenerationNotification,
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    PredefinedGrantTemplate,
    RagFile,
    RagSource,
    RagUrl,
    TextVector,
)
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.exceptions import ValidationError

if TYPE_CHECKING:
    from structlog.typing import FilteringBoundLogger

    from packages.db.src.json_objects import ScientificAnalysisResult
    from packages.shared_utils.src.extraction import DocumentMetadata
else:
    DocumentMetadata = dict


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
                        .where(
                            RagFile.indexing_status == SourceIndexingStatusEnum.INDEXING, RagFile.deleted_at.is_(None)
                        )
                    )
                )
            ),
        )


async def retrieve_application(*, application_id: UUID | str, session: AsyncSession) -> GrantApplication:
    poly_rag_source = with_polymorphic(RagSource, [RagFile, RagUrl])

    try:
        result = await session.execute(
            select(GrantApplication)
            .options(
                selectinload(GrantApplication.grant_template).selectinload(GrantTemplate.granting_institution),
                selectinload(GrantApplication.grant_template)
                .selectinload(GrantTemplate.predefined_template)
                .selectinload(PredefinedGrantTemplate.granting_institution),
                selectinload(GrantApplication.grant_template)
                .selectinload(GrantTemplate.rag_sources)
                .selectinload(GrantTemplateSource.rag_source.of_type(poly_rag_source)),
                selectinload(GrantApplication.rag_sources).selectinload(
                    GrantApplicationSource.rag_source.of_type(poly_rag_source)
                ),
                selectinload(GrantApplication.editor_documents),
            )
            .where(
                GrantApplication.id == application_id,
                GrantApplication.deleted_at.is_(None),
            )
        )
        application = result.scalar_one()

        filtered_sources = [
            source
            for source in application.rag_sources
            if source.deleted_at is None
            and (source.rag_source is None or source.rag_source.deleted_at is None)
            and (source.rag_source is None or source.rag_source.parent_id is None)
        ]
        application.rag_sources = filtered_sources

        if application.grant_template and hasattr(application.grant_template, "rag_sources"):
            filtered_template_sources = [
                source
                for source in application.grant_template.rag_sources
                if source.deleted_at is None
                and (source.rag_source is None or source.rag_source.deleted_at is None)
                and (source.rag_source is None or source.rag_source.parent_id is None)
            ]
            application.grant_template.rag_sources = filtered_template_sources

        return application
    except NoResultFound as e:
        raise ValidationError("Application not found.", context=str(e)) from e


async def update_source_indexing_status(
    *,
    logger: "FilteringBoundLogger",
    session_maker: async_sessionmaker[Any],
    source_id: UUID,
    grant_application_id: UUID,
    identifier: str,
    text_content: str,
    vectors: list[VectorDTO] | None,
    indexing_status: SourceIndexingStatusEnum,
    trace_id: str,
    document_metadata: DocumentMetadata | None = None,
    scientific_analysis_json: "ScientificAnalysisResult | None" = None,
    error_type: str | None = None,
    error_message: str | None = None,
) -> None:
    async with session_maker() as session, session.begin():
        try:
            update_values: dict[str, Any] = {"indexing_status": indexing_status, "text_content": text_content}
            if document_metadata is not None:
                update_values["document_metadata"] = document_metadata
            if scientific_analysis_json is not None:
                update_values["scientific_analysis_json"] = scientific_analysis_json
            if error_type is not None:
                update_values["error_type"] = error_type
            if error_message is not None:
                update_values["error_message"] = error_message

            await session.execute(
                update(RagSource)
                .where(
                    RagSource.id == source_id,
                    RagSource.deleted_at.is_(None),
                )
                .values(update_values)
            )
            if vectors:
                await session.execute(insert(TextVector).values(vectors))

            notification_type = "success" if indexing_status == SourceIndexingStatusEnum.FINISHED else "error"
            message = (
                f"Successfully processed {identifier}"
                if indexing_status == SourceIndexingStatusEnum.FINISHED
                else f"Failed to process {identifier}"
            )

            notification = GenerationNotification(
                grant_application_id=grant_application_id,
                event="source_processing",
                message=message,
                notification_type=notification_type,
                data={
                    "source_id": str(source_id),
                    "indexing_status": indexing_status.value,
                    "identifier": identifier,
                    "trace_id": trace_id,
                },
            )
            session.add(notification)

            logger.debug(
                "Source indexing status updated and notification saved",
                source_id=source_id,
                grant_application_id=grant_application_id,
                indexing_status=indexing_status.value,
                identifier=identifier,
                metadata_fields=len(document_metadata) if document_metadata else 0,
                trace_id=trace_id,
            )
        except SQLAlchemyError as e:
            logger.exception(
                "Database operation error",
                source_id=source_id,
                identifier=identifier,
                error_type="DatabaseError" if "connection" in str(e).lower() else "SQLAlchemyError",
                trace_id=trace_id,
            )

            try:
                async with session_maker() as error_session, error_session.begin():
                    error_notification = GenerationNotification(
                        grant_application_id=grant_application_id,
                        event="source_processing",
                        message=f"Failed to process {identifier}: {e!s}",
                        notification_type="error",
                        data={
                            "source_id": str(source_id),
                            "indexing_status": SourceIndexingStatusEnum.FAILED.value,
                            "identifier": identifier,
                            "trace_id": trace_id,
                            "error": str(e),
                        },
                    )
                    error_session.add(error_notification)
            except Exception as notification_error:
                logger.error(
                    "Failed to save error notification",
                    source_id=source_id,
                    grant_application_id=grant_application_id,
                    error=str(notification_error),
                    trace_id=trace_id,
                )
