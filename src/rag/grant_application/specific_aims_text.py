from typing import Final

from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_segmented_text_generation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

SPECIFIC_AIMS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="specific_aims_generation",
    template="""
Your task is to write the "Specific Aims" section for a research grant application.

Use the following sources to write the text:

1. The full text of the research plan, detailing all the research aims and tasks in the application:
    <research_plan_text>
    ${research_plan_text}
    </research_plan_text>

2. The introductory text of the grant application:
    <intro_text>
    ${intro_text}
    </intro_text>

The Specific Aims section should clearly and concisely outline the purpose and goals of the proposed research.
It should be one page long (400-500 words) and it should address the following implicit questions:

1. What is the long-term goal of this research?
2. What critical gap in knowledge or problem does this project address?
3. What are the measurable objectives (Specific Aims) of the research?
4. If applicable, what hypotheses are being tested?
5. How will achieving these aims impact the field or address the stated problem?

Ensure that the Specific Aims section:
- Address an important and significant problem in the field.
- Are structured to provide value regardless of the outcome (e.g., designing aims where multiple outcomes are of interest).
- Are tied to a central hypothesis (or hypotheses) to maintain a cohesive theme.
- Clearly aligns with the project's overall significance, innovation, and feasibility.
- Demonstrate potential to advance the field with new discoveries or insights.
- Includes clear endpoints that reviewers can readily assess.
- Reflect a high level of clarity, innovation, and feasibility to engage reviewers effectively.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~400-500 words).
""",
)


async def handle_specific_aims_text_generation(
    *,
    application_id: str,
    intro_text: str,
    research_plan_text: str,
) -> str:
    """Generate the text for a research aim.

    Args:
        application_id: The ID of the grant application.
        intro_text: The text of the introduction section
        research_plan_text: The text of the research plan section.

    Returns:
        The generated section text.
    """
    user_prompt = SPECIFIC_AIMS_USER_PROMPT.substitute(
        research_plan_text=research_plan_text,
        intro_text=intro_text,
    )
    rag_results = await retrieve_documents(
        application_id=application_id,
        user_prompt=user_prompt,
    )
    result = await handle_segmented_text_generation(
        prompt_identifier="specific-aims",
        messages=user_prompt.to_string(rag_results=rag_results),
    )
    logger.debug("Successfully enerated Specific Aims text.", text=result)
    return result
