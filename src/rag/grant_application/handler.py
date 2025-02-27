from asyncio import gather

from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.json_objects import GrantLongFormSection, ResearchObjective
from src.db.tables import GrantApplication
from src.exceptions import DatabaseError, ValidationError
from src.rag.grant_application.generate_research_text import handle_generate_research_plan_component
from src.rag.grant_application.generate_section_text import handle_section_text_generation
from src.rag.grant_application.plan_research_plan_generation import handle_enrich_and_plan_research_plan
from src.rag.grant_application.utils import (
    create_dependencies_text,
    create_generation_groups,
    create_text_recursively,
    map_to_tree,
)
from src.utils.db import retrieve_application
from src.utils.logger import get_logger
from src.utils.sync import batched_gather
from src.utils.text import normalize_markdown

logger = get_logger(__name__)


async def generate_research_plan_text(
    application_id: str,
    research_plan_section: GrantLongFormSection,
    form_inputs: dict[str, str],
    research_objectives: list[ResearchObjective],
) -> str:
    """Generate the research plan text for a grant application.

    Args:
        application_id: The ID of the grant application.
        research_plan_section: The research plan section.
        form_inputs: The form inputs for the grant application.
        research_objectives: The research objectives for the grant application.

    Returns:
        The generated research plan text.
    """
    research_plan_dto = await handle_enrich_and_plan_research_plan(
        application_id=application_id,
        research_objectives=research_objectives,
        grant_section=research_plan_section,
        form_inputs=form_inputs,
    )

    logger.debug(
        "Generated research plan dto for grant application %s",
        application_id=application_id,
        research_plan_dto=research_plan_dto,
    )

    research_plan_text = ""

    for research_objective in research_plan_dto["research_objectives"]:
        objective_number = research_objective["objective_number"]
        research_tasks = [t for t in research_plan_dto["research_tasks"] if t["objective_number"] == objective_number]

        research_objective_text = await handle_generate_research_plan_component(
            application_id=application_id,
            component=research_objective,
            research_plan_text=research_plan_text,
            form_inputs=form_inputs,
        )

        research_plan_text += (
            f"\n\n### Objective {objective_number}: {research_objective['title']}\n{research_objective_text}"
        )
        research_task_texts = await gather(
            *[
                handle_generate_research_plan_component(
                    application_id=application_id,
                    component=research_task,
                    research_plan_text=research_plan_text,
                    form_inputs=form_inputs,
                )
                for research_task in research_tasks
            ]
        )

        for research_task, research_task_text in zip(research_tasks, research_task_texts, strict=True):
            task_number = research_task["task_number"]
            research_plan_text += (
                f"\n\n#### {objective_number}.{task_number}: {research_task['title']}\n{research_task_text}"
            )

    return normalize_markdown(research_plan_text)


async def generate_grant_section_texts(
    application_id: str,
    form_inputs: dict[str, str],
    grant_sections: list[GrantLongFormSection],
    research_objectives: list[ResearchObjective],
) -> dict[str, str]:
    """Generate the grant section texts for a grant application.

    Args:
        application_id: The ID of the grant application.
        form_inputs: The form inputs for the grant application.
        grant_sections: The grant sections.
        research_objectives: The research objectives for the grant application.

    Returns:
        None
    """
    section_texts: dict[str, str] = {}
    generation_groups = create_generation_groups(sections=grant_sections)

    for generation_group in generation_groups:
        results = await batched_gather(
            *[
                (
                    handle_section_text_generation(
                        application_id=application_id,
                        grant_section=section,
                        dependencies=create_dependencies_text(depends_on=section["depends_on"], texts=section_texts),
                        form_inputs=form_inputs,
                    )
                )
                if not section.get("is_detailed_workplan")
                else generate_research_plan_text(
                    application_id=application_id,
                    research_plan_section=section,
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


def generate_appliction_text(
    title: str, grant_sections: list[GrantLongFormSection], section_texts: dict[str, str]
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
        raise ValidationError("Grant application does not have a grant template or research objectives.")

    research_plan_sections = [s for s in grant_application.grant_template.grant_sections if s.get("is_research_plan")]

    if not research_plan_sections:
        raise ValidationError("Grant template does not have a research plan section.")

    section_texts = await generate_grant_section_texts(
        application_id=application_id,
        grant_sections=grant_application.grant_template.grant_sections,
        form_inputs=grant_application.form_inputs or {},
        research_objectives=grant_application.research_objectives,
    )

    application_text = generate_appliction_text(
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
