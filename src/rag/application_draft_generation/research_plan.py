import logging
from asyncio import gather
from string import Template
from typing import Any, Final, cast

from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import ResearchAim
from src.rag.application_draft_generation.research_aims import (
    handle_research_aim_text_generation,
)
from src.rag.application_draft_generation.research_plan_relations import set_relation_data
from src.rag.application_draft_generation.research_tasks import (
    handle_research_task_text_generation,
)

logger = logging.getLogger(__name__)

RESEARCH_PLAN_SECTION_TEMPLATE: Final[Template] = Template("""
## Research Plan

### Research Aims

${research_aims_text}
""")

RESEARCH_AIM_TEMPLATE: Final[Template] = Template("""
#### Aim ${aim_number}: ${title}

${aim_text}

##### Research Tasks

${tasks_text}
""")

RESEARCH_TASK_TEMPLATE: Final[Template] = Template("""
###### Task ${task_number}: ${title}

${task_text}
""")


async def handle_research_plan_text_generation(
    *,
    application_draft_id: str,
    application_id: str,
    research_aims: list[ResearchAim],
    session_maker: async_sessionmaker[Any],
) -> str:
    """Generate the text for the research aims and tasks.

    Args:
        application_draft_id: The ID of the grant application draft.
        application_id: GrantApplication,
        research_aims: The research aims to generate text for.
        session_maker: The session maker.

    Returns:
        The generated research plan text.
    """
    logger.info("Entering research plan generation phase for %s", application_id)
    promises = []

    research_aim_dtos = await set_relation_data(research_aims)
    for research_aim_dto in research_aim_dtos:
        promises.append(
            handle_research_aim_text_generation(
                application_draft_id=application_draft_id,
                application_id=application_id,
                research_aim_id=research_aim_dto.id,
                session_maker=session_maker,
                research_aim_dto=research_aim_dto,
            )
        )
        promises.extend(
            [
                handle_research_task_text_generation(
                    application_draft_id=application_draft_id,
                    session_maker=session_maker,
                    application_id=application_id,
                    requires_clinical_trials=research_aim_dto.requires_clinical_trials,
                    research_task_id=research_task_dto.id,
                    research_task_dto=research_task_dto,
                )
                for research_task_dto in research_aim_dto.research_tasks
            ]
        )

    logger.info("Generated research aims and tasks for application %s", application_id)
    mapped_sections = dict(cast(list[tuple[str, str]], await gather(*promises)))

    return RESEARCH_PLAN_SECTION_TEMPLATE.substitute(
        research_aims_text="\n\n".join(
            [
                RESEARCH_AIM_TEMPLATE.substitute(
                    aim_number=research_aim_dto.aim_number,
                    title=research_aim_dto.title,
                    aim_text=mapped_sections[research_aim_dto.id],
                    tasks_text="\n\n".join(
                        RESEARCH_TASK_TEMPLATE.substitute(
                            task_number=research_task.task_number,
                            title=research_task.title,
                            task_text=mapped_sections[research_task.id],
                        )
                        for research_task in research_aim_dto.research_tasks
                    ),
                )
                for research_aim_dto in research_aim_dtos
            ]
        )
    )
