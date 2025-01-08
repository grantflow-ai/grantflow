from sqlalchemy import select

from src.db.connection import get_session_maker
from src.db.tables import FundingOrganization
from src.dto import GrantTemplateDTO
from src.rag.grant_template.extract_cfp_data import extract_cfp_data
from src.rag.grant_template.generate_template_data import generate_grant_template
from src.utils.logging import get_logger

logger = get_logger(__name__)


async def handle_generate_grant_template(cfp_content: str) -> GrantTemplateDTO:
    """Generate a new grant template from user uploaded instructions.

    Args:
        cfp_content: The extracted content of a grant CFP.

    Returns:
        None
    """
    session_maker = get_session_maker()
    logger.info("Starting grant template generation pipeline")

    async with session_maker() as session:
        funding_organizations = list(
            await session.scalars(select(FundingOrganization).order_by(FundingOrganization.name.asc))
        )

    organization_mapping = {org.id: org.name for org in funding_organizations}

    extraction_result = await extract_cfp_data(cfp_content=cfp_content, organization_mapping=organization_mapping)
    result = await generate_grant_template(
        cfp_content=extraction_result["content"], organization_id=extraction_result["organization_id"]
    )
    logger.info("Generated grant template", response=result)
    return result
