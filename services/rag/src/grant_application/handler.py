from asyncio import gather
from typing import Any
from uuid import UUID

from packages.db.src.connection import get_session_maker
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchDeepDive, ResearchObjective
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import BackendError, DatabaseError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import RagProcessingStatus, publish_notification
from packages.shared_utils.src.sync import batched_gather
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.dto import ResearchComponentGenerationDTO
from services.rag.src.grant_application.enrich_research_objective import handle_enrich_objective
from services.rag.src.grant_application.extract_relationships import handle_extract_relationships
from services.rag.src.grant_application.generate_section_text import generate_section_text
from services.rag.src.grant_application.generate_work_plan_text import generate_work_plan_component_text
from services.rag.src.grant_application.utils import (
    create_dependencies_text,
    create_generation_groups,
    generate_application_text,
    is_grant_long_form_section,
)
from services.rag.src.utils.text import normalize_markdown

logger = get_logger(__name__)


async def generate_work_plan_text(
    application_id: str,
    work_plan_section: GrantLongFormSection,
    form_inputs: ResearchDeepDive,
    research_objectives: list[ResearchObjective],
) -> str:
    await publish_notification(
        logger=logger,
        parent_id=UUID(application_id),
        event="extracting_relationships",
        data=RagProcessingStatus(
            event="extracting_relationships",
            message="Extracting relationships between research objectives and tasks...",
        ),
    )
    relationships = await handle_extract_relationships(
        application_id=application_id,
        research_objectives=research_objectives,
        grant_section=work_plan_section,
        form_inputs=form_inputs,
    )

    await publish_notification(
        logger=logger,
        parent_id=UUID(application_id),
        event="enriching_objectives",
        data=RagProcessingStatus(
            event="enriching_objectives",
            message="Enriching research objectives with additional context...",
        ),
    )

    enrichment_responses = await gather(
        *[
            handle_enrich_objective(
                application_id=application_id,
                research_objective=research_objective,
                grant_section=work_plan_section,
                form_inputs=form_inputs,
            )
            for research_objective in research_objectives
        ]
    )

    await publish_notification(
        logger=logger,
        parent_id=UUID(application_id),
        event="objectives_enriched",
        data=RagProcessingStatus(
            event="objectives_enriched",
            message="Objectives enriched successfully",
            data={
                "objective_count": len(research_objectives),
                "total_tasks": sum(len(objective["research_tasks"]) for objective in research_objectives),
            },
        ),
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

    await publish_notification(
        logger=logger,
        parent_id=UUID(application_id),
        event="generating_workplan",
        data=RagProcessingStatus(
            event="generating_workplan",
            message="Generating work plan text for research objectives and tasks...",
        ),
    )

    total_objectives = len(research_objectives)
    count = 0
    while count != total_objectives:
        count += 1
        objective: ResearchComponentGenerationDTO = next(d for d in dtos if str(d["number"]) == str(count))
        tasks: list[ResearchComponentGenerationDTO] = [t for t in dtos if t["number"].startswith(f"{count}.")]

        await publish_notification(
            logger=logger,
            parent_id=UUID(application_id),
            event="generating_objective",
            data=RagProcessingStatus(
                event="generating_objective",
                message=f"Generating text for Objective {objective['number']}: {objective['title']}...",
            ),
        )

        research_objective_text = await generate_work_plan_component_text(
            application_id=application_id,
            component=objective,
            work_plan_text=work_plan_text,
            form_inputs=form_inputs,
        )

        work_plan_text += f"\n\n### Objective {objective['number']}: {objective['title']}\n{research_objective_text}"

        await publish_notification(
            logger=logger,
            parent_id=UUID(application_id),
            event="generating_tasks",
            data=RagProcessingStatus(
                event="generating_tasks",
                message=f"Generating text for {len(tasks)} tasks under Objective {objective['number']}...",
            ),
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

        for research_task, research_task_text in zip(tasks, research_task_texts, strict=True):
            work_plan_text += f"\n\n#### {research_task['number']}: {research_task['title']}\n{research_task_text}"

        await publish_notification(
            logger=logger,
            parent_id=UUID(application_id),
            event="objective_completed",
            data=RagProcessingStatus(
                event="objective_completed",
                message=f"Completed Objective {objective['number']}",
                data={
                    "objective_number": objective["number"],
                    "objective_title": objective["title"],
                    "tasks_completed": len(tasks),
                    "progress": f"{count}/{total_objectives}",
                },
            ),
        )

    await publish_notification(
        logger=logger,
        parent_id=UUID(application_id),
        event="workplan_completed",
        data=RagProcessingStatus(
            event="workplan_completed",
            message="Work plan generation completed",
            data={
                "objectives_count": total_objectives,
                "total_tasks": total_tasks,
                "word_count": len(work_plan_text.split()),
            },
        ),
    )

    return normalize_markdown(work_plan_text)


async def generate_grant_section_texts(
    application_id: str,
    form_inputs: ResearchDeepDive,
    grant_sections: list[GrantElement | GrantLongFormSection],
    research_objectives: list[ResearchObjective],
) -> dict[str, str]:
    section_texts: dict[str, str] = {}
    workplan_section = next(
        s for s in grant_sections if is_grant_long_form_section(s) and s.get("is_detailed_workplan")
    )
    workplan_text = await generate_work_plan_text(
        application_id=application_id,
        work_plan_section=workplan_section,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
    )
    section_texts[workplan_section["id"]] = workplan_text

    long_form_sections = [
        s for s in grant_sections if is_grant_long_form_section(s) and not s.get("is_detailed_workplan")
    ]
    for section in long_form_sections:
        # we inject the workplan text into all sections regardless of dependencies ~keep
        section["depends_on"] = [v for v in section["depends_on"] if v != workplan_section["id"]]

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
                        form_input=form_inputs,
                        workplan_text=workplan_text,
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
) -> tuple[str, dict[str, str]]:
    session_maker = get_session_maker()
    application_id = grant_application_id
    logger.info("Starting grant application text generation pipeline", application_id=application_id)

    await publish_notification(
        logger=logger,
        parent_id=application_id,
        event="grant_application_generation_started",
        data=RagProcessingStatus(
            event="grant_application_generation_started",
            message="Starting grant application text generation pipeline...",
        ),
    )

    grant_application: GrantApplication | None = None
    grant_template: GrantTemplate | None = None

    async with session_maker() as session:
        grant_application = await retrieve_application(application_id=application_id, session=session)
        grant_template = grant_application.grant_template

        if not grant_application.grant_template or not grant_application.research_objectives:
            error_message = "Grant application does not have a grant template or research objectives."
            logger.error(error_message, application_id=application_id)
            await publish_notification(
                logger=logger,
                parent_id=application_id,
                event="validation_error",
                data=RagProcessingStatus(
                    event="validation_error",
                    message=error_message,
                    data={
                        "has_grant_template": grant_application.grant_template is not None,
                        "has_research_objectives": grant_application.research_objectives is not None,
                    },
                ),
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

    # At this point, grant_template is guaranteed to be non-None due to the check above
    if grant_template is None:
        raise ValidationError("Grant template is unexpectedly None")

    try:
        await publish_notification(
            logger=logger,
            parent_id=application_id,
            event="validating_template",
            data=RagProcessingStatus(
                event="validating_template",
                message="Validating grant template structure...",
            ),
        )

        work_plan_sections = []
        if grant_application.grant_template.grant_sections:
            work_plan_sections = [
                section
                for section in grant_application.grant_template.grant_sections
                if is_grant_long_form_section(section) and section.get("is_detailed_workplan")
            ]

        if not work_plan_sections:
            error_message = "Grant template does not have a detailed work plan section."
            logger.error(error_message, application_id=application_id)
            await publish_notification(
                logger=logger,
                parent_id=application_id,
                event="validation_error",
                data=RagProcessingStatus(
                    event="validation_error",
                    message=error_message,
                    data={
                        "grant_section_count": len(grant_application.grant_template.grant_sections)
                        if grant_application.grant_template.grant_sections
                        else 0,
                    },
                ),
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
                            "is_detailed_workplan": section.get("is_detailed_workplan", False),
                        }
                        for section in grant_application.grant_template.grant_sections
                        if is_grant_long_form_section(section)
                    ]
                    if grant_application.grant_template.grant_sections
                    else [],
                    "recovery_instruction": "Add a detailed work plan section to the grant template with is_detailed_workplan=True.",
                },
            )

        await publish_notification(
            logger=logger,
            parent_id=application_id,
            event="template_validated",
            data=RagProcessingStatus(
                event="template_validated",
                message="Template validation complete",
                data={
                    "section_count": len(grant_template.grant_sections),
                    "research_objectives_count": len(grant_application.research_objectives),
                },
            ),
        )

        await publish_notification(
            logger=logger,
            parent_id=application_id,
            event="generating_section_texts",
            data=RagProcessingStatus(
                event="generating_section_texts",
                message="Generating text for all grant sections...",
            ),
        )

        section_texts = await generate_grant_section_texts(
            application_id=str(application_id),
            grant_sections=grant_template.grant_sections,
            form_inputs=grant_application.form_inputs or {},
            research_objectives=grant_application.research_objectives,
        )

        await publish_notification(
            logger=logger,
            parent_id=application_id,
            event="section_texts_generated",
            data=RagProcessingStatus(
                event="section_texts_generated",
                message="Section texts generated",
                data={
                    "section_count": len(section_texts),
                    "total_words": sum(len(text.split()) for text in section_texts.values()),
                },
            ),
        )

        await publish_notification(
            logger=logger,
            parent_id=application_id,
            event="assembling_application",
            data=RagProcessingStatus(
                event="assembling_application",
                message="Assembling complete grant application text...",
            ),
        )

        application_text = generate_application_text(
            title=grant_application.title,
            grant_sections=grant_template.grant_sections,
            section_texts=section_texts,
        )

        await publish_notification(
            logger=logger,
            parent_id=application_id,
            event="saving_application",
            data=RagProcessingStatus(
                event="saving_application",
                message="Saving grant application text to database...",
            ),
        )
    except BackendError as e:
        logger.error("Failed to generate grant application text.", application_id=application_id, error=e)
        await publish_notification(
            logger=logger,
            parent_id=application_id,
            event="generation_error",
            data=RagProcessingStatus(
                event="generation_error",
                message=f"Failed to generate grant application text: {e!s}",
                data={"error_type": e.__class__.__name__, **getattr(e, "context", {})},
            ),
        )
        raise

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(GrantApplication).where(GrantApplication.id == application_id).values(text=application_text)
            )

            await publish_notification(
                logger=logger,
                parent_id=application_id,
                event="application_saved",
                data=RagProcessingStatus(
                    event="application_saved",
                    message="Application saved successfully",
                    data={
                        "application_id": str(application_id),
                        "word_count": len(application_text.split()),
                        "section_count": len(section_texts),
                    },
                ),
            )
        except SQLAlchemyError as e:
            logger.error("Failed to update grant application text.", application_id=application_id, error=e)
            await publish_notification(
                logger=logger,
                parent_id=application_id,
                event="database_error",
                data=RagProcessingStatus(
                    event="database_error",
                    message="Failed to update grant application text.",
                    data={"error": str(e)},
                ),
            )
            raise DatabaseError("Failed to update grant application text.", context=str(e)) from e

    await publish_notification(
        logger=logger,
        parent_id=application_id,
        event="grant_application_generation_completed",
        data=RagProcessingStatus(
            event="grant_application_generation_completed",
            message="Grant application text generation completed successfully.",
        ),
    )

    return application_text, section_texts
