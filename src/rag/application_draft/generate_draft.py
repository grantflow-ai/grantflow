from asyncio import sleep
from datetime import UTC, datetime
from string import Template
from typing import Final

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from src.db.connection import get_session_maker
from src.db.tables import GrantApplication, ResearchAim
from src.exceptions import DatabaseError
from src.rag.application_draft.research_innovation import handle_innovation_text_generation
from src.rag.application_draft.research_plan import handle_research_plan_text_generation
from src.rag.application_draft.research_significance import handle_significance_text_generation
from src.rag.application_draft.specific_aims import handle_specific_aims_text_generation
from src.utils.db import check_exists_files_being_indexed
from src.utils.logging import get_logger
from src.utils.text import normalize_markdown

logger = get_logger(__name__)

DRAFT_APPLICATION_TEMPLATE: Final[Template] = Template("""
# ${application_title}

## Research Significance

${significance_text}

## Research Innovation

${innovation_text}
## Specific Aims

${specific_aims_text}

${research_plan_text}
""")


async def generate_application_draft(*, application_id: str) -> str:
    """Generate a draft of the grant application.

    Args:
        application_id: The ID of the grant application.

    Raises:
        DatabaseError: If there was an issue updating the application draft in the database.

    Returns:
        str: The generated draft of the grant application
    """
    session_maker = get_session_maker()

    logger.info("Starting draft generation pipeline", application_id=application_id)
    while await check_exists_files_being_indexed(session_maker=session_maker, application_id=application_id):
        logger.info("Waiting for files to finish indexing")
        await sleep(2)

    logger.info("Files finished indexing, beginning text generation")

    async with session_maker() as session:
        application = await session.scalar(
            select(GrantApplication)
            .options(
                selectinload(GrantApplication.grant_application_files),
                selectinload(GrantApplication.research_aims).selectinload(ResearchAim.research_tasks),
            )
            .where(GrantApplication.id == application_id)
        )

    logger.info("Starting research plan section generation")
    research_plan_text = await handle_research_plan_text_generation(
        application_id=str(application.id),
        research_aims=application.research_aims,
        session_maker=session_maker,
    )
    logger.info("Generated research plan section")

    logger.info("Starting significance section generation")
    significance_text = await handle_significance_text_generation(
        application=application,
        research_plan_text=research_plan_text,
        session_maker=session_maker,
    )
    logger.info("Generated significance section")

    logger.info("Starting innovation section generation")
    innovation_text = await handle_innovation_text_generation(
        application=application,
        research_plan_text=research_plan_text,
        session_maker=session_maker,
        significance_text=significance_text,
    )
    logger.info("Generated innovation section")

    logger.info("Starting specific aims section generation")
    specific_aims_text = await handle_specific_aims_text_generation(
        application=application,
        innovation_text=innovation_text,
        research_plan_text=research_plan_text,
        session_maker=session_maker,
        significance_text=significance_text,
    )
    logger.info("Generated specific aims section")

    logger.info("Generating draft")
    result = normalize_markdown(
        DRAFT_APPLICATION_TEMPLATE.substitute(
            application_title=application.title,
            significance_text=significance_text,
            innovation_text=innovation_text,
            research_plan_text=research_plan_text,
            specific_aims_text=specific_aims_text,
        )
    )

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(GrantApplication)
                .values({"text": result, "completed_at": datetime.now(tz=UTC)})
                .where(GrantApplication.id == application_id)
            )
            await session.commit()
            logger.info("Draft generation result saved to database")
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Failed to update application draft.", exec_info=e)
            raise DatabaseError("Failed to update application draft", context=str(e)) from e

    logger.info("RAG pipelinecompleted successfully.", application_id=application_id)
    return result
