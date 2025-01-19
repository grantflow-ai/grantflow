from typing import Final

from src.db.json_objects import GrantSection
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_segmented_text_generation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


GENERATE_SECTION_TEXT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_text_generation",
    template="""
    Your task is to write the text to fill out an application.

    Source data:
    This is the JSON information for the section that should be filled.
        <section>
        ${section}
        </section>

    Here are RAG results on which you should base your writing.
        <rag_results>
        ${rag_results}
        </rag_results>
""",
)


async def handle_section_text_generation(
    *,
    application_id: str,
    grant_section: GrantSection,
) -> str:
    """Generate the text for a given grant section.

    Args:
        application_id: The ID of the application.
        grant_section: The grant section for which to generate text.

    Returns:
        The generated section text.
    """
    logger.debug("Generating section text.", grant_section=grant_section)

    user_prompt = GENERATE_SECTION_TEXT_USER_PROMPT.substitute(section=grant_section)
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
