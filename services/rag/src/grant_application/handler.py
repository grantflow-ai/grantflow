from asyncio import gather
from typing import Any
from uuid import UUID

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchDeepDive, ResearchObjective
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import (
    BackendError,
    DatabaseError,
    InsufficientContextError,
    RagError,
    ValidationError,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import batched_gather
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.constants import GRANT_APPLICATION_PIPELINE_STAGES, NotificationEvents
from services.rag.src.dto import ResearchComponentGenerationDTO
from services.rag.src.grant_application.extract_relationships import handle_extract_relationships
from services.rag.src.grant_application.generate_section_text import generate_section_text
from services.rag.src.grant_application.generate_work_plan_text import generate_work_plan_component_text
from services.rag.src.grant_application.optimized_batch_enrichment import handle_optimized_batch_enrichment
from services.rag.src.grant_application.utils import (
    create_dependencies_text,
    create_generation_groups,
    generate_application_text,
    is_grant_long_form_section,
)
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.job_manager import JobManager
from services.rag.src.utils.text import normalize_markdown

logger = get_logger(__name__)


async def generate_work_plan_text(
    application_id: str,
    work_plan_section: GrantLongFormSection,
    form_inputs: ResearchDeepDive,
    research_objectives: list[ResearchObjective],
    job_manager: JobManager,
) -> str:
    await job_manager.add_notification(
        parent_id=UUID(application_id),
        event=NotificationEvents.EXTRACTING_RELATIONSHIPS,
        message="Extracting relationships between research objectives and tasks...",
        notification_type="info",
        current_pipeline_stage=4,
        total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
    )
    relationships = await handle_extract_relationships(
        application_id=application_id,
        research_objectives=research_objectives,
        grant_section=work_plan_section,
        form_inputs=form_inputs,
    )

    await job_manager.add_notification(
        parent_id=UUID(application_id),
        event=NotificationEvents.ENRICHING_OBJECTIVES,
        message="Enriching research objectives with additional context...",
        notification_type="info",
        current_pipeline_stage=5,
        total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
    )



    enrichment_responses = await handle_optimized_batch_enrichment(
        application_id=application_id,
        grant_section=work_plan_section,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
    )

    await job_manager.add_notification(
        parent_id=UUID(application_id),
        event=NotificationEvents.OBJECTIVES_ENRICHED,
        message="Objectives enriched successfully",
        notification_type="info",
        data={
            "objective_count": len(research_objectives),
            "total_tasks": sum(len(objective["research_tasks"]) for objective in research_objectives),
        },
        current_pipeline_stage=5,
        total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
    )

    dtos = []
    total_tasks = sum(len(research_objective["research_tasks"]) for research_objective in research_objectives)
    words_per_component = abs(round(work_plan_section["max_words"] / (len(research_objectives) + total_tasks)))
    for research_objective, enrichment_response in zip(research_objectives, enrichment_responses, strict=True):
        objective_enrichment = enrichment_response["research_objective"]
        tasks_enrichment = enrichment_response["research_tasks"]
        research_tasks = research_objective["research_tasks"]
        dtos.append(
            ResearchComponentGenerationDTO(
                number=str(research_objective["number"]),
                title=research_objective["title"],
                description=objective_enrichment["description"],
                instructions=objective_enrichment["instructions"],
                guiding_questions=objective_enrichment["guiding_questions"],
                search_queries=objective_enrichment["search_queries"],
                relationships=relationships.get(str(research_objective["number"]), []),
                max_words=words_per_component,
                type="objective",
            )
        )
        dtos.extend(
            [
                ResearchComponentGenerationDTO(
                    number=f"{research_objective['number']}.{research_task['number']}",
                    title=research_task["title"],
                    description=task_enrichment["description"],
                    instructions=task_enrichment["instructions"],
                    guiding_questions=task_enrichment["guiding_questions"],
                    search_queries=task_enrichment["search_queries"],
                    relationships=relationships.get(f"{research_objective['number']}.{research_task['number']}", []),
                    max_words=words_per_component,
                    type="task",
                )
                for research_task, task_enrichment in zip(research_tasks, tasks_enrichment, strict=True)
            ]
        )

    work_plan_text = ""

    await job_manager.add_notification(
        parent_id=UUID(application_id),
        event=NotificationEvents.GENERATING_RESEARCH_PLAN,
        message="Generating work plan text for research objectives and tasks...",
        notification_type="info",
    )

    total_objectives = len(research_objectives)


    objective_task_groups = []
    for count in range(1, total_objectives + 1):
        objective: ResearchComponentGenerationDTO = next(d for d in dtos if str(d["number"]) == str(count))
        tasks: list[ResearchComponentGenerationDTO] = [t for t in dtos if t["number"].startswith(f"{count}.")]
        objective_task_groups.append((objective, tasks))

    await job_manager.add_notification(
        parent_id=UUID(application_id),
        event=NotificationEvents.GENERATING_OBJECTIVE,
        message=f"Generating text for all {total_objectives} objectives in parallel...",
        notification_type="info",
    )


    async def generate_objective_with_tasks(
        objective: ResearchComponentGenerationDTO,
        tasks: list[ResearchComponentGenerationDTO]
    ) -> tuple[ResearchComponentGenerationDTO, str, list[tuple[ResearchComponentGenerationDTO, str]]]:

        research_objective_text = await generate_work_plan_component_text(
            application_id=application_id,
            component=objective,
            work_plan_text=work_plan_text,
            form_inputs=form_inputs,
        )


        research_task_texts = await gather(
            *[
                generate_work_plan_component_text(
                    application_id=application_id,
                    component=research_task,
                    work_plan_text=work_plan_text,
                    form_inputs=form_inputs,
                )
                for research_task in tasks
            ]
        )


        task_results = list(zip(tasks, research_task_texts, strict=True))
        return objective, research_objective_text, task_results


    objective_results = await gather(
        *[
            generate_objective_with_tasks(objective, tasks)
            for objective, tasks in objective_task_groups
        ]
    )


    for objective, objective_text, task_results in objective_results:
        work_plan_text += f"\n\n### Objective {objective['number']}: {objective['title']}\n{objective_text}"

        for research_task, research_task_text in task_results:
            work_plan_text += f"\n\n#### {research_task['number']}: {research_task['title']}\n{research_task_text}"

        await job_manager.add_notification(
            parent_id=UUID(application_id),
            event=NotificationEvents.OBJECTIVE_COMPLETED,
            message=f"Completed Objective {objective['number']}",
            notification_type="info",
            data={
                "objective_number": objective["number"],
                "objective_title": objective["title"],
                "tasks_completed": len(task_results),
                "progress": f"{objective['number']}/{total_objectives}",
            },
        )

    await job_manager.add_notification(
        parent_id=UUID(application_id),
        event=NotificationEvents.RESEARCH_PLAN_COMPLETED,
        message="Work plan generation completed",
        notification_type="info",
        data={
            "objectives_count": total_objectives,
            "total_tasks": total_tasks,
            "word_count": len(work_plan_text.split()),
        },
    )

    return normalize_markdown(work_plan_text)


async def generate_grant_section_texts(
    application_id: str,
    form_inputs: ResearchDeepDive,
    grant_sections: list[GrantElement | GrantLongFormSection],
    research_objectives: list[ResearchObjective],
    job_manager: JobManager,
) -> dict[str, str]:
    section_texts: dict[str, str] = {}
    research_plan_section = next(
        s for s in grant_sections if is_grant_long_form_section(s) and s.get("is_detailed_research_plan")
    )
    research_plan_text = await generate_work_plan_text(
        application_id=application_id,
        work_plan_section=research_plan_section,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
        job_manager=job_manager,
    )
    section_texts[research_plan_section["id"]] = research_plan_text

    long_form_sections = [
        s for s in grant_sections if is_grant_long_form_section(s) and not s.get("is_detailed_research_plan")
    ]
    for section in long_form_sections:
        # we inject the research_plan text into all sections regardless of dependencies ~keep
        section["depends_on"] = [v for v in section["depends_on"] if v != research_plan_section["id"]]

    generation_groups = create_generation_groups(sections=long_form_sections)
    for generation_group in generation_groups:
        results = await batched_gather(
            *[
                (
                    generate_section_text(
                        application_id=application_id,
                        grant_section=section,
                        dependencies=create_dependencies_text(
                            depends_on=section["depends_on"],
                            texts=section_texts,
                        ),
                        form_inputs=form_inputs,
                        research_plan_text=research_plan_text,
                    )
                )
                for section in generation_group
            ],
            batch_size=3,
        )
        section_texts.update({section["id"]: result for section, result in zip(generation_group, results, strict=True)})
        logger.debug("Generated texts for sections.", keys=[section["id"] for section in generation_group])

    return section_texts


async def grant_application_text_generation_pipeline_handler(
    grant_application_id: UUID,
    session_maker: async_sessionmaker[Any],
    job_manager: JobManager | None = None,
) -> tuple[str, dict[str, str]]:
    application_id = grant_application_id
    logger.info("Starting grant application text generation pipeline", application_id=application_id)

    if job_manager is None:
        job_manager = JobManager(session_maker)
        await job_manager.create_grant_application_job(
            grant_application_id=application_id,
            total_stages=GRANT_APPLICATION_PIPELINE_STAGES,
        )

        await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)

    await job_manager.add_notification(
        parent_id=application_id,
        event=NotificationEvents.GRANT_APPLICATION_GENERATION_STARTED,
        message="Starting grant application text generation pipeline...",
        notification_type="info",
        current_pipeline_stage=1,
        total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
    )

    grant_application: GrantApplication | None = None
    grant_template: GrantTemplate | None = None

    async with session_maker() as session:
        grant_application = await retrieve_application(application_id=application_id, session=session)
        grant_template = grant_application.grant_template

        if not grant_application.grant_template or not grant_application.research_objectives:
            missing_parts = []
            if not grant_application.grant_template:
                missing_parts.append("grant template")
            if not grant_application.research_objectives:
                missing_parts.append("research objectives")

            error_message = (
                f"Please complete the following before generating application text: {', '.join(missing_parts)}."
            )
            logger.error(
                "Missing prerequisites for grant application", application_id=application_id, missing=missing_parts
            )

            await job_manager.add_notification(
                parent_id=application_id,
                event=NotificationEvents.MISSING_PREREQUISITES,
                message=error_message,
                notification_type="error",
                data={
                    "has_grant_template": grant_application.grant_template is not None,
                    "has_research_objectives": grant_application.research_objectives is not None,
                    "missing": missing_parts,
                    "recoverable": True,
                },
            )
            raise ValidationError(
                error_message,
                context={
                    "application_id": application_id,
                    "has_grant_template": grant_application.grant_template is not None,
                    "has_research_objectives": grant_application.research_objectives is not None,
                    "recovery_instruction": "Ensure the grant application has both a grant template and research objectives before generating text.",
                },
            )

    if grant_template is None:
        raise ValidationError("Grant template is unexpectedly None")

    try:
        await verify_rag_sources_indexed(application_id, session_maker, GrantApplication)

        await job_manager.add_notification(
            parent_id=application_id,
            event=NotificationEvents.VALIDATING_TEMPLATE,
            message="Validating grant template structure...",
            notification_type="info",
            current_pipeline_stage=2,
            total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
        )

        work_plan_sections = []
        if grant_application.grant_template.grant_sections:
            work_plan_sections = [
                section
                for section in grant_application.grant_template.grant_sections
                if is_grant_long_form_section(section) and section.get("is_detailed_research_plan")
            ]

        if not work_plan_sections:
            error_message = "The grant template is missing a required work plan section. Please update the template to include a detailed work plan section."
            logger.error("Missing work plan section in template", application_id=application_id)
            await job_manager.add_notification(
                parent_id=application_id,
                event=NotificationEvents.TEMPLATE_INCOMPLETE,
                message=error_message,
                notification_type="error",
                data={
                    "grant_section_count": len(grant_application.grant_template.grant_sections)
                    if grant_application.grant_template.grant_sections
                    else 0,
                    "missing_section": "detailed_work_plan",
                    "recoverable": True,
                },
            )
            raise ValidationError(
                error_message,
                context={
                    "application_id": application_id,
                    "grant_section_count": len(grant_application.grant_template.grant_sections)
                    if grant_application.grant_template.grant_sections
                    else 0,
                    "long_form_sections": [
                        {
                            "id": section["id"],
                            "title": section["title"],
                            "is_detailed_research_plan": section.get("is_detailed_research_plan", False),
                        }
                        for section in grant_application.grant_template.grant_sections
                        if is_grant_long_form_section(section)
                    ]
                    if grant_application.grant_template.grant_sections
                    else [],
                    "recovery_instruction": "Add a detailed work plan section to the grant template with is_detailed_research_plan=True.",
                },
            )

        await job_manager.add_notification(
            parent_id=application_id,
            event=NotificationEvents.TEMPLATE_VALIDATED,
            message="Template validation complete",
            notification_type="info",
            data={
                "section_count": len(grant_template.grant_sections),
                "research_objectives_count": len(grant_application.research_objectives),
            },
            current_pipeline_stage=3,
            total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
        )

        await job_manager.add_notification(
            parent_id=application_id,
            event=NotificationEvents.GENERATING_SECTION_TEXTS,
            message="Generating text for all grant sections...",
            notification_type="info",
            current_pipeline_stage=4,
            total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
        )

        section_texts = await generate_grant_section_texts(
            application_id=str(application_id),
            grant_sections=grant_template.grant_sections,
            form_inputs=grant_application.form_inputs or {},
            research_objectives=grant_application.research_objectives,
            job_manager=job_manager,
        )

        await job_manager.add_notification(
            parent_id=application_id,
            event=NotificationEvents.SECTION_TEXTS_GENERATED,
            message="Section texts generated",
            notification_type="info",
            data={
                "section_count": len(section_texts),
                "total_words": sum(len(text.split()) for text in section_texts.values()),
            },
            current_pipeline_stage=5,
            total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
        )

        await job_manager.add_notification(
            parent_id=application_id,
            event=NotificationEvents.ASSEMBLING_APPLICATION,
            message="Assembling complete grant application text...",
            notification_type="info",
            current_pipeline_stage=6,
            total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
        )

        application_text = generate_application_text(
            title=grant_application.title,
            grant_sections=grant_template.grant_sections,
            section_texts=section_texts,
        )

        await job_manager.add_notification(
            parent_id=application_id,
            event=NotificationEvents.SAVING_APPLICATION,
            message="Saving grant application text to database...",
            notification_type="info",
            current_pipeline_stage=7,
            total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
        )
    except BackendError as e:
        logger.error("Failed to generate grant application text.", application_id=application_id, error=e)

        if isinstance(e, InsufficientContextError):
            error_message = "Unable to generate application text due to insufficient information. Please ensure all research objectives have detailed descriptions."
            event_type = NotificationEvents.INSUFFICIENT_CONTEXT_ERROR
            recoverable = True
        elif isinstance(e, RagError) and "retrieval quality" in str(e).lower():
            error_message = "Unable to find sufficient relevant information to generate high-quality content. Please ensure your uploaded documents contain comprehensive research details."
            event_type = NotificationEvents.LOW_RETRIEVAL_QUALITY
            recoverable = True
        elif isinstance(e, ValidationError) and "indexing timeout" in str(e):
            error_message = "Document indexing is taking longer than expected. Please wait a few minutes and try again."
            event_type = NotificationEvents.INDEXING_TIMEOUT
            recoverable = True
        elif isinstance(e, ValidationError) and "indexing failed" in str(e).lower():
            error_message = "Document indexing failed. Please upload new documents and try again."
            event_type = NotificationEvents.INDEXING_FAILED
            recoverable = True
        else:
            error_message = "An unexpected error occurred while generating your application text. Please try again or contact support if this persists."
            event_type = NotificationEvents.GENERATION_ERROR
            recoverable = False
            logger.error("Unexpected error in application generation", error=e, context=getattr(e, "context", None))

        await job_manager.update_job_status(
            status=RagGenerationStatusEnum.FAILED,
            error_message=error_message,
            error_details={
                "error_type": e.__class__.__name__,
                "recoverable": recoverable,
            },
        )
        await job_manager.add_notification(
            parent_id=application_id,
            event=event_type,
            message=error_message,
            notification_type="error",
            data={
                "error_type": e.__class__.__name__,
                "recoverable": recoverable,
            },
        )
        raise

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(GrantApplication).where(GrantApplication.id == application_id).values(text=application_text)
            )

            await job_manager.add_notification(
                parent_id=application_id,
                event=NotificationEvents.APPLICATION_SAVED,
                message="Application saved successfully",
                notification_type="info",
                data={
                    "application_id": str(application_id),
                    "word_count": len(application_text.split()),
                    "section_count": len(section_texts),
                },
                current_pipeline_stage=8,
                total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
            )
        except SQLAlchemyError as e:
            logger.error("Database error updating grant application text.", application_id=application_id, error=e)

            await job_manager.update_job_status(
                status=RagGenerationStatusEnum.FAILED,
                error_message="An internal error occurred. Please try again or contact support.",
                error_details={"error_type": "database_error"},
            )
            await job_manager.add_notification(
                parent_id=application_id,
                event=NotificationEvents.INTERNAL_ERROR,
                message="An internal error occurred. Please try again or contact support.",
                notification_type="error",
                data={"error_type": "database_error"},
            )
            raise DatabaseError("Failed to update grant application text.", context=str(e)) from e

    await job_manager.update_job_status(RagGenerationStatusEnum.COMPLETED)
    await job_manager.add_notification(
        parent_id=application_id,
        event=NotificationEvents.GRANT_APPLICATION_GENERATION_COMPLETED,
        message="Grant application text generation completed successfully.",
        notification_type="success",
        current_pipeline_stage=GRANT_APPLICATION_PIPELINE_STAGES,
        total_pipeline_stages=GRANT_APPLICATION_PIPELINE_STAGES,
    )

    return application_text, section_texts