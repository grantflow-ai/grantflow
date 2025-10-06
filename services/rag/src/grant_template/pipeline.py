import traceback
from typing import Any, cast

from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantTemplate, RagGenerationJob
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    LLMTimeoutError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.constants import GRANT_TEMPLATE_PIPELINE_STAGES
from services.rag.src.grant_template.dto import (
    CFPAnalysisStageDTO,
    StageDTO,
)
from services.rag.src.grant_template.handlers import (
    handle_cfp_analysis_stage,
    handle_save_grant_template,
    handle_template_generation_stage,
)
from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


async def _determine_current_stage(template_id: Any, session_maker: async_sessionmaker[Any]) -> GrantTemplateStageEnum:
    async with session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob)
            .where(
                RagGenerationJob.grant_template_id == template_id,
                RagGenerationJob.status.in_(
                    [
                        RagGenerationStatusEnum.PENDING,
                        RagGenerationStatusEnum.PROCESSING,
                        RagGenerationStatusEnum.COMPLETED,
                    ]
                ),
            )
            .order_by(RagGenerationJob.created_at.asc())
        )
        jobs = result.scalars().all()

        if not jobs:
            return GRANT_TEMPLATE_PIPELINE_STAGES[0]

        processed_stages = set()

        for job in jobs:
            if job.template_stage:
                if job.status in [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]:
                    return cast("GrantTemplateStageEnum", job.template_stage)
                if job.status == RagGenerationStatusEnum.COMPLETED:
                    processed_stages.add(job.template_stage)

        for stage in GRANT_TEMPLATE_PIPELINE_STAGES:
            if stage not in processed_stages:
                return stage

        return GRANT_TEMPLATE_PIPELINE_STAGES[-1]


async def handle_grant_template_pipeline(
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> GrantTemplate | None:
    current_stage = await _determine_current_stage(grant_template.id, session_maker)

    job_manager = JobManager[StageDTO](
        entity_type="grant_template",
        entity_id=grant_template.id,
        grant_application_id=grant_template.grant_application_id,
        current_stage=current_stage,
        pipeline_stages=list(GRANT_TEMPLATE_PIPELINE_STAGES),
        session_maker=session_maker,
        trace_id=trace_id,
    )

    job = await job_manager.get_or_create_job_for_stage()
    await job_manager.ensure_not_cancelled()

    template_id = grant_template.id

    logger.info(
        "Grant template pipeline started",
        template_id=template_id,
        stage=current_stage,
        trace_id=trace_id,
    )

    if job.status == RagGenerationStatusEnum.PENDING:
        await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)

    try:
        checkpoint_data = await job_manager.get_checkpoint_data()

        match current_stage:
            case GrantTemplateStageEnum.CFP_ANALYSIS:
                cfp_analysis_result = await handle_cfp_analysis_stage(
                    grant_template=grant_template,
                    job_manager=job_manager,
                    session_maker=session_maker,
                    trace_id=trace_id,
                )
                await job_manager.transition_to_next_stage(cfp_analysis_result)
                return None

            case GrantTemplateStageEnum.TEMPLATE_GENERATION:
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for template generation stage")

                cfp_analysis_result = cast("CFPAnalysisStageDTO", checkpoint_data)
                template_generation_result = await handle_template_generation_stage(
                    cfp_analysis_result=cfp_analysis_result,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )

                logger.info(
                    "Pipeline completed, saving template",
                    template_id=template_id,
                    trace_id=trace_id,
                )

                return await handle_save_grant_template(
                    grant_template=grant_template,
                    session_maker=session_maker,
                    job_manager=job_manager,
                    cfp_analysis=template_generation_result["cfp_analysis"],
                    grant_sections=template_generation_result["grant_sections"],
                    trace_id=trace_id,
                )

            case _:
                raise ValidationError(f"Unknown stage: {current_stage}")

    except BackendError as e:
        template_id = grant_template.id
        job_id = job.id

        error_traceback = traceback.format_exc()
        error_context = getattr(e, "context", None)

        logger.error(
            "Backend error in grant template generation pipeline",
            error=e,
            error_type=type(e).__name__,
            error_message=str(e),
            template_id=template_id,
            job_id=job_id,
            trace_id=trace_id,
            stage=current_stage,
        )

        if isinstance(e, InsufficientContextError):
            user_message = "The uploaded document doesn't contain sufficient information about the required application sections. Please upload a complete Call for Proposals (CFP) document that includes details about application requirements and sections."
            event_type = NotificationEvents.INSUFFICIENT_CONTEXT_ERROR
        elif isinstance(e, LLMTimeoutError):
            user_message = "AI processing took longer than expected. The request will be retried automatically. Please wait a moment and check back."
            event_type = NotificationEvents.LLM_TIMEOUT
        elif isinstance(e, ValidationError) and "indexing timeout" in str(e):
            user_message = "Document indexing is taking longer than expected. Please wait a few minutes and try again."
            event_type = NotificationEvents.INDEXING_TIMEOUT
        elif isinstance(e, ValidationError) and "indexing failed" in str(e).lower():
            user_message = "Document indexing failed. Please upload new documents and try again."
            event_type = NotificationEvents.INDEXING_FAILED
        else:
            user_message = "An unexpected error occurred while processing your grant template. Please try again or contact support if this persists."
            event_type = NotificationEvents.PIPELINE_ERROR

        detailed_error_message = f"{type(e).__name__}: {e!s}"
        if error_context:
            detailed_error_message += f"\nContext: {error_context}"

        await job_manager.clear_checkpoint_data()

        await job_manager.update_job_status(
            status=RagGenerationStatusEnum.FAILED,
            error_message=detailed_error_message,
            error_details={
                "error_type": e.__class__.__name__,
                "error_message": str(e),
                "context": error_context,
                "traceback": error_traceback,
                "stage": current_stage.value,
                "recoverable": event_type not in [NotificationEvents.PIPELINE_ERROR],
                "user_message": user_message,
            },
        )

        if event_type in [
            NotificationEvents.INDEXING_TIMEOUT,
            NotificationEvents.INSUFFICIENT_CONTEXT_ERROR,
            NotificationEvents.LLM_TIMEOUT,
        ]:
            await job_manager.add_notification(
                event=event_type,
                message=user_message,
                notification_type="warning",
                data={
                    "error_type": e.__class__.__name__,
                    "recoverable": True,
                    "retryable": True,
                },
            )
        else:
            await job_manager.add_notification(
                event=event_type,
                message=user_message,
                notification_type="error",
                data={
                    "error_type": e.__class__.__name__,
                    "recoverable": event_type not in [NotificationEvents.PIPELINE_ERROR],
                    "retryable": False,
                },
            )
        return None
