from datetime import UTC, datetime
from typing import Any, Final, TypedDict, cast
from uuid import UUID

from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.json_objects import GrantElement, GrantLongFormSection
from packages.db.src.tables import GrantingInstitution, GrantTemplate, GrantTemplateSource, RagSource
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.constants import TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES
from services.rag.src.grant_template.cfp_section_analysis import (
    CFPAnalysisResult,
    handle_analyze_cfp,
)
from services.rag.src.grant_template.determine_application_sections import handle_extract_sections
from services.rag.src.grant_template.determine_longform_metadata import handle_generate_grant_template
from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.job_manager import GrantTemplateJobManager
from services.rag.src.utils.text import concat_extracted_cfp_content
from src.json_objects import CFPContentSection as Content
from src.json_objects import ExtractedCFPData

logger = get_logger(__name__)

GRANT_TEMPLATE_STAGES_ORDER: Final[tuple[GrantTemplateStageEnum, ...]] = (
    GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
    GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
    GrantTemplateStageEnum.ENRICH_SECTION_METADATA,
    GrantTemplateStageEnum.FINALIZE_TEMPLATE,
)

TOTAL_PIPELINE_STAGES: Final[int] = len(GRANT_TEMPLATE_STAGES_ORDER)


class OrganizationNamespace(TypedDict):
    full_name: str
    abbreviation: str
    organization_id: UUID


class ExtractCFPContentStageDTO(TypedDict):
    organization: OrganizationNamespace | None
    extracted_data: ExtractedCFPData


class AnalyzeCFPContentStageDTO(ExtractCFPContentStageDTO):
    analysis_results: CFPAnalysisResult


def _get_next_pipeline_stage(
    current_stage: GrantTemplateStageEnum,
) -> GrantTemplateStageEnum | None:
    current_index = GRANT_TEMPLATE_STAGES_ORDER.index(current_stage)
    return GRANT_TEMPLATE_STAGES_ORDER[current_index + 1]

def _get_current_pipeline_stage_num(stage: GrantTemplateStageEnum) -> int:
    return GRANT_TEMPLATE_STAGES_ORDER.index(stage) + 1

async def handle_enrich_section_metadata_stage(
    cfp_content: list[Content],
    cfp_subject: str,
    organization: GrantingInstitution | None,
    job_manager: GrantTemplateJobManager,
) -> list[GrantElement | GrantLongFormSection]:
    await job_manager.add_notification(
        event=NotificationEvents.GRANT_TEMPLATE_EXTRACTION,
        message="Extracting grant application sections from CFP content...",
        current_pipeline_stage=_get_current_pipeline_stage_num(GrantTemplateStageEnum.ENRICH_SECTION_METADATA),
        total_pipeline_stages=
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
        current_pipeline_stage=7,
        total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
    )

    content_list = [f"{content['title']}: {'...'.join(content['subtitles'])}" for content in cfp_content]

    if await job_manager.ensure_not_cancelled():
        await job_manager.handle_cancellation(parent_id)
        return []

    await job_manager.add_notification(
        parent_id=parent_id,
        event=NotificationEvents.GRANT_TEMPLATE_METADATA,
        message="Generating metadata for grant template sections...",
        notification_type="info",
        current_pipeline_stage=7,
        total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
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
        current_pipeline_stage=7,
        total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
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


async def handle_cfp_extraction_stage(
    *,
    grant_template: GrantTemplate,
    job_manager: GrantTemplateJobManager,
    session_maker: async_sessionmaker[Any],
) -> ExtractCFPContentStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.EXTRACTING_CFP_DATA,
        message="Extracting data from CFP content...",
        current_pipeline_stage=2,
        total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
    )
    # this can take a while, thats why we are rechecking cancellation ~keep
    await verify_rag_sources_indexed(grant_template.id, session_maker, GrantTemplate)

    await job_manager.ensure_not_cancelled()

    async with session_maker() as session:
        source_ids = list(
            await session.scalars(
                select(RagSource.id)
                .join(GrantTemplateSource, RagSource.id == GrantTemplateSource.rag_source_id)
                .where(GrantTemplateSource.grant_template_id == grant_template.id)
                .where(RagSource.indexing_status == SourceIndexingStatusEnum.FINISHED)
            )
        )

        funding_organizations = list(
            await session.scalars(select(GrantingInstitution).order_by(GrantingInstitution.full_name.asc()))
        )

    extraction_result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=[str(v) for v in source_ids],
        organization_mapping={
            str(org.id): {"full_name": org.full_name, "abbreviation": org.abbreviation} for org in funding_organizations
        },
        session_maker=session_maker,
    )

    organization = (
        next(
            OrganizationNamespace(
                organization_id=org.id,
                abbreviation=org.abbreviation,
                full_name=org.full_name,
            )
            for org in funding_organizations
            if str(org.id) == extraction_result["organization_id"]
        )
        if extraction_result["organization_id"]
        else None
    )

    org_name = organization["full_name"] if organization else "Unknown"
    submission_date = (
        datetime.strptime(extraction_result["submission_date"], "%Y-%m-%d").date()  # noqa: DTZ007
        if extraction_result["submission_date"]
        else None
    )

    await job_manager.add_notification(
        event=NotificationEvents.CFP_DATA_EXTRACTED,
        message="CFP data extracted successfully",
        data={
            "organization": org_name,
            "cfp_subject": extraction_result["cfp_subject"],
            "content_sections": len(extraction_result["content"]),
            "submission_date": str(submission_date) if submission_date else None,
        },
        current_pipeline_stage=3,
        total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
    )

    logger.info("Extracted CFP data")

    return ExtractCFPContentStageDTO(extracted_data=extraction_result, organization=organization)


