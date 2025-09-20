from datetime import datetime
from typing import Any, Final, TypedDict, cast

from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.json_objects import CFPAnalysisResult, GrantElement, GrantLongFormSection
from packages.db.src.tables import GrantingInstitution, GrantTemplate, GrantTemplateSource, RagSource
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    DatabaseError,
    InsufficientContextError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.enums import GrantTemplateStageEnum
from services.rag.src.grant_template.cfp_section_analysis import (
    handle_analyze_cfp,
)
from services.rag.src.grant_template.dto import (
    ExtractedCFPData,
    OrganizationNamespace,
)
from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data
from services.rag.src.grant_template.extract_sections import ExtractedSectionDTO, handle_extract_sections
from services.rag.src.grant_template.generate_metadata import handle_generate_grant_template_metadata
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.job_manager import GrantTemplateJobManager

logger = get_logger(__name__)

GRANT_TEMPLATE_PIPELINE_STAGES: Final[tuple[GrantTemplateStageEnum, ...]] = (
    GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
    GrantTemplateStageEnum.ANALYZE_CFP_CONTENT,
    GrantTemplateStageEnum.EXTRACT_SECTIONS,
    GrantTemplateStageEnum.GENERATE_METADATA,
)

TOTAL_PIPELINE_STAGES: Final[int] = len(GRANT_TEMPLATE_PIPELINE_STAGES)


class ExtractCFPContentStageDTO(TypedDict):
    organization: OrganizationNamespace | None
    extracted_data: ExtractedCFPData


class AnalyzeCFPContentStageDTO(ExtractCFPContentStageDTO):
    analysis_results: CFPAnalysisResult


class ExtractionSectionsStageDTO(AnalyzeCFPContentStageDTO):
    extracted_sections: list[ExtractedSectionDTO]


StageDTO = ExtractCFPContentStageDTO | AnalyzeCFPContentStageDTO | ExtractionSectionsStageDTO


