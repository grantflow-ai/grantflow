from datetime import UTC, datetime
from typing import Any, cast

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.json_objects import CFPAnalysis, GrantElement, GrantLongFormSection
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantTemplate
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.src.grant_template.dto import (
    CFPAnalysisStageDTO,
    SectionExtractionStageDTO,
    StageDTO,
)
from services.rag.src.grant_template.extract_sections import handle_extract_sections
from services.rag.src.grant_template.generate_metadata import handle_generate_grant_template_metadata
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


async def handle_cfp_analysis_stage(
    *,
    grant_template: GrantTemplate,
    job_manager: JobManager[StageDTO],
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> CFPAnalysisStageDTO:
    """Handle comprehensive CFP analysis stage.

    Combines extraction, organization identification, and analysis into single operation.
    """
    await job_manager.ensure_not_cancelled()

    # Verify RAG sources are indexed
    await verify_rag_sources_indexed(
        parent_id=grant_template.id,
        session_maker=session_maker,
        entity_type=GrantTemplate,
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    # Perform comprehensive CFP analysis
    cfp_analysis = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=session_maker,
        job_manager=job_manager,
        trace_id=trace_id,
    )

    # Extract organization namespace for notifications
    organization = cfp_analysis.organization
    org_name = organization.full_name if organization else "Unknown"

    submission_date = None
    if cfp_analysis.deadline:
        try:
            submission_date = datetime.strptime(cfp_analysis.deadline, "%Y-%m-%d").replace(tzinfo=UTC).date()
        except ValueError:
            logger.warning(f"Invalid deadline format: {cfp_analysis.deadline}", trace_id=trace_id)

    await job_manager.add_notification(
        event=NotificationEvents.CFP_DATA_EXTRACTED,
        message="CFP analysis complete",
        notification_type="success",
        data={
            "organization": org_name,
            "subject": cfp_analysis.subject[:100] if cfp_analysis.subject else None,
            "deadline": str(submission_date) if submission_date else None,
            "sections_count": len(cfp_analysis.content),
            "categories_found": len(cfp_analysis.analysis_metadata.get("categories", [])),
        },
    )

    return CFPAnalysisStageDTO(
        organization=organization,
        cfp_analysis=cfp_analysis,
    )


async def handle_section_extraction_stage(
    *,
    cfp_analysis_result: CFPAnalysisStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> SectionExtractionStageDTO:
    """Handle section extraction stage using CFP analysis results."""
    await job_manager.ensure_not_cancelled()

    # Extract CFP content for section processing
    cfp_content = []
    for section in cfp_analysis_result["cfp_analysis"].content:
        cfp_content.append({
            "title": section["title"],
            "subtitles": section["subtitles"],
        })

    # Process sections using existing extract_sections handler
    extracted_sections = await handle_extract_sections(
        cfp_content=cfp_content,
        trace_id=trace_id,
        cfp_analysis=cfp_analysis_result["cfp_analysis"],
    )

    await job_manager.add_notification(
        event=NotificationEvents.SECTIONS_EXTRACTED,
        message="Section extraction complete",
        notification_type="success",
        data={
            "sections_extracted": len(extracted_sections),
            "total_requirements": sum(len(s.get("subtitles", [])) for s in cfp_analysis_result["cfp_analysis"].content),
        },
    )

    return SectionExtractionStageDTO(
        organization=cfp_analysis_result["organization"],
        cfp_analysis=cfp_analysis_result["cfp_analysis"],
        extracted_sections=extracted_sections,
    )


async def handle_generate_metadata_stage(
    *,
    section_extraction_result: SectionExtractionStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> list[GrantElement | GrantLongFormSection]:
    """Handle metadata generation stage."""
    await job_manager.ensure_not_cancelled()

    # Format CFP content for prompt
    cfp_content_str = "\n\n".join([
        f"## {section['title']}\n" + "\n".join(f"- {subtitle}" for subtitle in section['subtitles'])
        for section in section_extraction_result["cfp_analysis"].content
    ])

    grant_sections = await handle_generate_grant_template_metadata(
        cfp_content=cfp_content_str,
        organization=section_extraction_result["organization"],
        long_form_sections=section_extraction_result["extracted_sections"],
        trace_id=trace_id,
        job_manager=job_manager,
    )

    await job_manager.add_notification(
        event=NotificationEvents.TEMPLATE_GENERATED,
        message="Grant template metadata generated",
        notification_type="success",
        data={
            "sections_created": len(grant_sections),
            "organization": section_extraction_result["organization"]["full_name"] if section_extraction_result["organization"] else "Unknown",
        },
    )

    return grant_sections


async def handle_save_grant_template(
    *,
    cfp_analysis: CFPAnalysis,
    extracted_cfp: SectionExtractionStageDTO,
    grant_sections: list[GrantElement | GrantLongFormSection],
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> GrantTemplate:
    """Save grant template with CFP analysis and generated sections."""
    try:
        async with session_maker() as session, session.begin():
            # Update grant template with CFP analysis
            await session.execute(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template.id)
                .values(
                    cfp_analysis=cfp_analysis,
                    rag_generation_status=RagGenerationStatusEnum.FINISHED,
                )
            )

            # Add grant sections
            for section in grant_sections:
                section.grant_template_id = grant_template.id
                session.add(section)

            logger.info(
                "Grant template saved successfully",
                grant_template_id=str(grant_template.id),
                sections_count=len(grant_sections),
                trace_id=trace_id,
            )

        return grant_template

    except SQLAlchemyError as e:
        logger.error(
            "Failed to save grant template",
            grant_template_id=str(grant_template.id),
            error=str(e),
            trace_id=trace_id,
        )
        raise DatabaseError(f"Failed to save grant template: {e}") from e