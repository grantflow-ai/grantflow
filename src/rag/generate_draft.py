import logging
from asyncio import sleep
from datetime import UTC, datetime
from string import Template
from typing import Final
from uuid import UUID

from inflection import titleize
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from src.db.connection import get_session_maker
from src.db.tables import ApplicationDraft, GrantApplication, GrantCfp, ResearchAim
from src.exceptions import DatabaseError
from src.rag.application_draft_generation.enrich_aims_and_tasks_with_relationships import (
    enrich_research_aims_and_tasks_with_relationship_information,
)
from src.rag.application_draft_generation.research_innovation import handle_innovation_text_generation
from src.rag.application_draft_generation.research_plan import handle_research_plan_text_generation
from src.rag.application_draft_generation.research_significance import handle_significance_text_generation
from src.rag.application_draft_generation.specific_aims import handle_specific_aims_text_generation
from src.utils.db import check_exists_files_being_indexed
from src.utils.text import normalize_markdown

logger = logging.getLogger(__name__)
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


async def generate_application_draft(*, application_id: UUID, application_draft_id: UUID) -> str:
    """Generate a draft of the grant application.

    Args:
        application_id: The ID of the grant application.
        application_draft_id: The ID of the grant application draft.

    Raises:
        DatabaseError: If there was an issue updating the application draft in the database.

    Returns:
        str: The generated draft of the grant application
    """
    session_maker = get_session_maker()

    while await check_exists_files_being_indexed(session_maker=session_maker, application_id=application_id):
        await sleep(2)

    async with session_maker() as session:
        application = await session.scalar(
            select(GrantApplication)
            .options(
                selectinload(GrantApplication.cfp).selectinload(GrantCfp.funding_organization),
                selectinload(GrantApplication.application_files),
                selectinload(GrantApplication.research_aims).selectinload(ResearchAim.research_tasks),
            )
            .where(GrantApplication.id == application_id)
        )

    if any(research_aim.relations is None for research_aim in application.research_aims):
        await enrich_research_aims_and_tasks_with_relationship_information(
            session_maker=session_maker,
            research_aims=application.research_aims,
        )

    research_plan_text = await handle_research_plan_text_generation(
        application=application,
        application_draft_id=str(application_draft_id),
        session_maker=session_maker,
    )

    significance_text = await handle_significance_text_generation(
        application=application,
        application_draft_id=str(application_draft_id),
        research_plan_text=research_plan_text,
        session_maker=session_maker,
    )

    logger.debug("Generated significance section: %s", significance_text)

    innovation_text = await handle_innovation_text_generation(
        application=application,
        application_draft_id=str(application_draft_id),
        research_plan_text=research_plan_text,
        session_maker=session_maker,
        significance_text=significance_text,
    )

    logger.debug("Generated innovation section: %s", innovation_text)

    specific_aims_text = await handle_specific_aims_text_generation(
        application=application,
        application_draft_id=str(application_draft_id),
        innovation_text=innovation_text,
        research_plan_text=research_plan_text,
        session_maker=session_maker,
        significance_text=significance_text,
    )
    logger.debug("Generated specific aims section: %s", specific_aims_text)

    result = normalize_markdown(
        DRAFT_APPLICATION_TEMPLATE.substitute(
            application_title=titleize(application.title),
            significance_text=significance_text,
            innovation_text=innovation_text,
            research_plan_text=research_plan_text,
            specific_aims_text=specific_aims_text,
        )
    )

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(ApplicationDraft)
                .values({"text": result, "completed_at": datetime.now(tz=UTC)})
                .where(ApplicationDraft.id == application_draft_id)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Failed to update application draft: %s", e)
            raise DatabaseError("Failed to update application draft") from e

    return result