async def handle_cfp_extraction_stage(
    *,
    grant_template: GrantTemplate,
    job_manager: GrantTemplateJobManager[GrantTemplateStageEnum, StageDTO],
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> ExtractCFPContentStageDTO:
    await job_manager.ensure_not_cancelled()

    await job_manager.add_notification(
        event=NotificationEvents.EXTRACTING_CFP_DATA,
        message="Analyzing call for proposals document",
        notification_type="info",
    )
    # this can take a while, that's why we are rechecking cancellation ~keep
    await verify_rag_sources_indexed(
        parent_id=grant_template.id,
        session_maker=session_maker,
        entity_type=GrantTemplate,
        trace_id=trace_id,
    )

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

    extraction_result = await handle_extract_cfp_data(
        source_ids=[str(v) for v in source_ids],
        organization_mapping={
            str(org.id): {"full_name": org.full_name, "abbreviation": org.abbreviation} for org in funding_organizations
        },
        session_maker=session_maker,
        trace_id=trace_id,
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
        message="Document analysis complete",
        notification_type="success",
        data={
            "organization": org_name,
            "subject": extraction_result["cfp_subject"][:100] if extraction_result["cfp_subject"] else None,
            "deadline": str(submission_date) if submission_date else None,
        },
    )

    logger.info("Extracted CFP data", template_id=str(grant_template.id), trace_id=trace_id)

    return ExtractCFPContentStageDTO(extracted_data=extraction_result, organization=organization)


async def handle_cfp_analysis_stage(
    *,
    extracted_cfp: ExtractCFPContentStageDTO,
    job_manager: GrantTemplateJobManager[GrantTemplateStageEnum, StageDTO],
    trace_id: str,
) -> AnalyzeCFPContentStageDTO:
    await job_manager.add_notification(
        event=NotificationEvents.GRANT_TEMPLATE_EXTRACTION,
        message="Analyzing grant requirements",
        notification_type="info",
    )

    analysis_results = await handle_analyze_cfp(
        full_cfp_text="\n".join(
            [
                f"{content['title']}: {' '.join(content['subtitles'])}"
                for content in extracted_cfp["extracted_data"]["content"]
            ]
        ),
        trace_id=trace_id,
    )

    logger.info(
        "CFP analysis completed",
        trace_id=trace_id,
        **analysis_results,
    )

    await job_manager.add_notification(
        event=NotificationEvents.CFP_DATA_EXTRACTED,
        message="Requirements analysis complete",
        notification_type="success",
        data={
            "category": analysis_results.get("category"),
            "academic_disciplines": analysis_results.get("academic_disciplines", [])[:3] if analysis_results.get("academic_disciplines") else [],
        },
    )

    return AnalyzeCFPContentStageDTO(
        **extracted_cfp,
        analysis_results=analysis_results,
    )


async def handle_section_extraction_stage(
    *,
    analysis_result: AnalyzeCFPContentStageDTO,
    job_manager: GrantTemplateJobManager[GrantTemplateStageEnum, StageDTO],
    trace_id: str,
) -> ExtractionSectionsStageDTO:
    await job_manager.add_notification(
        event=NotificationEvents.GRANT_TEMPLATE_EXTRACTION,
        message="Identifying application sections",
        notification_type="info",
    )
    sections = await handle_extract_sections(
        cfp_content=analysis_result["extracted_data"]["content"],
        cfp_subject=analysis_result["extracted_data"]["cfp_subject"],
        trace_id=trace_id,
        organization=analysis_result["organization"],
    )

    await job_manager.add_notification(
        event=NotificationEvents.SECTIONS_EXTRACTED,
        message=f"Identified {len(sections)} application sections",
        notification_type="success",
        data={
            "section_count": len(sections),
            "main_sections": [section["title"] for section in sections[:5]],
        },
    )

    return ExtractionSectionsStageDTO(
        **analysis_result,
        extracted_sections=sections,
    )


async def handle_generate_metadata_stage(
    *,
    section_extraction_result: ExtractionSectionsStageDTO,
    job_manager: GrantTemplateJobManager[GrantTemplateStageEnum, StageDTO],
    trace_id: str,  # noqa: ARG001
) -> list[GrantElement | GrantLongFormSection]:
    await job_manager.add_notification(
        event=NotificationEvents.GRANT_TEMPLATE_METADATA,
        message="Generating section guidelines",
        notification_type="info",
    )

    section_metadata = await handle_generate_grant_template_metadata(
        cfp_content="\n".join(
            [
                f"{content['title']}: {'...'.join(content['subtitles'])}"
                for content in section_extraction_result["extracted_data"]["content"]
            ]
        ),
        cfp_subject=section_extraction_result["extracted_data"]["cfp_subject"],
        organization=section_extraction_result["organization"],
        long_form_sections=[s for s in section_extraction_result["extracted_sections"] if not s.get("is_title_only")],
    )

    await job_manager.add_notification(
        event=NotificationEvents.METADATA_GENERATED,
        message="Section guidelines created",
        notification_type="success",
        data={
            "sections_configured": len(section_extraction_result["extracted_sections"]),
        },
    )

    mapped_metadata = {metadata["id"]: metadata for metadata in section_metadata}

    ret: list[GrantElement | GrantLongFormSection] = []
    for section in section_extraction_result["extracted_sections"]:
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
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
    generation_stage: GrantTemplateStageEnum,
    trace_id: str,
) -> GrantTemplate | None:
    job_manager = GrantTemplateJobManager[GrantTemplateStageEnum, StageDTO](
        session_maker=session_maker,
        grant_application_id=grant_template.grant_application_id,
        job_id=grant_template.rag_job_id,
        current_stage=generation_stage,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        parent_id=grant_template.id,
        trace_id=trace_id,
    )

    job = await job_manager.get_or_create_job()
    await job_manager.ensure_not_cancelled()

    template_id = grant_template.id
    job_id = job.id

    logger.info(
        "Starting grant template generation pipeline stage",
        template_id=template_id,
        job_id=job_id,
        trace_id=trace_id,
        stage=generation_stage,
        job_current_stage=job.current_stage,
        job_checkpoint_data=bool(job.checkpoint_data),
    )

    # Update job status if starting or continuing
    if job.status == RagGenerationStatusEnum.PENDING:
        await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)

    try:
        # Load checkpoint data from job (it's already fresh from DB via get_or_create_job)
        checkpoint_data = job.checkpoint_data if job.checkpoint_data else {}

        match generation_stage:
            case GrantTemplateStageEnum.EXTRACT_CFP_CONTENT:
                logger.info(
                    "Executing CFP extraction stage",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                )
                extracted_cfp = await handle_cfp_extraction_stage(
                    grant_template=grant_template,
                    job_manager=job_manager,
                    session_maker=session_maker,
                    trace_id=trace_id,
                )

                # Save checkpoint and trigger next stage
                await job_manager.to_next_job_stage(dto=extracted_cfp)
                logger.info(
                    "CFP extraction stage completed, triggering next stage",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                )
                return None  # Stage completed, next will be triggered via PubSub

            case GrantTemplateStageEnum.ANALYZE_CFP_CONTENT:
                logger.info(
                    "Executing CFP analysis stage",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                )
                analysis_result = await handle_cfp_analysis_stage(
                    job_manager=job_manager,
                    extracted_cfp=cast("ExtractCFPContentStageDTO", checkpoint_data),
                    trace_id=trace_id,
                )

                # Save checkpoint and trigger next stage
                await job_manager.to_next_job_stage(dto=analysis_result)
                logger.info(
                    "CFP analysis stage completed, triggering next stage",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                )
                return None

            case GrantTemplateStageEnum.EXTRACT_SECTIONS:
                logger.info(
                    "Executing section extraction stage",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                )
                analysis_result = cast("AnalyzeCFPContentStageDTO", checkpoint_data)
                section_extraction_result = await handle_section_extraction_stage(
                    analysis_result=analysis_result,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )

                # Save checkpoint and trigger next stage
                await job_manager.to_next_job_stage(dto=section_extraction_result)
                logger.info(
                    "Section extraction stage completed, triggering next stage",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                )
                return None

            case GrantTemplateStageEnum.GENERATE_METADATA:
                logger.info(
                    "Executing metadata generation stage (final)",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                    checkpoint_keys=list(checkpoint_data.keys()) if checkpoint_data else [],
                )
                section_extraction_result = cast("ExtractionSectionsStageDTO", checkpoint_data)
                grant_sections = await handle_generate_metadata_stage(
                    section_extraction_result=section_extraction_result,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )

                logger.info(
                    "All stages completed, saving grant template to database",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                )

                await job_manager.add_notification(
                    event=NotificationEvents.SAVING_GRANT_TEMPLATE,
                    message="Finalizing grant template",
                    notification_type="info",
                )

                # This is the final stage - save to database
                return await handle_save_grant_template(
                    grant_template=grant_template,
                    session_maker=session_maker,
                    job_manager=job_manager,
                    cfp_analysis=section_extraction_result["analysis_results"],
                    extracted_cfp=section_extraction_result,  # Contains all accumulated data
                    grant_sections=grant_sections,
                    trace_id=trace_id,
                )

    except BackendError as e:
        template_id = grant_template.id
        job_id = job.id
        logger.error(
            "Backend error in grant template generation pipeline",
            error=e,
            error_type=type(e).__name__,
            error_message=str(e),
            template_id=template_id,
            job_id=job_id,
            trace_id=trace_id,
            stage=generation_stage,
        )

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
            logger.error(
                "Unexpected error in grant template pipeline",
                error=e,
                context=getattr(e, "context", None),
                template_id=template_id,
                job_id=job_id,
                trace_id=trace_id,
                stage=generation_stage,
            )

        await job_manager.update_job_status(
            status=RagGenerationStatusEnum.FAILED,
            error_message=error_message,
            error_details={"error_type": e.__class__.__name__, "recoverable": event_type != "pipeline_error"},
        )
        await job_manager.add_notification(
            event=event_type,
            message=error_message,
            notification_type="error",
            data={"error_type": e.__class__.__name__, "recoverable": event_type != "pipeline_error"},
        )
        logger.info(
            "Grant template generation failed with error notification sent",
            error_type=e.__class__.__name__,
            event_type=event_type,
            error_message=error_message[:200],
            template_id=template_id,
            job_id=job_id,
            trace_id=trace_id,
            stage=generation_stage,
        )
        return None


