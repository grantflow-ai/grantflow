from datetime import datetime
from typing import Any, cast
from uuid import UUID

from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.json_objects import GrantElement, GrantLongFormSection
from packages.db.src.tables import FundingOrganization, GrantTemplate, GrantTemplateRagSource, RagSource
from packages.shared_utils.src.exceptions import BackendError, DatabaseError, InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.constants import GRANT_TEMPLATE_PIPELINE_STAGES, NotificationEvents
from services.rag.src.grant_template.determine_application_sections import handle_extract_sections
from services.rag.src.grant_template.determine_longform_metadata import handle_generate_grant_template
from services.rag.src.grant_template.extract_cfp_data import Content, handle_extract_cfp_data_from_rag_sources
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.job_manager import JobManager
from services.rag.src.utils.text import concat_extracted_cfp_content

logger = get_logger(__name__)


async def extract_and_enrich_sections(
    cfp_content: list[Content],
    cfp_subject: str,
    organization: FundingOrganization | None,
    parent_id: UUID,
    job_manager: JobManager,
) -> list[GrantElement | GrantLongFormSection]:
    await job_manager.add_notification(
        parent_id=parent_id,
        event=NotificationEvents.GRANT_TEMPLATE_EXTRACTION,
        message="Extracting grant application sections from CFP content...",
        notification_type="info",
        current_pipeline_stage=4,
        total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
    )
    sections = await handle_extract_sections(
        cfp_content=cfp_content,
        cfp_subject=cfp_subject,
        organization=organization,
    )

    await job_manager.add_notification(
        parent_id=parent_id,
        event=NotificationEvents.SECTIONS_EXTRACTED,
        message="Sections extracted successfully",
        notification_type="info",
        data={
            "section_count": len(sections),
            "organization": organization.full_name if organization else None,
        },
        current_pipeline_stage=4,
        total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
    )

    content_list = [f"{content['title']}: {'...'.join(content['subtitles'])}" for content in cfp_content]

    await job_manager.add_notification(
        parent_id=parent_id,
        event=NotificationEvents.GRANT_TEMPLATE_METADATA,
        message="Generating metadata for grant template sections...",
        notification_type="info",
        current_pipeline_stage=5,
        total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
    )

    section_metadata = await handle_generate_grant_template(
        cfp_content=concat_extracted_cfp_content(content_list),
        cfp_subject=cfp_subject,
        organization=organization,
        long_form_sections=[s for s in sections if not s.get("is_title_only")],
    )

    await job_manager.add_notification(
        parent_id=parent_id,
        event=NotificationEvents.METADATA_GENERATED,
        message="Metadata generated successfully",
        notification_type="info",
        data={
            "metadata_count": len(section_metadata),
        },
        current_pipeline_stage=5,
        total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
    )

    mapped_metadata = {metadata["id"]: metadata for metadata in section_metadata}

    ret: list[GrantElement | GrantLongFormSection] = []
    for section in sections:
        if section.get("is_title_only"):
            ret.append(
                GrantElement(
                    id=section["id"],
                    order=section["order"],
                    parent_id=section.get("parent_id"),
                    title=section["title"],
                )
            )
        else:
            metadata = mapped_metadata[section["id"]]
            ret.append(
                GrantLongFormSection(
                    depends_on=metadata["depends_on"],
                    generation_instructions=metadata["generation_instructions"],
                    id=section["id"],
                    is_clinical_trial=section.get("is_clinical_trial", False),
                    is_detailed_research_plan=section.get("is_detailed_research_plan", False),
                    keywords=metadata["keywords"],
                    max_words=metadata["max_words"],
                    order=section["order"],
                    parent_id=section.get("parent_id"),
                    search_queries=metadata["search_queries"],
                    title=section["title"],
                    topics=metadata["topics"],
                )
            )

    return ret


