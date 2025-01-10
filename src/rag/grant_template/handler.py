from typing import cast
from uuid import UUID

from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.tables import FundingOrganization, GrantTemplate
from src.exceptions import DatabaseError
from src.rag.grant_template.extract_cfp_data import extract_cfp_data
from src.rag.grant_template.generate_template_data import generate_grant_template
from src.utils.logging import get_logger

logger = get_logger(__name__)


async def handle_generate_grant_template(
    *,
    application_id: str | UUID,
    cfp_content: str,
) -> GrantTemplate:
    """Generate a new grant template from user uploaded instructions.

    Args:
        application_id: The application ID.
        cfp_content: The extracted content of a grant CFP.

    Raises:
        DatabaseError: If there was an issue generating the grant template in the database.

    Returns:
        The generated grant template.
    """
    session_maker = get_session_maker()
    logger.info("Starting grant template generation pipeline")

    async with session_maker() as session:
        funding_organizations = list(
            await session.scalars(select(FundingOrganization).order_by(FundingOrganization.full_name.asc))
        )

    organization_mapping = {
        org.id: {"full_name": org.full_name, "abbreviation": org.abbreviation} for org in funding_organizations
    }

    extraction_result = await extract_cfp_data(cfp_content=cfp_content, organization_mapping=organization_mapping)
    result = await generate_grant_template(
        cfp_content=extraction_result["content"], organization_id=extraction_result["organization_id"]
    )
    logger.info("Generated grant template", response=result)

    async with session_maker() as session, session.begin():
        try:
            grant_template = await session.scalar(
                insert(GrantTemplate)
                .values(
                    {
                        "grant_application_id": application_id,
                        "template": result["template"],
                        "grant_sections": result["sections"],
                        "funding_organization_id": extraction_result["organization_id"],
                    }
                )
                .returning(GrantTemplate)
            )
            session.add(grant_template)
            await session.commit()
            return cast(GrantTemplate, grant_template)
        except SQLAlchemyError as e:
            logger.error("Error generating grant template", error=e)
            await session.rollback()
            raise DatabaseError("Error generating grant template", context=str(e)) from e
