import traceback
from typing import Any, cast
from uuid import UUID

from packages.db.src.enums import GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.json_objects import CFPAnalysis
from packages.db.src.predefined_templates import get_predefined_template, get_predefined_template_by_id
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantTemplate, PredefinedGrantTemplate, RagGenerationJob
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    InsufficientContextError,
    LLMTimeoutError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import to_builtins
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


async def _get_predefined_template_from_analysis(
    *,
    cfp_analysis: CFPAnalysis,
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> PredefinedGrantTemplate | None:
    organization = cfp_analysis.get("organization")
    if not organization:
        return None

    organization_id = organization.get("id")
    if not organization_id:
        return None

    try:
        granting_institution_id = UUID(str(organization_id))
    except ValueError:
        logger.warning(
            "CFP analysis returned invalid granting institution id",
            organization_id=organization_id,
            template_id=str(grant_template.id),
            trace_id=trace_id,
        )
        return None

    activity_code = cfp_analysis.get("activity_code")
    normalized_activity_code = activity_code.strip().upper() if isinstance(activity_code, str) else None

    predefined = await get_predefined_template(
        session_maker=session_maker,
        granting_institution_id=granting_institution_id,
        activity_code=normalized_activity_code,
    )

    if not predefined:
        logger.info(
            "No predefined template matched CFP analysis",
            template_id=str(grant_template.id),
            granting_institution_id=str(granting_institution_id),
            activity_code=normalized_activity_code,
            trace_id=trace_id,
        )
        return None

    logger.info(
        "Matched predefined template from CFP analysis",
        template_id=str(grant_template.id),
        predefined_template_id=str(predefined.id),
        activity_code=normalized_activity_code,
        trace_id=trace_id,
    )

    return predefined


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
                cfp_analysis = cfp_analysis_result["cfp_analysis"]

                # Reload grant_template from database to get latest predefined_template_id
                # This handles cases where the template was updated between pipeline stages
                async with session_maker() as session:
                    refreshed_template = await session.scalar(
                        select_active(GrantTemplate).where(GrantTemplate.id == grant_template.id)
                    )
                    if refreshed_template:
                        grant_template = refreshed_template

                predefined_template: PredefinedGrantTemplate | None = None
                notification_message = "Grant template ready"

                if grant_template.predefined_template_id is not None:
                    predefined_template = await get_predefined_template_by_id(
                        session_maker=session_maker,
                        predefined_template_id=grant_template.predefined_template_id,
                    )
                    if not predefined_template:
                        raise ValidationError("Selected predefined template no longer exists")
                    notification_message = "Grant template cloned from predefined catalog"
                else:
                    predefined_template = await _get_predefined_template_from_analysis(
                        cfp_analysis=cfp_analysis,
                        grant_template=grant_template,
                        session_maker=session_maker,
                        trace_id=trace_id,
                    )
                    if predefined_template:
                        notification_message = "Grant template cloned from predefined catalog"

                if predefined_template:
                    return await handle_save_grant_template(
                        cfp_analysis=cfp_analysis,
                        grant_sections=predefined_template.grant_sections,
                        grant_template=grant_template,
                        job_manager=job_manager,
                        session_maker=session_maker,
                        trace_id=trace_id,
                        predefined_template=predefined_template,
                        notification_message=notification_message,
                    )

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
        serialized_error_context = to_builtins(error_context) if error_context is not None else None

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
        elif isinstance(e, ValidationError) and "indexing timeout" in str(e).lower():
            user_message = "Document indexing is taking longer than expected. Please wait a few minutes and try again."
            event_type = NotificationEvents.INDEXING_TIMEOUT
        elif isinstance(e, ValidationError) and "indexing failed" in str(e).lower():
            user_message = "Document indexing failed. Please upload new documents and try again."
            event_type = NotificationEvents.INDEXING_FAILED
        else:
            user_message = "An unexpected error occurred while processing your grant template. Please try again or contact support if this persists."
            event_type = NotificationEvents.PIPELINE_ERROR

        detailed_error_message = f"{type(e).__name__}: {e!s}"
        if serialized_error_context is not None:
            detailed_error_message += f"\nContext: {serialized_error_context}"

        await job_manager.clear_checkpoint_data()

        await job_manager.update_job_status(
            status=RagGenerationStatusEnum.FAILED,
            error_message=detailed_error_message,
            error_details={
                "error_type": e.__class__.__name__,
                "error_message": str(e),
                "context": serialized_error_context,
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
