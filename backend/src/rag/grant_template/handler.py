from typing import cast
from uuid import UUID

from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.json_objects import GrantElement, GrantLongFormSection
from src.db.tables import FundingOrganization, GrantTemplate
from src.exceptions import DatabaseError
from src.rag.grant_template.determine_application_sections import handle_extract_sections
from src.rag.grant_template.determine_longform_metadata import handle_generate_grant_template
from src.rag.grant_template.extract_cfp_data import Content, handle_extract_cfp_data
from src.utils.logger import get_logger
from src.utils.text import concat_extracted_cfp_content

logger = get_logger(__name__)


async def extract_and_enrich_sections(
    cfp_content: list[Content],
    cfp_subject: str,
    organization: FundingOrganization | None,
) -> list[GrantElement | GrantLongFormSection]:
    sections = await handle_extract_sections(
        cfp_content=cfp_content,
        cfp_subject=cfp_subject,
        organization=organization,
    )

    content_list = [f"{content['title']}: {'...'.join(content['subtitles'])}" for content in cfp_content]
    section_metadata = await handle_generate_grant_template(
        cfp_content=concat_extracted_cfp_content(content_list),
        cfp_subject=cfp_subject,
        organization=organization,
        long_form_sections=[s for s in sections if not s.get("is_title_only")],
    )

    mapped_metadata = {metadata["id"]: metadata for metadata in section_metadata}

    ret: list[GrantElement | GrantLongFormSection] = []
    for section in sections:
        if section.get("is_title_only"):
            ret.append(
                GrantElement(
                    id=section["id"],
                    order=section["order"],
                    parent_id=section.get("parent_id"),
                    title=section["title"],
                )
            )
        else:
            metadata = mapped_metadata[section["id"]]
            ret.append(
                GrantLongFormSection(
                    depends_on=metadata["depends_on"],
                    generation_instructions=metadata["generation_instructions"],
                    id=section["id"],
                    is_clinical_trial=section.get("is_clinical_trial", False),
                    is_detailed_workplan=section.get("is_detailed_workplan", False),
                    keywords=metadata["keywords"],
                    max_words=metadata["max_words"],
                    order=section["order"],
                    parent_id=section.get("parent_id"),
                    search_queries=metadata["search_queries"],
                    title=section["title"],
                    topics=metadata["topics"],
                )
            )

    return ret


async def grant_template_generation_pipeline_handler(
    *,
    application_id: str | UUID,
    cfp_content: str,
) -> GrantTemplate:
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
    grant_sections = await extract_and_enrich_sections(
        cfp_content=extraction_result["content"],
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
                        "grant_sections": grant_sections,
                    }
                )
                .returning(GrantTemplate)
            )
            await session.commit()
            return cast("GrantTemplate", grant_template)
        except SQLAlchemyError as e:
            logger.error("Error generating grant template", error=e)
            await session.rollback()
            raise DatabaseError("Error generating grant template", context=str(e)) from e
