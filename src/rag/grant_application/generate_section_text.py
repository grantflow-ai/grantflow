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
    Your task is to write the ${section_title} section of a STEM grant application.

    ## Generation Instructions
        ${instructions}

    ### Topics
    The text should draw upon and touch the following topics:
        ${topics}

    ### Keywords
    Guide your writing with the following keywords:
        ${keywords}

    ## Sources:
    ### User Inputs:
        <user_inputs>
        ${user_inputs}
        </user_inputs>

    ### Rag Results:
        <rag_results>
        ${rag_results}
        </rag_results>

    ${dependencies}
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
        dependencies=f"""
        ### Dependencies
        These are the grant application portions that already been written and on the content of which this section should rely:
        <dependencies>
        {dependencies}
        </dependencies>
        """
        if dependencies
        else "",
        instructions=grant_section["instructions"],
        keywords=grant_section["keywords"],
        section_title=grant_section["title"],
        topics=grant_section["topics"],
        user_inputs=user_inputs,
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
