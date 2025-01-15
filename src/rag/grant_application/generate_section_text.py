from typing import Final

from src.db.json_objects import ApplicationDetails, GrantSection
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_segmented_text_generation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

GENERATE_SECTION_TEXT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_text_generation",
    template="""
    You are an expert grant application writer specializing in STEM fields. Your task is to write the ${humanized_section_name} section for a research grant application.

    The ${humanized_section_name} section should provide a detailed description of the research plan, including the following key elements:
    """,
)


async def handle_section_text_generation(
    *, application_id: str, grant_section: GrantSection, application_details: ApplicationDetails
) -> str:
    """Generate the text for a given grant section.

    Args:
        application_id: The ID of the grant application.
        grant_section: The grant section to generate text for.
        application_details: The application details.

    Returns:
        The generated section text.
    """
    user_prompt = GENERATE_SECTION_TEXT_USER_PROMPT.substitute(
        research_plan_text=grant_section,
        application_details=application_details,
    )
    rag_results = await retrieve_documents(
        application_id=application_id,
        user_prompt=user_prompt,
    )
    result = await handle_segmented_text_generation(
        prompt_identifier="generate_section_text",
        messages=user_prompt.to_string(rag_results=rag_results),
    )
    logger.debug("Successfully generated section text.", grant_section=grant_section, text=result)
    return result
