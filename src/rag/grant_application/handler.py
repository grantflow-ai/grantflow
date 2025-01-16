from src.db.connection import get_session_maker
from src.exceptions import ValidationError
from src.rag.grant_application.research_plan_text import handle_research_plan_text_generation
from src.utils.db import retrieve_application
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def handle_generate_grant_application_text(application_id: str) -> str:
    """Handles the generation of a grant application text.

    Args:
        application_id: The ID of the grant application.

    Raises:
        ValidationError: If the grant application does not have a grant template or research objectives.

    Returns:
        The generated grant application text.
    """
    session_maker = get_session_maker()
    grant_application = await retrieve_application(application_id=application_id, session_maker=session_maker)

    if not grant_application.grant_template or not grant_application.research_objectives:
        raise ValidationError("Grant application does not have a grant template or research objectives.")

    research_plan_text = await handle_research_plan_text_generation(
        application_id=application_id,
        research_objectives=grant_application.research_objectives,
        application_details=grant_application.details or {},
    )
    logger.debug(
        "Generated research plan text for grant application %s",
        application_id=application_id,
        research_plan_text=research_plan_text,
    )
    return ""
