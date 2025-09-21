from typing import TYPE_CHECKING, Any, cast

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import (
    BackendError,
    DatabaseError,
    DeserializationError,
    EvaluationError,
    InsufficientContextError,
    RagError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_email_notification
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from services.rag.src.enums import GrantApplicationStageEnum
from services.rag.src.grant_application.constants import GRANT_APPLICATION_STAGES_ORDER
from services.rag.src.grant_application.handlers import (
    handle_enrich_objectives_stage,
    handle_enrich_terminology_stage,
    handle_extract_relationships_stage,
    handle_generate_research_plan_stage,
    handle_generate_sections_stage,
)
from services.rag.src.grant_application.pipeline_dto import StageDTO
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
    """Initialize the pipeline job manager and verify prerequisites."""
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

    if existing_job and existing_job.checkpoint_data:
        logger.info(
            "Resuming from checkpoint",
            application_id=str(application_id),
            job_id=str(existing_job.id),
            stage=generation_stage,
        )
    else:
        try:
            await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)
        except SQLAlchemyError as e:
            logger.error(
                "Database error: Failed to update job status to processing",
                error=str(e),
                application_id=str(application_id),
                trace_id=trace_id,
            )
            # Continue processing since this is non-critical

    try:
        await job_manager.add_notification(
            event=NotificationEvents.GRANT_APPLICATION_GENERATION_STARTED,
            message="Starting application generation",
            notification_type="info",
        )
    except SQLAlchemyError as e:
        logger.error(
            "Database error: Failed to add generation started notification",
            error=str(e),
            application_id=str(application_id),
            trace_id=trace_id,
        )
        # Continue processing since this is non-critical

    return job_manager, existing_job


