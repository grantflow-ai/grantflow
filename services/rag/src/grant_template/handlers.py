from datetime import UTC, datetime
from typing import Any

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.json_objects import CFPAnalysis, GrantElement, GrantLongFormSection
from packages.db.src.tables import GrantTemplate
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.cfp_analysis import handle_cfp_analysis
from services.rag.src.grant_template.dto import (
    CFPAnalysisStageDTO,
    StageDTO,
    TemplateGenerationStageDTO,
)
from services.rag.src.grant_template.template_generation import handle_template_generation
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
    await job_manager.ensure_not_cancelled()

    await verify_rag_sources_indexed(
        parent_id=grant_template.id,
        session_maker=session_maker,
        entity_type=GrantTemplate,
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    cfp_analysis = await handle_cfp_analysis(
        grant_template=grant_template,
        session_maker=session_maker,
        job_manager=job_manager,
        trace_id=trace_id,
    )

    organization = cfp_analysis.get("organization")
    org_name = organization["full_name"] if organization else "unknown"

    submission_date = None
    if cfp_analysis.get("deadlines"):
        try:
            submission_date = datetime.strptime(cfp_analysis["deadlines"][0], "%Y-%m-%d").replace(tzinfo=UTC).date()
        except (ValueError, IndexError):
            logger.warning("Invalid or missing deadline", extra={"trace_id": trace_id})

    await job_manager.add_notification(
        event=NotificationEvents.CFP_DATA_EXTRACTED,
        message="CFP analysis complete",
        notification_type="success",
        data={
            "organization": org_name,
            "subject": cfp_analysis["subject"][:100] if cfp_analysis["subject"] else None,
            "deadline": str(submission_date) if submission_date else None,
            "sections_count": len(cfp_analysis["sections"]),
        },
    )

    return CFPAnalysisStageDTO(
        cfp_analysis=cfp_analysis,
    )


async def handle_template_generation_stage(
    *,
    cfp_analysis_result: CFPAnalysisStageDTO,
    job_manager: JobManager[StageDTO],
    trace_id: str,
) -> TemplateGenerationStageDTO:
    await job_manager.ensure_not_cancelled()

    cfp_analysis = cfp_analysis_result["cfp_analysis"]
    organization = cfp_analysis.get("organization")

    grant_sections = await handle_template_generation(
        cfp_analysis=cfp_analysis,
        job_manager=job_manager,
        trace_id=trace_id,
    )

    await job_manager.add_notification(
        event=NotificationEvents.METADATA_GENERATED,
        message="Grant template generated",
        notification_type="success",
        data={
            "sections_created": len(grant_sections),
            "organization": organization["full_name"] if organization else "Unknown",
        },
    )

    return TemplateGenerationStageDTO(
        cfp_analysis=cfp_analysis,
        grant_sections=grant_sections,
    )


async def handle_save_grant_template(
    *,
    cfp_analysis: CFPAnalysis,
    grant_sections: list[GrantElement | GrantLongFormSection],
    grant_template: GrantTemplate,
    job_manager: JobManager[StageDTO],
    session_maker: async_sessionmaker[Any],
    trace_id: str,
) -> GrantTemplate:
    await job_manager.ensure_not_cancelled()

    try:
        async with session_maker() as session, session.begin():
            organization = cfp_analysis.get("organization")
            granting_institution_id = organization["id"] if organization else None

            submission_date = None
            if cfp_analysis.get("deadlines"):
                try:
                    submission_date = (
                        datetime.strptime(cfp_analysis["deadlines"][0], "%Y-%m-%d").replace(tzinfo=UTC).date()
                    )
                except (ValueError, IndexError):
                    logger.warning("Invalid or missing deadline", extra={"trace_id": trace_id})

            await session.execute(
                update(GrantTemplate)
                .where(GrantTemplate.id == grant_template.id)
                .values(
                    cfp_analysis=cfp_analysis,
                    grant_sections=grant_sections,
                    granting_institution_id=granting_institution_id,
                    submission_date=submission_date,
                )
            )

            logger.info(
                "Grant template saved successfully",
                grant_template_id=str(grant_template.id),
                sections_count=len(grant_sections),
                trace_id=trace_id,
            )

        await job_manager.update_job_status(RagGenerationStatusEnum.COMPLETED)
        await job_manager.add_notification(
            event=NotificationEvents.GRANT_TEMPLATE_CREATED,
            message="Grant template ready",
            notification_type="success",
            data={
                "template_id": str(grant_template.id),
                "sections_created": len(grant_sections),
                "organization": organization["full_name"] if organization else "Unknown",
            },
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
