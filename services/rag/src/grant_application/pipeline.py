import traceback
from typing import TYPE_CHECKING, Any, cast

from packages.db.src.enums import GrantApplicationStageEnum, RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication, GrantTemplate, RagGenerationJob
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    DatabaseError,
    DeserializationError,
    EvaluationError,
    InsufficientContextError,
    LLMTimeoutError,
    RagError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_email_notification
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_application.constants import GRANT_APPLICATION_STAGES_ORDER
from services.rag.src.grant_application.dto import StageDTO
from services.rag.src.grant_application.handlers import (
    handle_enrich_objectives_stage,
    handle_enrich_terminology_stage,
    handle_extract_relationships_stage,
    handle_generate_research_plan_stage,
    handle_generate_sections_stage,
)
from services.rag.src.grant_application.utils import generate_application_text
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.job_manager import JobManager

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import (
        EnrichObjectivesStageDTO,
        EnrichTerminologyStageDTO,
        ExtractRelationshipsStageDTO,
        GenerateSectionsStageDTO,
    )

logger = get_logger(__name__)


async def _determine_current_stage(
    application_id: Any, session_maker: async_sessionmaker[Any]
) -> GrantApplicationStageEnum:
    async with session_maker() as session:
        result = await session.execute(
            select_active(RagGenerationJob)
            .where(
                RagGenerationJob.grant_application_id == application_id,
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
            return GRANT_APPLICATION_STAGES_ORDER[0]

        processed_stages = set()

        for job in jobs:
            if job.application_stage:
                if job.status in [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]:
                    return cast("GrantApplicationStageEnum", job.application_stage)
                if job.status == RagGenerationStatusEnum.COMPLETED:
                    processed_stages.add(job.application_stage)

        for stage in GRANT_APPLICATION_STAGES_ORDER:
            if stage not in processed_stages:
                return stage

        return GRANT_APPLICATION_STAGES_ORDER[-1]


async def _initialize_pipeline(
    grant_application: GrantApplication,
    current_stage: GrantApplicationStageEnum,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> tuple[JobManager[StageDTO], Any]:
    application_id = grant_application.id

    job_manager = JobManager[StageDTO](
        entity_type="grant_application",
        entity_id=application_id,
        grant_application_id=application_id,
        current_stage=current_stage,
        pipeline_stages=list(GRANT_APPLICATION_STAGES_ORDER),
        session_maker=session_maker,
        trace_id=trace_id,
    )

    existing_job = await job_manager.get_or_create_job_for_stage()

    if not await job_manager.get_checkpoint_data():
        await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)

    return job_manager, existing_job


async def _verify_prerequisites(
    grant_application: GrantApplication,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> GrantTemplate:
    if not grant_application.grant_template:
        raise ValidationError("Grant template is missing from grant application")

    grant_template = grant_application.grant_template

    if not grant_template.cfp_analysis:
        raise ValidationError("CFP analysis is missing from grant template")

    await verify_rag_sources_indexed(
        parent_id=grant_application.id,
        session_maker=session_maker,
        entity_type=GrantApplication,
        trace_id=trace_id,
    )

    return grant_template


def _get_error_details(error: BackendError) -> tuple[str, str]:
    if isinstance(error, InsufficientContextError):
        return (
            "The uploaded documents don't contain sufficient information for the application sections. Please upload more research documents or refine your research objectives.",
            NotificationEvents.INSUFFICIENT_CONTEXT_ERROR,
        )
    if isinstance(error, ValidationError) and "indexing timeout" in str(error):
        return (
            "Document indexing is taking longer than expected. Please wait a few minutes and try again.",
            NotificationEvents.INDEXING_TIMEOUT,
        )
    if isinstance(error, ValidationError) and "indexing failed" in str(error).lower():
        return (
            "Document indexing failed. Please upload new documents and try again.",
            NotificationEvents.INDEXING_FAILED,
        )
    if isinstance(error, EvaluationError):
        return (
            "Quality evaluation failed during text generation. Please try again or contact support.",
            NotificationEvents.PIPELINE_ERROR,
        )
    if isinstance(error, LLMTimeoutError):
        return (
            "AI processing took longer than expected. The request will be retried automatically. Please wait a moment and check back.",
            NotificationEvents.LLM_TIMEOUT,
        )
    if isinstance(error, DatabaseError):
        return (
            "Database error occurred while saving your application. Please try again.",
            NotificationEvents.PIPELINE_ERROR,
        )
    if isinstance(error, RagError):
        return (
            "Document processing error occurred. Please try again or upload different documents.",
            NotificationEvents.PIPELINE_ERROR,
        )
    if isinstance(error, DeserializationError):
        return ("Data processing error occurred. Please try again.", NotificationEvents.PIPELINE_ERROR)
    return (
        "An unexpected error occurred while generating your application. Please try again or contact support if this persists.",
        NotificationEvents.PIPELINE_ERROR,
    )


async def _handle_pipeline_error(
    error: BackendError,
    job_manager: JobManager[StageDTO],
    application_id: Any,
    existing_job: Any,
    current_stage: GrantApplicationStageEnum,
    trace_id: str,
) -> None:
    job_id = existing_job.id if existing_job else None

    error_traceback = traceback.format_exc()
    error_context = getattr(error, "context", None)

    logger.error(
        "Backend error in grant application generation pipeline",
        error=error,
        error_type=type(error).__name__,
        error_message=str(error),
        application_id=str(application_id),
        job_id=str(job_id) if job_id else None,
        trace_id=trace_id,
        stage=current_stage,
    )

    user_message, event_type = _get_error_details(error)

    detailed_error_message = f"{type(error).__name__}: {error!s}"
    if error_context:
        detailed_error_message += f"\nContext: {error_context}"

    if event_type == NotificationEvents.PIPELINE_ERROR and not isinstance(
        error, (ValidationError, EvaluationError, DatabaseError, RagError, DeserializationError, LLMTimeoutError)
    ):
        logger.error(
            "Unexpected error in grant application pipeline",
            error=error,
            context=error_context,
            application_id=str(application_id),
            job_id=str(job_id) if job_id else None,
            trace_id=trace_id,
            stage=current_stage,
        )

    try:
        await job_manager.update_job_status(
            status=RagGenerationStatusEnum.FAILED,
            error_message=detailed_error_message,
            error_details={
                "error_type": error.__class__.__name__,
                "error_message": str(error),
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
                    "error_type": error.__class__.__name__,
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
                    "error_type": error.__class__.__name__,
                    "recoverable": event_type not in [NotificationEvents.PIPELINE_ERROR],
                    "retryable": False,
                },
            )
    except SQLAlchemyError as e:
        raise DatabaseError("Failed to record pipeline error in database") from e


async def handle_grant_application_pipeline(
    grant_application: GrantApplication,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    current_stage = await _determine_current_stage(grant_application.id, session_maker)

    application_id = grant_application.id
    logger.info(
        "Starting grant application text generation pipeline",
        application_id=application_id,
        stage=current_stage,
        trace_id=trace_id,
    )

    try:
        job_manager, existing_job = await _initialize_pipeline(
            grant_application, current_stage, session_maker, trace_id
        )

        grant_template = await _verify_prerequisites(grant_application, session_maker, trace_id)

        match current_stage:
            case GrantApplicationStageEnum.GENERATE_SECTIONS:
                await job_manager.ensure_not_cancelled()

                dto = await handle_generate_sections_stage(
                    grant_application=grant_application,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )

                await job_manager.transition_to_next_stage(dto)
                return

            case GrantApplicationStageEnum.EXTRACT_RELATIONSHIPS:
                checkpoint_data = await job_manager.get_checkpoint_data()
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                dto = await handle_extract_relationships_stage(
                    grant_application=grant_application,
                    dto=cast("GenerateSectionsStageDTO", checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.transition_to_next_stage(dto)
                return

            case GrantApplicationStageEnum.ENRICH_RESEARCH_OBJECTIVES:
                checkpoint_data = await job_manager.get_checkpoint_data()
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                dto = await handle_enrich_objectives_stage(
                    grant_application=grant_application,
                    dto=cast("ExtractRelationshipsStageDTO", checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.transition_to_next_stage(dto)
                return

            case GrantApplicationStageEnum.ENRICH_TERMINOLOGY:
                checkpoint_data = await job_manager.get_checkpoint_data()
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                dto = await handle_enrich_terminology_stage(
                    dto=cast("EnrichObjectivesStageDTO", checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.transition_to_next_stage(dto)
                return

            case GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN:
                checkpoint_data = await job_manager.get_checkpoint_data()
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                final_dto = await handle_generate_research_plan_stage(
                    grant_application=grant_application,
                    dto=cast("EnrichTerminologyStageDTO", checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )

                logger.info(
                    "Pipeline completed, saving application",
                    application_id=str(application_id),
                    trace_id=trace_id,
                )

                await job_manager.ensure_not_cancelled()

                complete_section_texts = {text["section_id"]: text["text"] for text in final_dto["section_texts"]}
                complete_section_texts[final_dto["work_plan_section"]["id"]] = final_dto["research_plan_text"]

                application_text = generate_application_text(
                    title=grant_application.title,
                    grant_sections=grant_template.grant_sections,
                    section_texts=complete_section_texts,
                )

                try:
                    async with session_maker() as session, session.begin():
                        await session.execute(
                            update(GrantApplication)
                            .where(GrantApplication.id == application_id)
                            .values(text=application_text)
                        )

                        await job_manager.update_job_status(RagGenerationStatusEnum.COMPLETED)
                        await job_manager.add_notification(
                            event=NotificationEvents.GRANT_APPLICATION_GENERATION_COMPLETED,
                            message="Application ready for review",
                            notification_type="success",
                            data={
                                "application_id": str(application_id),
                                "word_count": len(application_text.split()) if application_text else 0,
                            },
                        )
                except SQLAlchemyError as sql_error:
                    raise DatabaseError(
                        "Failed to save application to database",
                        context={"application_id": str(application_id), "sql_error": str(sql_error)},
                    ) from sql_error

                await publish_email_notification(
                    application_id=application_id,
                    trace_id=trace_id,
                )
                logger.info("Email notification published", application_id=str(application_id), trace_id=trace_id)

                return

            case _:
                raise ValidationError(f"Unknown stage: {current_stage}")

    except BackendError as e:
        await _handle_pipeline_error(e, job_manager, application_id, existing_job, current_stage, trace_id)
