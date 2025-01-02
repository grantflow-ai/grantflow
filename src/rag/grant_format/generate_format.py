from asyncio import gather, sleep
from re import Pattern
from re import compile as compile_regex
from typing import Final, cast

from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.enums import GrantSectionEnum
from src.db.tables import GrantFormat, GrantSection, SectionAspect
from src.exceptions import DatabaseError
from src.rag.grant_format.generate_section import SectionDTO, generate_section
from src.rag.grant_format.generate_template import generate_format_template
from src.utils.db import check_exists_files_being_indexed
from src.utils.logging import get_logger

TEMPLATE_VARIABLE_PATTERN: Final[Pattern[str]] = compile_regex("{{([^}]+)}}")

logger = get_logger(__name__)


async def generate_grant_format(format_id: str) -> None:
    """Generate a new grant format from user uploaded instructions.

    Args:
        format_id: The ID of the grant format.

    Raises:
        DatabaseError: If there was an issue updating the grant format in the database.

    Returns:
        None
    """
    session_maker = get_session_maker()

    logger.info("Starting grant format generation pipeline", format_id=format_id)
    while await check_exists_files_being_indexed(session_maker=session_maker, format_id=format_id):
        logger.info("Waiting for files to finish indexing")
        await sleep(2)

    logger.info("Files finished indexing, beginning text generation")
    async with session_maker() as session:
        grant_format = await session.scalar(select(GrantFormat).where(GrantFormat.id == format_id))

    logger.info("Generating grant structure")
    response = await generate_format_template(format_id=str(grant_format.id))
    template_section_labels = cast(list[GrantSectionEnum], TEMPLATE_VARIABLE_PATTERN.findall(response["template"]))
    section_data: list[SectionDTO] = await gather(
        *[generate_section(format_id=format_id, section_type=section_type) for section_type in template_section_labels]
    )

    logger.info("Extracted grant sections", template_section_labels=template_section_labels)
    async with session_maker() as session, session.begin():
        try:
            await session.execute(update(GrantFormat).where(GrantFormat.id == format_id).values(response))
            section_ids = await session.scalars(
                insert(GrantSection)
                .values(
                    [
                        {
                            "keywords": section_datum["keywords"],
                            "max_words": section_datum["max_words"],
                            "min_words": section_datum["min_words"],
                            "type": section_datum["type"],
                            "format_id": format_id,
                        }
                        for section_datum in section_data
                    ]
                )
                .returning(GrantSection.id)
            )
            await session.execute(
                insert(SectionAspect).values(
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
