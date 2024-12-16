import logging
from asyncio import gather
from string import Template
from typing import Any, Final, cast

from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import GrantApplication
from src.rag.application_draft_generation.research_aims import (
    handle_research_aim_text_generation,
)
from src.rag.application_draft_generation.research_tasks import (
    handle_research_task_text_generation,
)
from src.rag.dto import ResearchAimDTO, ResearchTaskDTO

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
    application: GrantApplication,
    application_draft_id: str,
    session_maker: async_sessionmaker[Any],
) -> str:
    """Generate the text for the research aims and tasks.

    Args:
        application: The grant application.
        application_draft_id: The ID of the grant application draft.
        session_maker: The session maker.

    Returns:
        The generated research plan text.
    """
    promises = []

    for research_aim in application.research_aims:
        promises.append(
            handle_research_aim_text_generation(
                application_draft_id=application_draft_id,
                application_id=str(application.id),
                research_aim_id=str(research_aim.id),
                session_maker=session_maker,
                research_aim_dto=ResearchAimDTO(
                    aim_number=research_aim.aim_number,
                    description=research_aim.description,
                    requires_clinical_trials=research_aim.requires_clinical_trials,
                    title=research_aim.title,
                    relations=research_aim.relations or [],
                    research_tasks=[
                        ResearchTaskDTO(
                            description=research_task.description,
                            task_number=f"{research_aim.aim_number}.{research_task.task_number}",
                            title=research_task.title,
                            relations=research_task.relations or [],
                        )
                        for research_task in research_aim.research_tasks
                    ],
                ),
            )
        )
        promises.extend(
            handle_research_task_text_generation(
                application_draft_id=application_draft_id,
                session_maker=session_maker,
                application_id=str(application.id),
                requires_clinical_trials=research_aim.requires_clinical_trials,
                research_task_id=str(research_task.id),
                research_task_dto=ResearchTaskDTO(
                    description=research_task.description,
                    task_number=f"{research_aim.aim_number}.{research_task.task_number}",
                    title=research_task.title,
                    relations=research_task.relations or [],
                ),
            )
            for research_task in research_aim.research_tasks
        )

    mapped_sections = dict(cast(list[tuple[str, str]], await gather(*promises)))

    logger.info("Generated research aims and tasks for application %s", application.id)

    return RESEARCH_PLAN_SECTION_TEMPLATE.substitute(
        research_aims_text="\n\n".join(
            [
                RESEARCH_AIM_TEMPLATE.substitute(
                    aim_number=research_aim.aim_number,
                    title=research_aim.title,
                    aim_text=mapped_sections[str(research_aim.id)],
                    tasks_text="\n\n".join(
                        RESEARCH_TASK_TEMPLATE.substitute(
                            task_number=f"{research_aim}.{research_task.task_number}",
                            title=research_task.title,
                            task_text=mapped_sections[str(research_task.id)],
                        )
                        for research_task in research_aim.research_tasks
                    ),
                )
                for research_aim in application.research_aims
            ]
        )
    )