async def _verify_prerequisites(
    grant_application: GrantApplication,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> GrantTemplate:
    """Verify that prerequisites for pipeline execution are met."""
    application_id = grant_application.id

    async with session_maker() as session:
        # Load fresh instance with grant_template eagerly loaded to avoid lazy loading issues
        result = await session.execute(
            select_active(GrantApplication)
            .options(selectinload(GrantApplication.grant_template))
            .where(GrantApplication.id == application_id)
        )
        fresh_application = result.scalar_one_or_none()
        if not fresh_application:
            raise ValidationError(f"Grant application {application_id} not found")
        grant_template = fresh_application.grant_template

    if grant_template is None:
        raise ValidationError("Grant template is unexpectedly None")

    if not grant_template.cfp_analysis:
        raise ValidationError("CFP analysis is missing from grant template")

    await verify_rag_sources_indexed(
        parent_id=application_id,
        session_maker=session_maker,
        entity_type=GrantApplication,
        trace_id=trace_id,
    )

    return grant_template


def _validate_generate_sections_prerequisites(
    grant_application: GrantApplication,
) -> None:
    """Validate prerequisites for the generate sections stage."""
    if not grant_application.grant_template:
        raise ValidationError("Grant template is required")

    grant_template = grant_application.grant_template
    if not grant_template.grant_sections:
        raise ValidationError("Grant template has no sections")

    if not grant_template.cfp_analysis:
        raise ValidationError("CFP analysis is required for section generation")

    # Check for work plan section
    has_work_plan = False
    for section in grant_template.grant_sections:
        if "max_words" in section and "generation_instructions" in section and section.get("is_detailed_research_plan"):
            has_work_plan = True
            break

    if not has_work_plan:
        raise ValidationError("No research plan section found in grant template")


def _get_error_details(error: BackendError) -> tuple[str, str]:
    """Map backend errors to user-friendly messages and notification events."""
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
    """Handle pipeline errors with proper logging and notifications."""
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
        error, (ValidationError, EvaluationError, DatabaseError, RagError, DeserializationError)
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
    except SQLAlchemyError as job_error:
        logger.error(
            "Failed to update job status to failed",
            error=str(job_error),
            original_error=str(error),
            application_id=str(application_id),
            job_id=str(job_id) if job_id else None,
            trace_id=trace_id,
        )

    try:
        await job_manager.add_notification(
            event=event_type,
            message=error_message,
            notification_type="error",
            data={
                "error_type": error.__class__.__name__,
                "recoverable": event_type != NotificationEvents.PIPELINE_ERROR,
            },
        )
    except SQLAlchemyError as notification_error:
        logger.error(
            "Failed to add error notification",
            error=str(notification_error),
            original_error=str(error),
            application_id=str(application_id),
            job_id=str(job_id) if job_id else None,
            trace_id=trace_id,
        )

    logger.info(
        "Grant application generation failed with error notification sent",
        error_type=error.__class__.__name__,
        event_type=event_type,
        error_message=error_message[:200],
        application_id=str(application_id),
        job_id=str(job_id) if job_id else None,
        trace_id=trace_id,
        stage=generation_stage,
    )


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

        # Match/case routing based on stage
        match generation_stage:
            case GrantApplicationStageEnum.GENERATE_SECTIONS:
                logger.info(
                    "Executing section generation stage",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )
                await job_manager.ensure_not_cancelled()

                # Validate stage-specific prerequisites
                _validate_generate_sections_prerequisites(grant_application)

                # First stage - create initial DTO
                dto = await handle_generate_sections_stage(
                    grant_application=grant_application,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.to_next_job_stage(dto)
                logger.info(
                    "Section generation stage completed, triggering next stage",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )
                return

            case GrantApplicationStageEnum.EXTRACT_RELATIONSHIPS:
                logger.info(
                    "Executing relationship extraction stage",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )
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
                logger.info(
                    "Relationship extraction stage completed, triggering next stage",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )
                return

            case GrantApplicationStageEnum.ENRICH_RESEARCH_OBJECTIVES:
                logger.info(
                    "Executing research objectives enrichment stage",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )
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
                logger.info(
                    "Research objectives enrichment stage completed, triggering next stage",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )
                return

            case GrantApplicationStageEnum.ENRICH_TERMINOLOGY:
                logger.info(
                    "Executing terminology enrichment stage",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )
                if not existing_job or not existing_job.checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                await job_manager.ensure_not_cancelled()

                dto = await handle_enrich_terminology_stage(
                    grant_application=grant_application,
                    dto=cast("EnrichObjectivesStageDTO", existing_job.checkpoint_data),
                    job_manager=job_manager,
                    trace_id=trace_id,
                )
                await job_manager.to_next_job_stage(dto)
                logger.info(
                    "Terminology enrichment stage completed, triggering next stage",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )
                return

            case GrantApplicationStageEnum.GENERATE_RESEARCH_PLAN:
                logger.info(
                    "Executing research plan generation stage (final)",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                    checkpoint_keys=list(existing_job.checkpoint_data.keys())
                    if existing_job and existing_job.checkpoint_data
                    else [],
                )
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
                    "All stages completed, saving application to database",
                    application_id=str(application_id),
                    job_id=str(existing_job.id) if existing_job else None,
                    trace_id=trace_id,
                )

                await job_manager.ensure_not_cancelled()

                try:
                    await job_manager.add_notification(
                        event=NotificationEvents.SAVING_GRANT_APPLICATION,
                        message="Finalizing grant application",
                        notification_type="info",
                    )
                except Exception as e:
                    logger.error(
                        "Failed to add finalization notification",
                        error=str(e),
                        application_id=str(application_id),
                        trace_id=trace_id,
                    )

                # Final stage - save to database
                # Combine section texts from DTO with research plan
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

                        # Update job status and add notification within the same transaction
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

                try:
                    await publish_email_notification(
                        application_id=application_id,
                        trace_id=trace_id,
                    )
                    logger.info("Email notification published", application_id=str(application_id), trace_id=trace_id)
                except (SQLAlchemyError, ValidationError) as e:
                    logger.error(
                        "Failed to publish email notification",
                        application_id=str(application_id),
                        error=str(e),
                        trace_id=trace_id,
                    )
                    # Non-critical error, continue without raising

                return

            case _:
                raise ValidationError(f"Unknown stage: {generation_stage}")

    except BackendError as e:
        await _handle_pipeline_error(e, job_manager, application_id, existing_job, generation_stage, trace_id)
