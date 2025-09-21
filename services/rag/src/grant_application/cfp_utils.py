from typing import Any
from uuid import UUID

from packages.db.src.json_objects import CFPSectionAnalysis
from packages.db.src.tables import GrantTemplate
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


async def get_cfp_analysis_for_template(
    grant_template: GrantTemplate | None,
    application_id: str | UUID,
) -> CFPSectionAnalysis | None:
    if not grant_template:
        return None

    cfp_analysis = grant_template.cfp_analysis

    if cfp_analysis:
        logger.info(
            "CFP analysis found for grant template",
            application_id=str(application_id),
            template_id=str(grant_template.id),
            sections_count=len(cfp_analysis.get("section_requirements", [])),
            constraints_count=len(cfp_analysis.get("length_constraints", [])),
            criteria_count=len(cfp_analysis.get("evaluation_criteria", [])),
        )
    else:
        logger.debug(
            "No CFP analysis found for grant template",
            application_id=str(application_id),
            template_id=str(grant_template.id),
        )

    return cfp_analysis


async def get_cfp_analysis_by_template_id(
    template_id: UUID,
    application_id: str | UUID,
    session_maker: async_sessionmaker[Any],
) -> CFPSectionAnalysis | None:
    async with session_maker() as session:
        grant_template = await session.scalar(select(GrantTemplate).where(GrantTemplate.id == template_id))
        return await get_cfp_analysis_for_template(grant_template, application_id)