async def handle_cfp_analysis_stage(
    *,
    grant_template_id: UUID,
    extracted_cfp: ExtractCFPContentStageDTO,
    job_manager: GrantTemplateJobManager,
) -> AnalyzeCFPContentStageDTO:
    await job_manager.add_notification(
        parent_id=grant_template_id,
        event=NotificationEvents.GRANT_TEMPLATE_EXTRACTION,
        message="Running enhanced CFP analysis with Gemini 2.5 Flash and NLP...",
        current_pipeline_stage=3,
        total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
    )

    content_strings = [
        f"{content['title']}: {' '.join(content['subtitles'])}"
        for content in extracted_cfp["extracted_data"]["content"]
    ]
    cfp_analysis_results = await handle_analyze_cfp(full_cfp_text=concat_extracted_cfp_content(content_strings))

    logger.info(
        "CFP analysis completed",
        **cfp_analysis_results,
    )

    await job_manager.add_notification(
        parent_id=grant_template_id,
        event=NotificationEvents.CFP_DATA_EXTRACTED,
        message="Enhanced CFP analysis completed successfully",
        data=cast("dict", cfp_analysis_results),
        current_pipeline_stage=3,
        total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
    )

    return AnalyzeCFPContentStageDTO(
        **extracted_cfp,
        analysis_results=cfp_analysis_results,
    )


async def grant_template_generation_pipeline_handler(
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
    generation_stage: GrantTemplateStageEnum,
    trace_id: str,
) -> GrantTemplate | None:
    job_manager = GrantTemplateJobManager(
        session_maker=session_maker,
        grant_application_id=grant_template.grant_application_id,
        job_id=grant_template.rag_job_id,
    )

    job = await job_manager.get_or_create_job()
    await job_manager.ensure_not_cancelled()

    logger.info(
        "Starting grant template generation pipeline",
        template_id=grant_template.id,
        rag_job_id=job.id,
        trace_id=trace_id,
        generation_stage=generation_stage,
    )
    if job.status == RagGenerationStatusEnum.PENDING:
        await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)

    try:
        extracted_cfp = await handle_cfp_extraction_stage(
            grant_template=grant_template, job_manager=job_manager, session_maker=session_maker
        )

        cfp_analysis_result = await handle_cfp_analysis_stage(
            job_manager=job_manager,
            extracted_cfp=extracted_cfp,
        )

        grant_sections = await extract_and_enrich_sections(
            cfp_analysis_result=cfp_analysis_result,
            job_manager=job_manager,
        )

        logger.info("Extracted grant template sections")

        await job_manager.add_notification(
            parent_id=grant_application_id,
            event=NotificationEvents.SAVING_GRANT_TEMPLATE,
            message="Saving grant template to database...",
            notification_type="info",
            current_pipeline_stage=7,
            total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
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
            parent_id=grant_application_id,
            event=event_type,
            message=error_message,
            notification_type="error",
            data={"error_type": e.__class__.__name__, "recoverable": event_type != "pipeline_error"},
        )
        logger.info(
            "Grant template generation failed with error notification sent",
            template_id=str(grant_template_id),
            application_id=str(grant_application_id),
            error_type=e.__class__.__name__,
            event_type=event_type,
            error_message=error_message[:200],
        )
        return None

    async with session_maker() as session, session.begin():
        try:
            update_values = {
                "granting_institution_id": UUID(extraction_result["organization_id"])
                if extraction_result["organization_id"]
                else None,
                "submission_date": submission_date,
                "grant_sections": grant_sections,
            }

            if cfp_analysis_result and cfp_analysis_result.get("cfp_analysis"):
                update_values.update(
                    {
                        "cfp_section_analysis": cfp_analysis_result["cfp_analysis"],
                        "cfp_analysis_metadata": cfp_analysis_result.get("analysis_metadata"),
                        "cfp_analyzed_at": datetime.now(UTC),
                    }
                )
                logger.info(
                    "Including CFP analysis in template update",
                    template_id=str(grant_template_id),
                )

            grant_template = await session.scalar(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template_id)
                .values(update_values)
                .returning(GrantTemplate)
            )

            await session.commit()

            await job_manager.update_job_status(RagGenerationStatusEnum.COMPLETED)
            await job_manager.add_notification(
                parent_id=grant_application_id,
                event=NotificationEvents.GRANT_TEMPLATE_CREATED,
                message="Grant template created successfully",
                notification_type="success",
                data={
                    "template_id": str(grant_template.id),
                    "section_count": len(grant_sections),
                    "organization": org_name,
                },
                current_pipeline_stage=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
                total_pipeline_stages=TOTAL_GRANT_TEMPLATE_PIPELINE_NUM_OF_STAGES,
            )

            return cast("GrantTemplate", grant_template)
        except SQLAlchemyError as e:
            logger.error("Database error generating grant template", error=e)

            await job_manager.update_job_status(
                status=RagGenerationStatusEnum.FAILED,
                error_message="An internal error occurred. Please try again or contact support.",
                error_details={"error_type": "database_error"},
            )
            await job_manager.add_notification(
                parent_id=grant_application_id,
                event=NotificationEvents.INTERNAL_ERROR,
                message="An internal error occurred. Please try again or contact support.",
                notification_type="error",
                data={"error_type": "database_error"},
            )
            logger.info(
                "Database error during grant template save - notification sent",
                template_id=str(grant_template_id),
                application_id=str(grant_application_id),
                error=str(e),
            )
            return None
