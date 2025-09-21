from typing import TYPE_CHECKING, Any, cast

from packages.db.src.enums import GrantApplicationStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import GrantApplication, GrantTemplate
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
from services.rag.src.utils.job_manager import GrantApplicationJobManager

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import (
        EnrichObjectivesStageDTO,
        EnrichTerminologyStageDTO,
        ExtractRelationshipsStageDTO,
        GenerateSectionsStageDTO,
    )

logger = get_logger(__name__)


async def _initialize_pipeline(
    grant_application: GrantApplication,
    generation_stage: GrantApplicationStageEnum,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> tuple[GrantApplicationJobManager[StageDTO], Any]:
    application_id = grant_application.id

    job_manager = GrantApplicationJobManager[StageDTO](
        current_stage=generation_stage,
        grant_application_id=application_id,
        parent_id=application_id,
        pipeline_stages=list(GRANT_APPLICATION_STAGES_ORDER),
        session_maker=session_maker,
        trace_id=trace_id,
    )

    existing_job = await job_manager.get_or_create_job()

    if not (existing_job and existing_job.checkpoint_data):
        await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)

    await job_manager.add_notification(
        event=NotificationEvents.GRANT_APPLICATION_GENERATION_STARTED,
        message="Starting application generation",
        notification_type="info",
    )

    return job_manager, existing_job


async def _verify_prerequisites(
    grant_application: GrantApplication,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> GrantTemplate:
    grant_template = cast("GrantTemplate", grant_application.grant_template)

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
            "AI text generation is taking longer than expected. This may be due to high server load. Please try again in a few minutes.",
            NotificationEvents.PIPELINE_ERROR,
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
    job_manager: GrantApplicationJobManager[StageDTO],
    application_id: Any,
    existing_job: Any,
    generation_stage: GrantApplicationStageEnum,
    trace_id: str,
) -> None:
    job_id = existing_job.id if existing_job else None
    logger.error(
        "Backend error in grant application generation pipeline",
        error=error,
        error_type=type(error).__name__,
        error_message=str(error),
        application_id=str(application_id),
        job_id=str(job_id) if job_id else None,
        trace_id=trace_id,
        stage=generation_stage,
    )

    error_message, event_type = _get_error_details(error)

    if event_type == NotificationEvents.PIPELINE_ERROR and not isinstance(
        error, (ValidationError, EvaluationError, DatabaseError, RagError, DeserializationError, LLMTimeoutError)
    ):
        logger.error(
            "Unexpected error in grant application pipeline",
            error=error,
            context=getattr(error, "context", None),
            application_id=str(application_id),
            job_id=str(job_id) if job_id else None,
            trace_id=trace_id,
            stage=generation_stage,
        )

    try:
        await job_manager.update_job_status(
            status=RagGenerationStatusEnum.FAILED,
            error_message=error_message,
            error_details={
                "error_type": error.__class__.__name__,
                "recoverable": event_type != NotificationEvents.PIPELINE_ERROR,
            },
        )
        await job_manager.add_notification(
            event=event_type,
            message=error_message,
            notification_type="error",
            data={
                "error_type": error.__class__.__name__,
                "recoverable": event_type != NotificationEvents.PIPELINE_ERROR,
            },
        )
    except SQLAlchemyError as e:
        raise DatabaseError("Failed to record pipeline error in database") from e


async def handle_grant_application_pipeline(
    *,
    generation_stage: GrantApplicationStageEnum,
    grant_application: GrantApplication,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    application_id = grant_application.id
    logger.info(
        "Starting grant application text generation pipeline",
        application_id=application_id,
        stage=generation_stage,
        trace_id=trace_id,
    )

    try:
        job_manager, existing_job = await _initialize_pipeline(
            grant_application, generation_stage, session_maker, trace_id
        )

        grant_template = await _verify_prerequisites(grant_application, session_maker, trace_id)

        match generation_stage:
            case GrantApplicationStageEnum.GENERATE_SECTIONS:
                await job_manager.ensure_not_cancelled()

                dto = await handle_generate_sections_stage(
                    grant_application=grant_application,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.to_next_job_stage(dto)
                return

            case GrantApplicationStageEnum.EXTRACT_RELATIONSHIPS:
                if not existing_job or not existing_job.checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                dto = await handle_extract_relationships_stage(
                    grant_application=grant_application,
                    dto=cast("GenerateSectionsStageDTO", existing_job.checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.to_next_job_stage(dto)
                return

            case GrantApplicationStageEnum.ENRICH_RESEARCH_OBJECTIVES:
                if not existing_job or not existing_job.checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                dto = await handle_enrich_objectives_stage(
                    grant_application=grant_application,
                    dto=cast("ExtractRelationshipsStageDTO", existing_job.checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.to_next_job_stage(dto)
                return

            case GrantApplicationStageEnum.ENRICH_TERMINOLOGY:
                if not existing_job or not existing_job.checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                dto = await handle_enrich_terminology_stage(
                    dto=cast("EnrichObjectivesStageDTO", existing_job.checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.to_next_job_stage(dto)
                return

            case GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN:
                if not existing_job or not existing_job.checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                final_dto = await handle_generate_research_plan_stage(
                    grant_application=grant_application,
                    dto=cast("EnrichTerminologyStageDTO", existing_job.checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )

                logger.info(
                    "Pipeline completed, saving application",
                    application_id=str(application_id),
                    trace_id=trace_id,
                )

                await job_manager.ensure_not_cancelled()

                await job_manager.add_notification(
                    event=NotificationEvents.SAVING_GRANT_APPLICATION,
                    message="Finalizing grant application",
                    notification_type="info",
                )

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
                raise ValidationError(f"Unknown stage: {generation_stage}")

    except BackendError as e:
        await _handle_pipeline_error(e, job_manager, application_id, existing_job, generation_stage, trace_id)
