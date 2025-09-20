from typing import Any, cast

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.tables import GrantTemplate
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.enums import GrantTemplateStageEnum
from services.rag.src.grant_template.constants import GRANT_TEMPLATE_PIPELINE_STAGES
from services.rag.src.grant_template.handlers import (
    handle_cfp_analysis_stage,
    handle_cfp_extraction_stage,
    handle_generate_metadata_stage,
    handle_save_grant_template,
    handle_section_extraction_stage,
)
from services.rag.src.grant_template.pipeline_dto import (
    AnalyzeCFPContentStageDTO,
    ExtractCFPContentStageDTO,
    ExtractionSectionsStageDTO,
    StageDTO,
)
from services.rag.src.utils.job_manager import GrantTemplateJobManager

logger = get_logger(__name__)


async def handle_grant_template_pipeline(
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
        try:
            await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)
        except Exception as e:
            logger.error(
                "Failed to update job status to processing",
                error=str(e),
                template_id=template_id,
                job_id=job_id,
                trace_id=trace_id,
            )

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
                await job_manager.to_next_job_stage(extracted_cfp)
                logger.info(
                    "CFP extraction stage completed, triggering next stage",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                )
                return None

            case GrantTemplateStageEnum.ANALYZE_CFP_CONTENT:
                logger.info(
                    "Executing CFP analysis stage",
                    template_id=template_id,
                    job_id=job_id,
                    trace_id=trace_id,
                    checkpoint_keys=list(checkpoint_data.keys()) if checkpoint_data else [],
                )
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for CFP analysis stage")

                extracted_cfp = cast("ExtractCFPContentStageDTO", checkpoint_data)
                analyzed_cfp = await handle_cfp_analysis_stage(
                    extracted_cfp=extracted_cfp,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.to_next_job_stage(analyzed_cfp)
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
                    checkpoint_keys=list(checkpoint_data.keys()) if checkpoint_data else [],
                )
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for section extraction stage")

                analyzed_cfp = cast("AnalyzeCFPContentStageDTO", checkpoint_data)
                section_extraction_result = await handle_section_extraction_stage(
                    analysis_result=analyzed_cfp,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.to_next_job_stage(section_extraction_result)
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
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for metadata generation stage")

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

                try:
                    await job_manager.add_notification(
                        event=NotificationEvents.SAVING_GRANT_TEMPLATE,
                        message="Finalizing grant template",
                        notification_type="info",
                    )
                except Exception as e:
                    logger.error(
                        "Failed to add finalization notification",
                        error=str(e),
                        template_id=template_id,
                        job_id=job_id,
                        trace_id=trace_id,
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

        try:
            await job_manager.update_job_status(
                status=RagGenerationStatusEnum.FAILED,
                error_message=error_message,
                error_details={
                    "error_type": e.__class__.__name__,
                    "recoverable": event_type != NotificationEvents.PIPELINE_ERROR,
                },
            )
        except Exception as job_error:
            logger.error(
                "Failed to update job status to failed",
                error=str(job_error),
                original_error=str(e),
                template_id=template_id,
                job_id=job_id,
                trace_id=trace_id,
            )

        try:
            await job_manager.add_notification(
                event=event_type,
                message=error_message,
                notification_type="error",
                data={
                    "error_type": e.__class__.__name__,
                    "recoverable": event_type != NotificationEvents.PIPELINE_ERROR,
                },
            )
        except Exception as notification_error:
            logger.error(
                "Failed to add error notification",
                error=str(notification_error),
                original_error=str(e),
                template_id=template_id,
                job_id=job_id,
                trace_id=trace_id,
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