async def handle_save_grant_template(
    *,
    cfp_analysis: CFPAnalysisResult,
    extracted_cfp: ExtractionSectionsStageDTO,
    grant_sections: list[GrantElement | GrantLongFormSection],
    grant_template: GrantTemplate,
    job_manager: GrantTemplateJobManager[GrantTemplateStageEnum, StageDTO],
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> GrantTemplate:
    template_id = grant_template.id
    job_id = job_manager.job_id

    async with session_maker() as session, session.begin():
        try:
            update_values = {
                "granting_institution_id": extracted_cfp["organization"]["organization_id"]
                if extracted_cfp["organization"]
                else None,
                "submission_date": datetime.strptime(extracted_cfp["extracted_data"]["submission_date"], "%Y-%m-%d").date()
                if extracted_cfp["extracted_data"]["submission_date"]
                else None,
                "grant_sections": grant_sections,
                "cfp_analysis": cfp_analysis,
            }

            grant_template = await session.scalar(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template.id)
                .values(update_values)
                .returning(GrantTemplate)
            )

            await session.commit()

            await job_manager.update_job_status(RagGenerationStatusEnum.COMPLETED)
            await job_manager.add_notification(
                event=NotificationEvents.GRANT_TEMPLATE_CREATED,
                message="Grant template ready",
                notification_type="success",
                data={
                    "template_id": str(grant_template.id),
                    "sections": len(grant_sections),
                    "organization": extracted_cfp["organization"]["full_name"] if extracted_cfp["organization"] else "Unknown",
                },
            )

            logger.info(
                "Grant template saved successfully",
                template_id=template_id,
                job_id=job_id,
                trace_id=trace_id,
                section_count=len(grant_sections),
            )

            return grant_template
        except SQLAlchemyError as e:
            logger.error(
                "Database error generating grant template",
                error=e,
                template_id=template_id,
                job_id=job_id,
                trace_id=trace_id,
            )
            raise DatabaseError("Error saving grant template", context=str(e)) from e
