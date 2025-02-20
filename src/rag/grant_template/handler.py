from typing import cast
from uuid import UUID

from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.json_objects import GrantSection
from src.db.tables import FundingOrganization, GrantTemplate
from src.exceptions import DatabaseError
from src.rag.grant_template.extract_cfp_data import handle_extract_cfp_data
from src.rag.grant_template.extract_sections import handle_extract_sections
from src.rag.grant_template.generate_grant_template import handle_generate_grant_template
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def extract_and_enrich_sections(
    cfp_content: str,
    cfp_subject: str,
    organization: FundingOrganization | None,
) -> list[GrantSection]:
    """Extract and enrich the sections from the grant CFP content.

    Args:
        cfp_content: The content of the grant CFP.
        cfp_subject: The subject of the grant CFP.
        organization: The funding organization.

    Returns:
        The extracted and enriched sections.
    """
    sections = await handle_extract_sections(
        cfp_content=cfp_content,
        cfp_subject=cfp_subject,
        organization=organization,
    )

    # Ensure that all sections have valid parents and dependencies after we filter out non-core research sections
    valid_parents = {s["id"] for s in sections}
    for section in sections:
        if section["parent_id"] not in valid_parents:
            section["parent_id"] = None
        if not section.get("is_title_only"):
            section["is_title_only"] = False

    results = await handle_generate_grant_template(
        cfp_content=cfp_content,
        organization=organization,
        core_narrative_sections=[s for s in sections if not s.get("is_title_only")],
    )
    # TODO: recombine the sections with the parts.


async def grant_template_generation_pipeline_handler(
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
            await session.scalars(select(FundingOrganization).order_by(FundingOrganization.full_name.asc()))
        )

    organization_mapping = {
        str(org.id): {"full_name": org.full_name, "abbreviation": org.abbreviation} for org in funding_organizations
    }

    extraction_result = await handle_extract_cfp_data(
        cfp_content=cfp_content, organization_mapping=organization_mapping
    )
    organization = (
        next(org for org in funding_organizations if org.id == extraction_result["organization_id"])
        if extraction_result["organization_id"]
        else None
    )

    logger.info("Extracted CFP data")

    enriched_sections = await extract_and_enrich_sections(
        cfp_content="...".join(extraction_result["content"]),
        cfp_subject=extraction_result["cfp_subject"],
        organization=organization,
    )
    logger.info("Extracted grant template sections")

    async with session_maker() as session, session.begin():
        try:
            grant_template = await session.scalar(
                insert(GrantTemplate)
                .values(
                    {
                        "funding_organization_id": extraction_result["organization_id"],
                        "grant_application_id": application_id,
                        "grant_sections": enriched_sections,
                    }
                )
                .returning(GrantTemplate)
            )
            await session.commit()
            return cast(GrantTemplate, grant_template)
        except SQLAlchemyError as e:
            logger.error("Error generating grant template", error=e)
            await session.rollback()
            raise DatabaseError("Error generating grant template", context=str(e)) from e
