from typing import Final

from src.db.json_objects import GrantSection
from src.exceptions import EvaluationError
from src.rag.retrieval import retrieve_documents
from src.rag.segmented_tool_generation import handle_segmented_text_generation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


GENERATE_SECTION_TEXT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_text_generation",
    template="""
    You are an expert grant application writer specializing in STEM fields. Your task is to write the ${section_title} section of a grant application, ensuring it is compelling, informative, and aligned with the provided instructions and context.

    ## Generation Instructions

    Adhere to these specific instructions to generate the text for this section:

    <instructions>
    ${instructions}
    </instructions>

    ## Content Guidance

    Ensure the text covers the following topics comprehensively:

    <topics>
    ${topics}
    </topics>

    Use these keywords to guide your writing and ensure the inclusion of essential concepts:

    <keywords>
    ${keywords}
    </keywords>

    ## Contextual Information

    Consider these previously written grant application sections, the content of which this section relies on:

    <dependencies>
    ${dependencies}
    </dependencies>

    ## Source Materials

    Thoroughly analyze and synthesize information from the following sources to craft a well-supported and persuasive argument:

    <user_inputs>
    ${user_inputs}
    </user_inputs>

    <rag_results>
    ${rag_results}
    </rag_results>
""",
)


async def handle_section_text_generation(
    *,
    application_id: str,
    dependencies: str,
    grant_section: GrantSection,
    user_inputs: dict[str, str],
) -> str:
    """Generate the text for a given grant section.

    Args:
        application_id: The ID of the application.
        dependencies: The dependencies of the grant section.
        grant_section: The grant section for which to generate text.
        user_inputs: The user inputs.

    Returns:
        The generated section text.
    """
    logger.debug("Generating section text.", grant_section=grant_section)

    user_prompt = GENERATE_SECTION_TEXT_USER_PROMPT.substitute(
        dependencies=dependencies if dependencies else "N/A",
        instructions=grant_section["instructions"],
        keywords=grant_section["keywords"],
        section_title=grant_section["title"],
        topics=grant_section["topics"],
        user_inputs=user_inputs,
    )
    try:
        rag_results = await retrieve_documents(
            application_id=application_id,
            user_prompt=user_prompt,
            search_queries=grant_section.get("search_queries"),
        )
    except EvaluationError as e:
        logger.error("Failed to retrieve rag results.", grant_section=grant_section, error=e)
        return "**Insufficient Context: The system determined that the available data is insufficient to generate this section.**"

    result = await handle_segmented_text_generation(
        prompt_identifier="generate_section_text",
        user_prompt=user_prompt.to_string(rag_results=rag_results),
    )
    logger.debug("Successfully generated section text.", grant_section=grant_section, text=result)
    return result
