from asyncio import sleep

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.db.connection import get_session_maker
from src.db.tables import GrantFormat
from src.rag.grant_format.generate_structure import generate_format_sections
from src.utils.db import check_exists_files_being_indexed
from src.utils.logging import get_logger

logger = get_logger(__name__)


async def generate_grant_format(format_id: str) -> None:
    """Generate a new grant format from user uploaded instructions.

    Args:
        format_id: The ID of the grant format.

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
        grant_format = await session.scalar(
            select(GrantFormat)
            .options(
                selectinload(GrantFormat.files),
            )
            .where(GrantFormat.id == format_id)
        )

    logger.info("Generating grant structure")
    await generate_format_sections(format_id=str(grant_format.id))