async def grant_template_generation_pipeline_handler(
    grant_template_id: UUID,
    session_maker: async_sessionmaker[Any],
    job_manager: JobManager | None = None,
) -> GrantTemplate:
    logger.info("Starting grant template generation pipeline", template_id=grant_template_id)

    if job_manager is None:
        job_manager = JobManager(session_maker)
        await job_manager.create_grant_template_job(
            grant_template_id=grant_template_id,
            total_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
        )

        await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)

    await job_manager.add_notification(
        parent_id=grant_template_id,
        event=NotificationEvents.GRANT_TEMPLATE_GENERATION_STARTED,
        message="Starting grant template generation pipeline...",
        notification_type="info",
        current_pipeline_stage=1,
        total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
    )

    try:
        await verify_rag_sources_indexed(grant_template_id, session_maker, GrantTemplate)

        async with session_maker() as session:
            source_ids = [
                str(source_id)
                for source_id in await session.scalars(
                    select(RagSource.id)
                    .join(GrantTemplateRagSource, RagSource.id == GrantTemplateRagSource.rag_source_id)
                    .where(GrantTemplateRagSource.grant_template_id == grant_template_id)
                    .where(RagSource.indexing_status == SourceIndexingStatusEnum.FINISHED)
                )
            ]
            funding_organizations = list(
                await session.scalars(select(FundingOrganization).order_by(FundingOrganization.full_name.asc()))
            )

        organization_mapping = {
            str(org.id): {"full_name": org.full_name, "abbreviation": org.abbreviation} for org in funding_organizations
        }

        await job_manager.add_notification(
            parent_id=grant_template_id,
            event=NotificationEvents.EXTRACTING_CFP_DATA,
            message="Extracting data from CFP content...",
            notification_type="info",
            current_pipeline_stage=2,
            total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
        )
        extraction_result = await handle_extract_cfp_data_from_rag_sources(
            source_ids=source_ids,
            organization_mapping=organization_mapping,
            session_maker=session_maker,
        )

        organization = (
            next(org for org in funding_organizations if str(org.id) == extraction_result["organization_id"])
            if extraction_result["organization_id"]
            else None
        )

        org_name = organization.full_name if organization else "Unknown"

        submission_date = (
            datetime.strptime(extraction_result["submission_date"], "%Y-%m-%d").date()  # noqa: DTZ007
            if extraction_result["submission_date"]
            else None
        )

        await job_manager.add_notification(
            parent_id=grant_template_id,
            event=NotificationEvents.CFP_DATA_EXTRACTED,
            message="CFP data extracted successfully",
            notification_type="info",
            data={
                "organization": org_name,
                "cfp_subject": extraction_result["cfp_subject"],
                "content_sections": len(extraction_result["content"]),
                "submission_date": str(submission_date) if submission_date else None,
            },
            current_pipeline_stage=3,
            total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
        )

        logger.info("Extracted CFP data")

        grant_sections = await extract_and_enrich_sections(
            cfp_content=extraction_result["content"],
            cfp_subject=extraction_result["cfp_subject"],
            organization=organization,
            parent_id=grant_template_id,
            job_manager=job_manager,
        )

        logger.info("Extracted grant template sections")

        await job_manager.add_notification(
            parent_id=grant_template_id,
            event=NotificationEvents.SAVING_GRANT_TEMPLATE,
            message="Saving grant template to database...",
            notification_type="info",
            current_pipeline_stage=6,
            total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
        )

    except BackendError as e:
        logger.error("Backend error in grant template generation pipeline", error=e)

        if isinstance(e, InsufficientContextError):
            error_message = "The uploaded document doesn't contain sufficient information about the required application sections. Please upload a complete Call for Proposals (CFP) document that includes details about application requirements and sections."
            event_type = NotificationEvents.INSUFFICIENT_CONTEXT_ERROR
        elif isinstance(e, ValidationError) and "indexing timeout" in str(e):
            error_message = "Document indexing is taking longer than expected. Please wait a few minutes and try again."
            event_type = NotificationEvents.INDEXING_TIMEOUT
        elif isinstance(e, ValidationError) and "indexing failed" in str(e).lower():
            error_message = "Document indexing failed. Please upload new documents and try again."
            event_type = NotificationEvents.INDEXING_FAILED
        else:
            error_message = "An unexpected error occurred while processing your grant template. Please try again or contact support if this persists."
            event_type = NotificationEvents.PIPELINE_ERROR
            logger.error("Unexpected error in grant template pipeline", error=e, context=getattr(e, "context", None))

        await job_manager.update_job_status(
            status=RagGenerationStatusEnum.FAILED,
            error_message=error_message,
            error_details={"error_type": e.__class__.__name__, "recoverable": event_type != "pipeline_error"},
        )
        await job_manager.add_notification(
            parent_id=grant_template_id,
            event=event_type,
            message=error_message,
            notification_type="error",
            data={"error_type": e.__class__.__name__, "recoverable": event_type != "pipeline_error"},
        )
        raise

    async with session_maker() as session, session.begin():
        try:
            grant_template = await session.scalar(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template_id)
                .values(
                    {
                        "funding_organization_id": UUID(extraction_result["organization_id"])
                        if extraction_result["organization_id"]
                        else None,
                        "submission_date": submission_date,
                        "grant_sections": grant_sections,
                    }
                )
                .returning(GrantTemplate)
            )
            await session.commit()

            await job_manager.update_job_status(RagGenerationStatusEnum.COMPLETED)
            await job_manager.add_notification(
                parent_id=grant_template_id,
                event=NotificationEvents.GRANT_TEMPLATE_CREATED,
                message="Grant template created successfully",
                notification_type="success",
                data={
                    "template_id": str(grant_template.id),
                    "section_count": len(grant_sections),
                    "organization": org_name,
                },
                current_pipeline_stage=GRANT_TEMPLATE_PIPELINE_STAGES,
                total_pipeline_stages=GRANT_TEMPLATE_PIPELINE_STAGES,
            )

            return cast("GrantTemplate", grant_template)
        except SQLAlchemyError as e:
            logger.error("Database error generating grant template", error=e)
            await session.rollback()

            await job_manager.update_job_status(
                status=RagGenerationStatusEnum.FAILED,
                error_message="An internal error occurred. Please try again or contact support.",
                error_details={"error_type": "database_error"},
            )
            await job_manager.add_notification(
                parent_id=grant_template_id,
                event=NotificationEvents.INTERNAL_ERROR,
                message="An internal error occurred. Please try again or contact support.",
                notification_type="error",
                data={"error_type": "database_error"},
            )
            raise DatabaseError("Error generating grant template", context=str(e)) from e
