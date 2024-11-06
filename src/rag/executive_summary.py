import logging
from functools import partial

from src.rag.dto import GenerationResult
from src.rag.prompts import (
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
    EXECUTIVE_SUMMARY_SYSTEM_PROMPT,
    EXECUTIVE_SUMMARY_USER_PROMPT,
)
from src.rag.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)


async def generate_executive_summary_text(
    previous_part_text: str | None,
    application_title: str,
    grant_funding_organization: str,
    cfp_title: str,
    application_text: str,
) -> GenerationResult:
    """Generate a part of the executive summary text.

    Args:
        previous_part_text: The previous part of the executive summary text, if any.
        application_title: The title of the grant application.
        grant_funding_organization: The name of the funding organization.
        cfp_title: The CFP action code and title.
        application_text: The complete text of the grant application.

    Returns:
        GenerationResult: The generated text for the executive summary section.
    """
    system_prompt = EXECUTIVE_SUMMARY_SYSTEM_PROMPT.format(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = EXECUTIVE_SUMMARY_USER_PROMPT.format(
        application_title=application_title,
        grant_funding_organization=grant_funding_organization,
        cfp_title=cfp_title,
        application_text=application_text,
        previous_part_text=previous_part_text,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def generate_executive_summary(
    *,
    application_title: str,
    grant_funding_organization: str,
    cfp_title: str,
    application_text: str,
    workspace_id: str,
) -> str:
    """Generate the executive summary for a grant application.

    Args:
        application_title: The title of the grant application.
        grant_funding_organization: The name of the funding organization.
        cfp_title: The CFP action code and title.
        application_text: The complete text of the grant application.
        workspace_id: The workspace ID.

    Returns:
        The generated executive summary text.
    """
    handler = partial(
        generate_executive_summary_text,
        application_title=application_title,
        grant_funding_organization=grant_funding_organization,
        cfp_title=cfp_title,
        application_text=application_text,
    )

    executive_summary = await handle_segmented_text_generation(
        entity_type="executive_summary",
        entity_identifier=workspace_id,
        prompt_handler=handler,
    )
    logger.info("Generated executive summary")

    return executive_summary
