from asyncio import gather
from string import Template
from typing import Any, Final

from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import ResearchAim
from src.rag.application_draft_generation.preliminary_results import handle_preliminary_results_text_generation
from src.rag.application_draft_generation.research_aims import (
    handle_research_aim_description_generation,
)
from src.rag.application_draft_generation.research_plan_relations import set_relation_data
from src.rag.application_draft_generation.research_tasks import (
    handle_research_task_text_generation,
)
from src.utils.logging import get_logger

logger = get_logger(__name__)

RESEARCH_PLAN_SECTION_TEMPLATE: Final[Template] = Template("""
## Research Plan

### Research Aims

${research_aims_text}
""")

RESEARCH_AIM_TEMPLATE: Final[Template] = Template("""
#### Aim ${aim_number}: ${title}

${research_aim_description_text}

##### Preliminary Results

${preliminary_results_text}

##### Research Tasks

${research_tasks_texts}
""")


async def handle_research_plan_text_generation(
    *,
    application_id: str,
    research_aims: list[ResearchAim],
    session_maker: async_sessionmaker[Any],
) -> str:
    """Generate the text for the research aims and tasks.

    Args:
        application_id: GrantApplication,
        research_aims: The research aims to generate text for.
        session_maker: The session maker.

    Returns:
        The generated research plan text.
    """
    logger.info("Entering research plan generation phase", application_id=application_id)
    research_aim_dtos = await set_relation_data(research_aims)

    research_aim_texts: list[str] = []

    for research_aim_dto in research_aim_dtos:
        logger.info("Generated research aim", application_id=application_id, research_aim_id=research_aim_dto.id)

        research_aim_description_text = await handle_research_aim_description_generation(
            application_id=application_id,
            session_maker=session_maker,
            research_aim_dto=research_aim_dto,
        )

        preliminary_results_text = await handle_preliminary_results_text_generation(
            application_id=application_id,
            research_aim_dto=research_aim_dto,
            research_aim_description=research_aim_description_text,
            session_maker=session_maker,
        )

        research_tasks_texts = await gather(
            *[
                handle_research_task_text_generation(
                    session_maker=session_maker,
                    application_id=application_id,
                    requires_clinical_trials=research_aim_dto.requires_clinical_trials,
                    research_task_id=research_task_dto.id,
                    research_task_dto=research_task_dto,
                )
                for research_task_dto in sorted(research_aim_dto.research_tasks, key=lambda x: x.task_number)
            ]
        )

        research_aim_texts.append(
            RESEARCH_AIM_TEMPLATE.substitute(
                research_aim_description_text=research_aim_description_text,
                preliminary_results_text=preliminary_results_text,
                research_tasks_texts="\n\n".join(research_tasks_texts),
            ).strip()
        )

    logger.info("Generated research aims and tasks", application_id=application_id)

    return RESEARCH_PLAN_SECTION_TEMPLATE.substitute(research_aims_text="\n\n".join(research_aim_texts))
