import logging
from string import Template
from typing import Final

from inflection import titleize

from src.rag_backend.application_draft_generation.research_innovation import handle_innovation_text_generation
from src.rag_backend.application_draft_generation.research_plan import handle_research_plan_text_generation
from src.rag_backend.application_draft_generation.research_significance import handle_significance_text_generation
from src.rag_backend.dto import ResearchAimDTO
from src.utils.text import strip_lines

logger = logging.getLogger(__name__)

DRAFT_APPLICATION_TEMPLATE: Final[Template] = Template("""
# ${application_title}

## Research Significance

${significance_text}

## Research Innovation

${innovation_text}

${research_plan_text}
""")


async def generate_application_draft(
    *,
    application_id: str,
    application_title: str,
    cfp_title: str,
    grant_funding_organization: str,
    innovation_description: str,
    innovation_id: str,
    research_aims: list[ResearchAimDTO],
    significance_description: str,
    significance_id: str,
    workspace_id: str,
) -> str:
    """Generate a draft of the grant application.

    Args:
        application_id: The ID of the grant application.
        application_title: The title of the grant application.
        cfp_title: The CFP action code and title.
        grant_funding_organization: The funding organization for the grant.
        innovation_description: The description of the research innovation.
        innovation_id: The ID of the research innovation.
        research_aims: The research aims for the grant application.
        significance_description: The description of the research significance.
        significance_id: The ID of the research significance.
        workspace_id: The workspace ID.

    Returns:
        str: The generated draft of the grant application
    """
    research_plan_text = await handle_research_plan_text_generation(
        application_id=application_id,
        research_aims=research_aims,
        workspace_id=workspace_id,
    )
    logger.debug("Generated research plan section: %s", research_plan_text)

    significance_text = await handle_significance_text_generation(
        application_id=application_id,
        application_title=application_title,
        cfp_title=cfp_title,
        grant_funding_organization=grant_funding_organization,
        significance_description=significance_description,
        significance_id=significance_id,
        workspace_id=workspace_id,
        research_plan_text=research_plan_text,
    )
    logger.debug("Generated significance section: %s", significance_text)

    innovation_text = await handle_innovation_text_generation(
        innovation_description=innovation_description,
        innovation_id=innovation_id,
        significance_text=significance_text,
        workspace_id=workspace_id,
        application_id=application_id,
        research_plan_text=research_plan_text,
    )
    logger.debug("Generated innovation section: %s", innovation_text)

    return strip_lines(
        DRAFT_APPLICATION_TEMPLATE.substitute(
            application_title=titleize(application_title),
            significance_text=significance_text,
            innovation_text=innovation_text,
            research_plan_text=research_plan_text,
        )
    )
