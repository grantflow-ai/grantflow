import logging
from string import Template
from typing import Final

from inflection import titleize

from src.db.tables import GrantApplication
from src.rag.application_draft_generation.research_innovation import handle_innovation_text_generation
from src.rag.application_draft_generation.research_plan import handle_research_plan_text_generation
from src.rag.application_draft_generation.research_significance import handle_significance_text_generation
from src.rag.application_draft_generation.specific_aims import handle_specific_aims_text_generation
from src.utils.text import normalize_markdown
from src.utils.ws import NotificationSender

logger = logging.getLogger(__name__)

DRAFT_APPLICATION_TEMPLATE: Final[Template] = Template("""
# ${application_title}

## Research Significance

${significance_text}

## Research Innovation

${innovation_text}
## Specific Aims

${specific_aims_text}

${research_plan_text}
""")


async def generate_application_draft(*, application: GrantApplication, notification_sender: NotificationSender) -> str:
    """Generate a draft of the grant application.

    Args:
        application: The grant application.
        notification_sender: A function to send notifications to the frontend via websocket or SSE.

    Returns:
        str: The generated draft of the grant application
    """
    research_plan_text = await handle_research_plan_text_generation(
        application_id=str(application.id),
        research_aims=application.research_aims,
        notification_sender=notification_sender,
    )
    logger.debug("Generated research plan section: %s", research_plan_text)

    significance_text = await handle_significance_text_generation(
        application_id=str(application.id),
        application_title=application.title,
        cfp_title=application.cfp.title,
        grant_funding_organization=application.cfp.funding_organization.name,
        research_plan_text=research_plan_text,
        significance_description=application.significance,
    )
    await notification_sender.info("Generated the Research Significance section.")
    logger.debug("Generated significance section: %s", significance_text)

    innovation_text = await handle_innovation_text_generation(
        application_id=str(application.id),
        innovation_description=application.innovation,
        research_plan_text=research_plan_text,
        significance_text=significance_text,
    )
    await notification_sender.info("Generated the Research Innovation section.")
    logger.debug("Generated innovation section: %s", innovation_text)

    specific_aims_text = await handle_specific_aims_text_generation(
        application_id=str(application.id),
        innovation_text=innovation_text,
        research_plan_text=research_plan_text,
        significance_text=significance_text,
    )
    await notification_sender.info("Generated the Specific Aims section.")
    logger.debug("Generated specific aims section: %s", specific_aims_text)

    return normalize_markdown(
        DRAFT_APPLICATION_TEMPLATE.substitute(
            application_title=titleize(application.title),
            significance_text=significance_text,
            innovation_text=innovation_text,
            research_plan_text=research_plan_text,
            specific_aims_text=specific_aims_text,
        )
    )
