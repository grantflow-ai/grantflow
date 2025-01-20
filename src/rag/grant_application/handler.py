from asyncio import gather
from itertools import batched

from src.db.connection import get_session_maker
from src.db.json_objects import GrantSection
from src.exceptions import ValidationError
from src.rag.grant_application.generate_section_text import handle_section_text_generation
from src.rag.grant_application.research_plan_text import handle_research_plan_text_generation
from src.utils.db import retrieve_application
from src.utils.logger import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)


def create_dependencies_text(depends_on: list[str], texts: dict[str, str]) -> str:
    """Create the dependencies text.

    Args:
        depends_on: The dependencies.
        texts: The texts.

    Returns:
        The dependencies text.
    """
    if not depends_on:
        return ""

    obj = {}

    for dependency in depends_on:
        obj[dependency] = texts[dependency]

    return f"""
    Here are the texts for the sections on which this section depends on:

    {serialize(obj).decode()}
    """


def create_generation_groups(sections: list[GrantSection]) -> list[list[GrantSection]]:
    """Create the groups for LLM generation.

    - First group has no dependencies
    - Second group has dependencies in the first group
    - Third group has dependencies in the second or first group
    - ... ad infinitum

    Args:
        sections: The sections.

    Raises:
        ValueError: If a circular dependency is detected or missing sections in dependencies.

    Returns:
        The generation groups.
    """
    groups: list[list[GrantSection]] = []
    generated = set[str]()

    while len(generated) < len(sections):
        if current_group := [
            section
            for section in sections
            if section["name"] not in generated and all(dep in generated for dep in section["depends_on"])
        ]:
            groups.append(current_group)
            generated.update(section["name"] for section in current_group)
            continue

        raise ValueError("Circular dependency detected or missing sections in dependencies.")

    return groups


def populate_template_string(template: str, sections: list[GrantSection], texts: dict[str, str]) -> str:
    """Populate the template string with the generated texts.

    Args:
        template: The template string.
        sections: The sections.
        texts: The generated texts.

    Returns:
        The populated template string.
    """
    application_text = template.replace("::research_plan::", texts["research_plan"])

    for section in sections:
        application_text = application_text.replace(f"{section['name']}.title", section["title"])
        application_text = application_text.replace(f"{section['name']}.content", texts[section["name"]])

    return application_text.replace("{{", "").replace("}}", "")


async def handle_generate_grant_application_text(application_id: str) -> str:
    """Handles the generation of a grant application text.

    Args:
        application_id: The ID of the grant application.

    Raises:
        ValidationError: If the grant application does not have a grant template or research objectives.

    Returns:
        The generated grant application text.
    """
    session_maker = get_session_maker()
    grant_application = await retrieve_application(application_id=application_id, session_maker=session_maker)
    if not grant_application.grant_template or not grant_application.research_objectives:
        raise ValidationError("Grant application does not have a grant template or research objectives.")

    generation_groups = create_generation_groups(sections=grant_application.grant_template.grant_sections)

    research_plan_text = await handle_research_plan_text_generation(
        application_id=application_id,
        research_objectives=grant_application.research_objectives,
        application_details=grant_application.details or {},
    )

    logger.debug(
        "Generated research plan text for grant application %s",
        application_id=application_id,
        research_plan_text=research_plan_text,
    )

    texts: dict[str, str] = {
        "research_plan": research_plan_text,
    }

    for generation_group in generation_groups:
        for batch in batched(generation_group, 3):  # we need to avoid hitting rate limits
            results = await gather(
                *[
                    handle_section_text_generation(
                        application_id=application_id,
                        grant_section=section,
                        dependencies=create_dependencies_text(depends_on=section["depends_on"], texts=texts),
                    )
                    for section in batch
                ]
            )
            texts.update({section["name"]: result for section, result in zip(batch, results, strict=True)})
            logger.debug("Generated texts for sections.", keys=[section["name"] for section in batch])

    return populate_template_string(
        template=grant_application.grant_template.template,
        sections=grant_application.grant_template.grant_sections,
        texts=texts,
    )
