import time
import traceback
from typing import Any

from packages.db.src.enums import ApplicationStatusEnum, GrantApplicationStageEnum, RagGenerationStatusEnum
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
from packages.shared_utils.src.serialization import to_builtins
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
from services.rag.src.grant_application.utils import (
    generate_application_text,
    is_enrich_objectives_dto,
    is_enrich_terminology_dto,
    is_extract_relationships_dto,
    is_generate_research_plan_dto,
)
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


async def _determine_current_stage(
    application_id: Any, session_maker: async_sessionmaker[Any]
) -> GrantApplicationStageEnum:
    logger.debug(
        "Determining current pipeline stage",
        application_id=str(application_id),
    )

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

        logger.debug(
            "Found pipeline jobs for stage determination",
            application_id=str(application_id),
            job_count=len(jobs),
            job_statuses=[job.status.value for job in jobs],
        )

        if not jobs:
            current_stage = GRANT_APPLICATION_STAGES_ORDER[0]
            logger.debug(
                "No existing jobs found, starting with first stage",
                application_id=str(application_id),
                current_stage=current_stage.value,
            )
            return current_stage

        processed_stages = set()

        for job in jobs:
            if job.application_stage:
                if job.status in [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]:
                    logger.debug(
                        "Found active job, resuming stage",
                        application_id=str(application_id),
                        current_stage=job.application_stage.value,
                        job_status=job.status.value,
                        job_id=str(job.id),
                    )
                    return job.application_stage  # type: ignore[no-any-return]
                if job.status == RagGenerationStatusEnum.COMPLETED:
                    processed_stages.add(job.application_stage)

        for stage in GRANT_APPLICATION_STAGES_ORDER:
            if stage not in processed_stages:
                logger.debug(
                    "Determined next stage to process",
                    application_id=str(application_id),
                    current_stage=stage.value,
                    completed_stages=[s.value for s in processed_stages],
                )
                return stage

        final_stage = GRANT_APPLICATION_STAGES_ORDER[-1]
        logger.debug(
            "All stages completed, returning final stage",
            application_id=str(application_id),
            final_stage=final_stage.value,
        )
        return final_stage


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

    if existing_job.status == RagGenerationStatusEnum.PENDING:
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
    if isinstance(error, ValidationError) and "indexing timeout" in str(error).lower():
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
    serialized_error_context = to_builtins(error_context) if error_context is not None else None

    pipeline_context = {
        "current_stage": current_stage.value,
        "stage_index": GRANT_APPLICATION_STAGES_ORDER.index(current_stage),
        "total_stages": len(GRANT_APPLICATION_STAGES_ORDER),
        "remaining_stages": [
            stage.value
            for stage in GRANT_APPLICATION_STAGES_ORDER[GRANT_APPLICATION_STAGES_ORDER.index(current_stage) + 1 :]
        ],
        "completed_stages": [],
    }

    try:
        checkpoint_data = await job_manager.get_checkpoint_data()
        if checkpoint_data:
            pipeline_context["checkpoint_available"] = True
            pipeline_context["checkpoint_keys_count"] = len(checkpoint_data.keys())
            if "section_texts" in checkpoint_data:
                pipeline_context["checkpoint_sections_count"] = len(checkpoint_data["section_texts"])
        else:
            pipeline_context["checkpoint_available"] = False
    except Exception as checkpoint_error:
        logger.warning(
            "Failed to retrieve checkpoint data for error context",
            application_id=str(application_id),
            checkpoint_error=str(checkpoint_error),
            trace_id=trace_id,
        )
        pipeline_context["checkpoint_error"] = type(checkpoint_error).__name__

    logger.error(
        "Backend error in grant application generation pipeline",
        error=error,
        error_type=type(error).__name__,
        error_message=str(error),
        application_id=str(application_id),
        job_id=str(job_id) if job_id else None,
        trace_id=trace_id,
        stage=current_stage.value,
        pipeline_context=pipeline_context,
        error_context=serialized_error_context,
    )

    user_message, event_type = _get_error_details(error)

    detailed_error_message = f"{type(error).__name__}: {error!s}"
    if serialized_error_context is not None:
        detailed_error_message += f"\nContext: {serialized_error_context}"

    if event_type == NotificationEvents.PIPELINE_ERROR and not isinstance(
        error, (ValidationError, EvaluationError, DatabaseError, RagError, DeserializationError, LLMTimeoutError)
    ):
        logger.error(
            "Unexpected error in grant application pipeline",
            error=error,
            context=serialized_error_context,
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
                "context": serialized_error_context,
                "traceback": error_traceback,
                "stage": current_stage.value,
                "recoverable": event_type not in [NotificationEvents.PIPELINE_ERROR],
                "user_message": user_message,
            },
        )

        # Reset application status to IN_PROGRESS so user can fix issues and retry
        session_maker = job_manager.session_maker
        async with session_maker() as session, session.begin():
            await session.execute(
                update(GrantApplication)
                .where(GrantApplication.id == application_id)
                .values(status=ApplicationStatusEnum.IN_PROGRESS)
            )
        logger.info(
            "Reset application status to IN_PROGRESS after pipeline error",
            application_id=str(application_id),
            trace_id=trace_id,
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


async def handle_grant_application_pipeline(  # noqa: PLR0912
    grant_application: GrantApplication,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> None:
    pipeline_start_time = time.perf_counter()
    application_id = grant_application.id

    logger.info(
        "Starting grant application text generation pipeline",
        application_id=str(application_id),
        application_title=grant_application.title,
        trace_id=trace_id,
    )

    current_stage = await _determine_current_stage(application_id, session_maker)

    logger.info(
        "Grant application pipeline stage determined",
        application_id=str(application_id),
        current_stage=current_stage.value,
        stage_index=GRANT_APPLICATION_STAGES_ORDER.index(current_stage),
        total_stages=len(GRANT_APPLICATION_STAGES_ORDER),
        trace_id=trace_id,
        elapsed_ms=round((time.perf_counter() - pipeline_start_time) * 1000, 2),
    )

    try:
        job_manager, existing_job = await _initialize_pipeline(
            grant_application, current_stage, session_maker, trace_id
        )

        logger.debug(
            "Pipeline initialization completed",
            application_id=str(application_id),
            job_id=str(existing_job.id),
            job_status=existing_job.status.value,
            trace_id=trace_id,
        )

        grant_template = await _verify_prerequisites(grant_application, session_maker, trace_id)

        logger.debug(
            "Prerequisites verified, starting stage processing",
            application_id=str(application_id),
            current_stage=current_stage.value,
            template_id=str(grant_template.id),
            trace_id=trace_id,
        )

        stage_start_time = time.perf_counter()

        match current_stage:
            case GrantApplicationStageEnum.BLUEPRINT_PREP:
                logger.info(
                    "Starting BLUEPRINT_PREP stage",
                    application_id=str(application_id),
                    trace_id=trace_id,
                )

                checkpoint_data = await job_manager.get_checkpoint_data()
                stage_completed = existing_job.status == RagGenerationStatusEnum.COMPLETED

                if stage_completed:
                    if not checkpoint_data:
                        raise ValidationError("Missing checkpoint data for completed BLUEPRINT_PREP stage")
                    if not is_enrich_terminology_dto(checkpoint_data):
                        raise ValidationError(
                            "Invalid checkpoint data for completed BLUEPRINT_PREP stage",
                            context={"checkpoint_keys": list(checkpoint_data.keys())},
                        )
                    terminology_dto = checkpoint_data

                    logger.info(
                        "Skipping BLUEPRINT_PREP sub-stages (stage already completed)",
                        application_id=str(application_id),
                        trace_id=trace_id,
                    )
                else:
                    completed_substages = checkpoint_data.get("completed_substages", []) if checkpoint_data else []

                    logger.info(
                        "BLUEPRINT_PREP resumption check",
                        application_id=str(application_id),
                        completed_substages=completed_substages,
                        trace_id=trace_id,
                    )

                    if "extract_relationships" not in completed_substages:
                        await job_manager.ensure_not_cancelled()

                        logger.info(
                            "Executing sub-stage: extract_relationships",
                            application_id=str(application_id),
                            trace_id=trace_id,
                        )

                        relationships_dto = await handle_extract_relationships_stage(
                            grant_application=grant_application,
                            job_manager=job_manager,
                            trace_id=trace_id,
                        )

                        await job_manager.save_substage_checkpoint("extract_relationships", relationships_dto)

                        logger.info(
                            "Completed sub-stage: extract_relationships",
                            application_id=str(application_id),
                            relationships_count=len(relationships_dto["relationships"]),
                            trace_id=trace_id,
                        )
                    else:
                        logger.info(
                            "Skipping sub-stage: extract_relationships (already completed)",
                            application_id=str(application_id),
                            trace_id=trace_id,
                        )
                        if not is_extract_relationships_dto(checkpoint_data):
                            raise ValidationError(
                                "Invalid checkpoint data for extract_relationships sub-stage",
                                context={"checkpoint_keys": list(checkpoint_data.keys()) if checkpoint_data else []},
                            )
                        relationships_dto = checkpoint_data

                    if "enrich_objectives" not in completed_substages:
                        await job_manager.ensure_not_cancelled()

                        logger.info(
                            "Executing sub-stage: enrich_objectives",
                            application_id=str(application_id),
                            trace_id=trace_id,
                        )

                        objectives_dto = await handle_enrich_objectives_stage(
                            grant_application=grant_application,
                            dto=relationships_dto,
                            job_manager=job_manager,
                            trace_id=trace_id,
                        )

                        await job_manager.save_substage_checkpoint("enrich_objectives", objectives_dto)

                        logger.info(
                            "Completed sub-stage: enrich_objectives",
                            application_id=str(application_id),
                            objectives_count=len(objectives_dto["enrichment_responses"]),
                            trace_id=trace_id,
                        )
                    else:
                        logger.info(
                            "Skipping sub-stage: enrich_objectives (already completed)",
                            application_id=str(application_id),
                            trace_id=trace_id,
                        )
                        if not is_enrich_objectives_dto(checkpoint_data):
                            raise ValidationError(
                                "Invalid checkpoint data for enrich_objectives sub-stage",
                                context={"checkpoint_keys": list(checkpoint_data.keys()) if checkpoint_data else []},
                            )
                        objectives_dto = checkpoint_data

                    if "enrich_terminology" not in completed_substages:
                        await job_manager.ensure_not_cancelled()

                        logger.info(
                            "Executing sub-stage: enrich_terminology",
                            application_id=str(application_id),
                            trace_id=trace_id,
                        )

                        terminology_dto = await handle_enrich_terminology_stage(
                            dto=objectives_dto,
                            job_manager=job_manager,
                            trace_id=trace_id,
                        )

                        await job_manager.save_substage_checkpoint("enrich_terminology", terminology_dto)

                        logger.info(
                            "Completed sub-stage: enrich_terminology",
                            application_id=str(application_id),
                            wikidata_count=len(terminology_dto["wikidata_enrichments"]),
                            trace_id=trace_id,
                        )
                    else:
                        logger.info(
                            "Skipping sub-stage: enrich_terminology (already completed)",
                            application_id=str(application_id),
                            trace_id=trace_id,
                        )
                        if not is_enrich_terminology_dto(checkpoint_data):
                            raise ValidationError(
                                "Invalid checkpoint data for enrich_terminology sub-stage",
                                context={"checkpoint_keys": list(checkpoint_data.keys()) if checkpoint_data else []},
                            )
                        terminology_dto = checkpoint_data

                stage_elapsed = round((time.perf_counter() - stage_start_time) * 1000, 2)
                logger.info(
                    "Completed BLUEPRINT_PREP stage",
                    application_id=str(application_id),
                    relationships_extracted=len(terminology_dto["relationships"]),
                    objectives_enriched=len(terminology_dto["enrichment_responses"]),
                    wikidata_enrichments=len(terminology_dto["wikidata_enrichments"]),
                    stage_elapsed_ms=stage_elapsed,
                    trace_id=trace_id,
                )

                await job_manager.transition_to_next_stage(terminology_dto)
                return

            case GrantApplicationStageEnum.WORKPLAN_GENERATION:
                logger.info(
                    "Starting WORKPLAN_GENERATION stage",
                    application_id=str(application_id),
                    trace_id=trace_id,
                )

                checkpoint_data = await job_manager.get_checkpoint_data()
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                if existing_job.status == RagGenerationStatusEnum.COMPLETED:
                    if not is_generate_research_plan_dto(checkpoint_data):
                        raise ValidationError(
                            "Invalid checkpoint data for completed WORKPLAN_GENERATION stage",
                            context={"checkpoint_keys": list(checkpoint_data.keys())},
                        )

                    logger.info(
                        "Skipping WORKPLAN_GENERATION (stage already completed)",
                        application_id=str(application_id),
                        trace_id=trace_id,
                    )
                    dto = checkpoint_data
                else:
                    if not is_enrich_terminology_dto(checkpoint_data):
                        raise ValidationError(
                            "Invalid checkpoint data for WORKPLAN_GENERATION stage",
                            context={"checkpoint_keys": list(checkpoint_data.keys())},
                        )

                    logger.debug(
                        "Retrieved checkpoint data for WORKPLAN_GENERATION",
                        application_id=str(application_id),
                        checkpoint_wikidata=len(checkpoint_data.get("wikidata_enrichments", [])),
                        trace_id=trace_id,
                    )

                    await job_manager.ensure_not_cancelled()

                    dto = await handle_generate_research_plan_stage(
                        grant_application=grant_application,
                        dto=checkpoint_data,
                        job_manager=job_manager,
                        trace_id=trace_id,
                    )

                stage_elapsed = round((time.perf_counter() - stage_start_time) * 1000, 2)
                logger.info(
                    "Completed WORKPLAN_GENERATION stage",
                    application_id=str(application_id),
                    research_plan_words=len(dto["research_plan_text"].split()),
                    stage_elapsed_ms=stage_elapsed,
                    trace_id=trace_id,
                )

                await job_manager.transition_to_next_stage(dto)
                return

            case GrantApplicationStageEnum.SECTION_SYNTHESIS:
                logger.info(
                    "Starting SECTION_SYNTHESIS stage (final stage)",
                    application_id=str(application_id),
                    trace_id=trace_id,
                )

                checkpoint_data = await job_manager.get_checkpoint_data()
                if not checkpoint_data:
                    raise ValidationError("Missing checkpoint data for stage")

                if not is_generate_research_plan_dto(checkpoint_data):
                    raise ValidationError(
                        "Invalid checkpoint data for SECTION_SYNTHESIS stage",
                        context={"checkpoint_keys": list(checkpoint_data.keys())},
                    )

                logger.debug(
                    "Retrieved checkpoint data for SECTION_SYNTHESIS",
                    application_id=str(application_id),
                    checkpoint_research_plan_length=len(checkpoint_data.get("research_plan_text", "")),
                    trace_id=trace_id,
                )

                await job_manager.ensure_not_cancelled()

                final_dto = await handle_generate_sections_stage(
                    grant_application=grant_application,
                    dto=checkpoint_data,
                    job_manager=job_manager,
                    trace_id=trace_id,
                )

                stage_elapsed = round((time.perf_counter() - stage_start_time) * 1000, 2)
                logger.info(
                    "Completed SECTION_SYNTHESIS stage, preparing to save application",
                    application_id=str(application_id),
                    sections_generated=len(final_dto["section_texts"]),
                    stage_elapsed_ms=stage_elapsed,
                    trace_id=trace_id,
                )

                await job_manager.ensure_not_cancelled()

                complete_section_texts = {text["section_id"]: text["text"] for text in final_dto["section_texts"]}
                complete_section_texts[final_dto["work_plan_section"]["id"]] = final_dto["research_plan_text"]

                logger.debug(
                    "Generating final application text",
                    application_id=str(application_id),
                    total_sections=len(complete_section_texts),
                    trace_id=trace_id,
                )

                application_text = generate_application_text(
                    title=grant_application.title,
                    grant_sections=grant_template.grant_sections,
                    section_texts=complete_section_texts,
                )

                word_count = len(application_text.split()) if application_text else 0
                logger.info(
                    "Generated complete application text",
                    application_id=str(application_id),
                    word_count=word_count,
                    character_count=len(application_text) if application_text else 0,
                    trace_id=trace_id,
                )

                try:
                    async with session_maker() as session, session.begin():
                        await session.execute(
                            update(GrantApplication)
                            .where(GrantApplication.id == application_id)
                            .values(text=application_text, status=ApplicationStatusEnum.WORKING_DRAFT)
                        )

                        await job_manager.update_job_status(RagGenerationStatusEnum.COMPLETED)
                        await job_manager.add_notification(
                            event=NotificationEvents.GRANT_APPLICATION_GENERATION_COMPLETED,
                            message="Application ready for review",
                            notification_type="success",
                            data={
                                "application_id": str(application_id),
                                "word_count": word_count,
                            },
                        )

                    logger.info(
                        "Successfully saved application to database and updated status",
                        application_id=str(application_id),
                        word_count=word_count,
                        status=ApplicationStatusEnum.WORKING_DRAFT.value,
                        trace_id=trace_id,
                    )

                except SQLAlchemyError as sql_error:
                    logger.error(
                        "Failed to save application to database",
                        application_id=str(application_id),
                        sql_error=str(sql_error),
                        trace_id=trace_id,
                    )
                    raise DatabaseError(
                        "Failed to save application to database",
                        context={"application_id": str(application_id), "sql_error": str(sql_error)},
                    ) from sql_error

                await publish_email_notification(
                    application_id=application_id,
                    trace_id=trace_id,
                )

                pipeline_elapsed = round((time.perf_counter() - pipeline_start_time) * 1000, 2)
                logger.info(
                    "Grant application pipeline completed successfully",
                    application_id=str(application_id),
                    total_pipeline_elapsed_ms=pipeline_elapsed,
                    final_word_count=word_count,
                    trace_id=trace_id,
                )

                return

            case _:
                raise ValidationError(f"Unknown stage: {current_stage}")

    except BackendError as e:
        await _handle_pipeline_error(e, job_manager, application_id, existing_job, current_stage, trace_id)
