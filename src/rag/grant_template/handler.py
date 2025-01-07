from asyncio import sleep

from sqlalchemy import insert, update
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.tables import GrantSection, GrantTemplate, SectionTopic
from src.exceptions import DatabaseError
from src.rag.grant_template.prompt import generate_grant_template
from src.utils.db import check_exists_files_being_indexed
from src.utils.logging import get_logger

logger = get_logger(__name__)


async def handle_generate_grant_template(*, cfp_content: str, grant_template_id: str, organization_id: str) -> None:
    """Generate a new grant template from user uploaded instructions.

    Args:
        cfp_content: The extracted content of a grant CFP.
        grant_template_id: The ID of the grant template to update.
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

    logger.info("Files finished indexing, beginning template generation")
    response = await generate_grant_template(cfp_content=cfp_content, organization_id=grant_template_id)

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template_id)
                .values(
                    {
                        "name": response["name"],
                        "template": response["template"],
                    }
                )
            )
            section_ids = await session.scalars(
                insert(GrantSection)
                .values(
                    [
                        {
                            "search_terms": section_dto["search_terms"],
                            "max_words": section_dto.get("max_words"),
                            "min_words": section_dto.get("min_words"),
                            "type": section_dto["type"],
                            "grant_template_id": grant_template_id,
                        }
                        for section_dto in response["sections"]
                    ]
                )
                .returning(GrantSection.id)
            )
            await session.execute(
                insert(SectionTopic).values(
                    [
                        {
                            "type": section_topic_dto["type"],
                            "weight": section_topic_dto["weight"],
                            "grant_section_id": section_id,
                        }
                        for section_id, section_dto in zip(section_ids, response["sections"], strict=True)
                        for section_topic_dto in section_dto["topics"]
                    ]
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            logger.error("Error while saving generated sections.", exec_info=e)
            await session.rollback()
            raise DatabaseError("Error while saving generated sections", context=str(e)) from e
