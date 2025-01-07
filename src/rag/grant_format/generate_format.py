from asyncio import gather, sleep
from re import Pattern
from re import compile as compile_regex
from typing import Final, cast

from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.enums import GrantSectionEnum
from src.db.tables import GrantSection, GrantTemplate, SectionTopic
from src.exceptions import DatabaseError
from src.rag.grant_format.generate_section import SectionDTO, generate_section
from src.rag.grant_format.generate_template import generate_format_template
from src.utils.db import check_exists_files_being_indexed
from src.utils.logging import get_logger

TEMPLATE_VARIABLE_PATTERN: Final[Pattern[str]] = compile_regex("{{([^}]+)}}")

logger = get_logger(__name__)


async def generate_grant_format(organization_id: str) -> None:
    """Generate a new grant template from user uploaded instructions.

    Args:
        organization_id: The organization ID to generate the grant template for.

    Raises:
        DatabaseError: If there was an issue updating the grant template in the database.

    Returns:
        None
    """
    session_maker = get_session_maker()

    logger.info("Starting grant template generation pipeline", organization_id=organization_id)
    while await check_exists_files_being_indexed(session_maker=session_maker, organization_id=organization_id):
        logger.info("Waiting for files to finish indexing")
        await sleep(2)

    logger.info("Files finished indexing, beginning text generation")
    async with session_maker() as session:
        grant_format = await session.scalar(select(GrantTemplate).where(GrantTemplate.id == organization_id))

    logger.info("Generating template structure")
    response = await generate_format_template(organization_id=str(grant_format.id))
    template_section_labels = cast(list[GrantSectionEnum], TEMPLATE_VARIABLE_PATTERN.findall(response["template"]))
    section_data: list[SectionDTO] = await gather(
        *[
            generate_section(organization_id=organization_id, section_type=section_type)
            for section_type in template_section_labels
        ]
    )

    logger.info("Extracted grant sections", template_section_labels=template_section_labels)
    async with session_maker() as session, session.begin():
        try:
            await session.execute(update(GrantTemplate).where(GrantTemplate.id == organization_id).values(response))
            section_ids = await session.scalars(
                insert(GrantSection)
                .values(
                    [
                        {
                            "keywords": section_datum["keywords"],
                            "max_words": section_datum["max_words"],
                            "min_words": section_datum["min_words"],
                            "type": section_datum["type"],
                            "template_id": organization_id,
                        }
                        for section_datum in section_data
                    ]
                )
                .returning(GrantSection.id)
            )
            await session.execute(
                insert(SectionTopic).values(
                    [
                        {
                            "type": aspect_datum["type"],
                            "weight": aspect_datum["weight"],
                            "section_id": section_id,
                        }
                        for section_id, section_datum in zip(section_ids, section_data, strict=False)
                        for aspect_datum in section_datum["aspects"]
                    ]
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            logger.error("Error while saving generated sections.", exec_info=e)
            await session.rollback()
            raise DatabaseError("Error while saving generated sections", context=str(e)) from e
