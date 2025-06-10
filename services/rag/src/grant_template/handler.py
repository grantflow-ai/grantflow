from datetime import datetime
from typing import Any, cast
from uuid import UUID

from packages.db.src.json_objects import GrantElement, GrantLongFormSection
from packages.db.src.tables import FundingOrganization, GrantTemplate, GrantTemplateRagSource, RagSource
from packages.shared_utils.src.exceptions import BackendError, DatabaseError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import RagProcessingStatus, publish_notification
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.determine_application_sections import handle_extract_sections
from services.rag.src.grant_template.determine_longform_metadata import handle_generate_grant_template
from services.rag.src.grant_template.extract_cfp_data import Content, handle_extract_cfp_data_from_rag_sources
from services.rag.src.utils.text import concat_extracted_cfp_content

logger = get_logger(__name__)


async def extract_and_enrich_sections(
    cfp_content: list[Content],
    cfp_subject: str,
    organization: FundingOrganization | None,
    parent_id: UUID,
) -> list[GrantElement | GrantLongFormSection]:
    await publish_notification(
        logger=logger,
        parent_id=parent_id,
        event="grant_template_extraction",
        data=RagProcessingStatus(
            event="grant_template_extraction",
            message="Extracting grant application sections from CFP content...",
        ),
    )
    sections = await handle_extract_sections(
        cfp_content=cfp_content,
        cfp_subject=cfp_subject,
        organization=organization,
    )

    await publish_notification(
        logger=logger,
        parent_id=parent_id,
        event="sections_extracted",
        data=RagProcessingStatus(
            event="sections_extracted",
            message="Sections extracted successfully",
            data={
                "section_count": len(sections),
                "organization": organization.full_name if organization else None,
            },
        ),
    )

    content_list = [f"{content['title']}: {'...'.join(content['subtitles'])}" for content in cfp_content]

    await publish_notification(
        logger=logger,
        parent_id=parent_id,
        event="grant_template_metadata",
        data=RagProcessingStatus(
            event="grant_template_metadata",
            message="Generating metadata for grant template sections...",
        ),
    )

    section_metadata = await handle_generate_grant_template(
        cfp_content=concat_extracted_cfp_content(content_list),
        cfp_subject=cfp_subject,
        organization=organization,
        long_form_sections=[s for s in sections if not s.get("is_title_only")],
    )

    await publish_notification(
        logger=logger,
        parent_id=parent_id,
        event="metadata_generated",
        data=RagProcessingStatus(
            event="metadata_generated",
            message="Metadata generated successfully",
            data={
                "metadata_count": len(section_metadata),
            },
        ),
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
    grant_template_id: UUID, session_maker: async_sessionmaker[Any]
) -> GrantTemplate:
    logger.info("Starting grant template generation pipeline", template_id=grant_template_id)

    await publish_notification(
        logger=logger,
        parent_id=grant_template_id,
        event="grant_template_generation_started",
        data=RagProcessingStatus(
            event="grant_template_generation_started",
            message="Starting grant template generation pipeline...",
        ),
    )

    try:
        async with session_maker() as session:
            source_ids = [
                str(source_id)
                for source_id in await session.scalars(
                    select(RagSource.id)
                    .join(GrantTemplateRagSource, RagSource.id == GrantTemplateRagSource.rag_source_id)
                    .where(GrantTemplateRagSource.grant_template_id == grant_template_id)
                )
            ]
            funding_organizations = list(
                await session.scalars(select(FundingOrganization).order_by(FundingOrganization.full_name.asc()))
            )

        organization_mapping = {
            str(org.id): {"full_name": org.full_name, "abbreviation": org.abbreviation} for org in funding_organizations
        }

        await publish_notification(
            logger=logger,
            parent_id=grant_template_id,
            event="extracting_cfp_data",
            data=RagProcessingStatus(
                event="extracting_cfp_data",
                message="Extracting data from CFP content...",
            ),
        )
        extraction_result = await handle_extract_cfp_data_from_rag_sources(
            source_ids=source_ids,
            organization_mapping=organization_mapping,
            session_maker=session_maker,
        )

        organization = (
            next(org for org in funding_organizations if str(org.id) == extraction_result["organization_id"])
            if extraction_result["organization_id"]
            else None
        )

        org_name = organization.full_name if organization else "Unknown"

        submission_date = (
            datetime.strptime(extraction_result["submission_date"], "%Y-%m-%d").date()  # noqa: DTZ007
            if extraction_result["submission_date"]
            else None
        )

        await publish_notification(
            logger=logger,
            parent_id=grant_template_id,
            event="cfp_data_extracted",
            data=RagProcessingStatus(
                event="cfp_data_extracted",
                message="CFP data extracted successfully",
                data={
                    "organization": org_name,
                    "cfp_subject": extraction_result["cfp_subject"],
                    "content_sections": len(extraction_result["content"]),
                    "submission_date": str(submission_date) if submission_date else None,
                },
            ),
        )

        logger.info("Extracted CFP data")

        grant_sections = await extract_and_enrich_sections(
            cfp_content=extraction_result["content"],
            cfp_subject=extraction_result["cfp_subject"],
            organization=organization,
            parent_id=grant_template_id,
        )

        logger.info("Extracted grant template sections")

        await publish_notification(
            logger=logger,
            parent_id=grant_template_id,
            event="saving_grant_template",
            data=RagProcessingStatus(
                event="saving_grant_template",
                message="Saving grant template to database...",
            ),
        )

    except BackendError as e:
        logger.error("Backend error in grant template generation pipeline", error=e)
        await publish_notification(
            logger=logger,
            parent_id=grant_template_id,
            event="pipeline_error",
            data=RagProcessingStatus(
                event="pipeline_error",
                message=f"Error in grant template generation: {e!s}",
                data={"error_type": e.__class__.__name__, **e.context},
            ),
        )
        raise

    async with session_maker() as session, session.begin():
        try:
            grant_template = await session.scalar(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template_id)
                .values(
                    {
                        "funding_organization_id": UUID(extraction_result["organization_id"])
                        if extraction_result["organization_id"]
                        else None,
                        "submission_date": submission_date,
                        "grant_sections": grant_sections,
                    }
                )
                .returning(GrantTemplate)
            )
            await session.commit()

            await publish_notification(
                logger=logger,
                parent_id=grant_template_id,
                event="grant_template_created",
                data=RagProcessingStatus(
                    event="grant_template_created",
                    message="Grant template created successfully",
                    data={
                        "template_id": str(grant_template.id),
                        "section_count": len(grant_sections),
                        "organization": org_name,
                    },
                ),
            )

            return cast("GrantTemplate", grant_template)
        except SQLAlchemyError as e:
            logger.error("Error generating grant template", error=e)
            await session.rollback()
            await publish_notification(
                logger=logger,
                parent_id=grant_template_id,
                event="database_error",
                data=RagProcessingStatus(
                    event="database_error",
                    message="Error generating grant template",
                    data={"error": str(e)},
                ),
            )
            raise DatabaseError("Error generating grant template", context=str(e)) from e
