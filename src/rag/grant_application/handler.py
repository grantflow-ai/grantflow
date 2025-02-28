from asyncio import gather

from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.json_objects import GrantElement, GrantLongFormSection, ResearchObjective
from src.db.tables import GrantApplication
from src.exceptions import DatabaseError, ValidationError
from src.rag.grant_application.generate_section_text import generate_section_text
from src.rag.grant_application.generate_work_plan_text import generate_work_plan_component_text
from src.rag.grant_application.plan_work_plan_generation import handle_enrich_and_plan_work_plan
from src.rag.grant_application.utils import (
    create_dependencies_text,
    create_generation_groups,
    create_text_recursively,
    is_grant_long_form_section,
    map_to_tree,
)
from src.utils.db import retrieve_application
from src.utils.logger import get_logger
from src.utils.sync import batched_gather
from src.utils.text import normalize_markdown

logger = get_logger(__name__)


async def generate_work_plan_text(
    application_id: str,
    work_plan_section: GrantLongFormSection,
    form_inputs: dict[str, str],
    research_objectives: list[ResearchObjective],
) -> str:
    """Generate the work plan text for a grant application.

    Args:
        application_id: The ID of the grant application.
        work_plan_section: The work plan section.
        form_inputs: The form inputs for the grant application.
        research_objectives: The research objectives for the grant application.

    Returns:
        The generated work plan text.
    """
    work_plan_dto = await handle_enrich_and_plan_work_plan(
        application_id=application_id,
        research_objectives=research_objectives,
        grant_section=work_plan_section,
        form_inputs=form_inputs,
    )

    logger.debug(
        "Generated work plan dto for grant application %s",
        application_id=application_id,
        work_plan_dto=work_plan_dto,
    )

    work_plan_text = ""

    for research_objective in work_plan_dto["research_objectives"]:
        objective_number = research_objective["objective_number"]
        research_tasks = [t for t in work_plan_dto["research_tasks"] if t["objective_number"] == objective_number]

        research_objective_text = await generate_work_plan_component_text(
            application_id=application_id,
            component=research_objective,
            work_plan_text=work_plan_text,
            form_inputs=form_inputs,
        )

        work_plan_text += (
            f"\n\n### Objective {objective_number}: {research_objective['title']}\n{research_objective_text}"
        )
        research_task_texts = await gather(
            *[
                generate_work_plan_component_text(
                    application_id=application_id,
                    component=research_task,
                    work_plan_text=work_plan_text,
                    form_inputs=form_inputs,
                )
                for research_task in research_tasks
            ]
        )

        for research_task, research_task_text in zip(research_tasks, research_task_texts, strict=True):
            task_number = research_task["task_number"]
            work_plan_text += (
                f"\n\n#### {objective_number}.{task_number}: {research_task['title']}\n{research_task_text}"
            )

    return normalize_markdown(work_plan_text)


async def generate_grant_section_texts(
    application_id: str,
    form_inputs: dict[str, str],
    grant_sections: list[GrantElement | GrantLongFormSection],
    research_objectives: list[ResearchObjective],
) -> dict[str, str]:
    """Generate the grant section texts for a grant application.

    Args:
        application_id: The ID of the grant application.
        form_inputs: The form inputs for the grant application.
        grant_sections: The grant sections.
        research_objectives: The research objectives for the grant application.

    Returns:
        The generated section texts.
    """
    section_texts: dict[str, str] = {}

    # Filter for long form sections only for generation groups
    long_form_sections = [s for s in grant_sections if is_grant_long_form_section(s)]
    generation_groups = create_generation_groups(sections=long_form_sections)

    for generation_group in generation_groups:
        results = await batched_gather(
            *[
                (
                    generate_section_text(
                        application_id=application_id,
                        grant_section=section,
                        dependencies=create_dependencies_text(depends_on=section["depends_on"], texts=section_texts),
                        form_inputs=form_inputs,
                    )
                )
                if not section.get("is_detailed_workplan")
                else generate_work_plan_text(
                    application_id=application_id,
                    work_plan_section=section,
                    research_objectives=research_objectives,
                    form_inputs=form_inputs,
                )
                for section in generation_group
            ],
            batch_size=3,
        )
        section_texts.update({section["id"]: result for section, result in zip(generation_group, results, strict=True)})
        logger.debug("Generated texts for sections.", keys=[section["id"] for section in generation_group])

    return section_texts


def generate_application_text(
    title: str, grant_sections: list[GrantElement | GrantLongFormSection], section_texts: dict[str, str]
) -> str:
    """Generate the application text.

    Args:
        title: The title of the grant application.
        grant_sections: The grant sections.
        section_texts: The section texts.

    Returns:
        The generated application text.
    """
    tree = map_to_tree(sections=grant_sections, section_texts=section_texts)
    return "\n\n".join([f"# {title}", *[create_text_recursively(node) for node in tree]])


async def grant_application_text_generation_pipeline_handler(application_id: str) -> str:
    """Handles the generation of a grant application text.

    Args:
        application_id: The ID of the grant application.

    Raises:
        DatabaseError: If the grant application text could not be updated.
        ValidationError: If the grant application does not have a grant template or research objectives.

    Returns:
        The generated grant application text.
    """
    session_maker = get_session_maker()
    grant_application = await retrieve_application(application_id=application_id, session_maker=session_maker)
    if not grant_application.grant_template or not grant_application.research_objectives:
        raise ValidationError(
            "Grant application does not have a grant template or research objectives.",
            context={
                "application_id": application_id,
                "has_grant_template": grant_application.grant_template is not None,
                "has_research_objectives": grant_application.research_objectives is not None,
                "recovery_instruction": "Ensure the grant application has both a grant template and research objectives before generating text.",
            },
        )

    # Filter sections to find work plan sections
    work_plan_sections = []
    if grant_application.grant_template.grant_sections:
        work_plan_sections = [
            section
            for section in grant_application.grant_template.grant_sections
            if is_grant_long_form_section(section) and section.get("is_detailed_workplan")
        ]

    if not work_plan_sections:
        raise ValidationError(
            "Grant template does not have a detailed work plan section.",
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

    section_texts = await generate_grant_section_texts(
        application_id=application_id,
        grant_sections=grant_application.grant_template.grant_sections,
        form_inputs=grant_application.form_inputs or {},
        research_objectives=grant_application.research_objectives,
    )

    application_text = generate_application_text(
        title=grant_application.title,
        grant_sections=grant_application.grant_template.grant_sections,
        section_texts=section_texts,
    )

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(GrantApplication).where(GrantApplication.id == application_id).values(text=application_text)
            )
        except SQLAlchemyError as e:
            logger.error("Failed to update grant application text.", application_id=application_id, error=e)
            raise DatabaseError("Failed to update grant application text.") from e

    return application_text
