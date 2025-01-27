from typing import Final

from src.constants import MIN_WORDS_RATIO
from src.exceptions import EvaluationError
from src.rag.grant_application.plan_research_plan_generation import ResearchObjectiveDTO, ResearchTaskDTO
from src.rag.long_form import handle_long_form_text_generation
from src.rag.retrieval import retrieve_documents
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


GENERATE_RESEARCH_PLAN_COMPONENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_plan_component_generation",
    template="""
    Your task is to write the text for a ${object_type}.

    An ${object_type} is ${object_type_description}.

    ## Generation Instructions

    Adhere to these instructions to generate the text:
        <instructions>
        ${instructions}
        </instructions>

    ## Relationships
    The are the relationships this ${object_type} has with other components:
        <relationships>
        ${relationships}
        </relationships>

    You the dependencies to ensure that the generated text is consistent with the context and information provided in the previous sections.

    ## Content Guidance

    The generated text should address (implicitly) the following guiding questions:
        <guiding_questions>
        ${guiding_questions}
        </guiding_questions>

    Use these keywords to ground the content in the specific context of the grant application:
        <keywords>
        ${keywords}
        </keywords>

    Use the part of the research plan that has already been written to ensure that the generated text is consistent with the context and information provided in the previous sections:
        <research_plan_text>
        ${research_plan_text}
        </research_plan_text>
""",
)


async def handle_generate_research_plan_component(
    *,
    application_id: str,
    component: ResearchObjectiveDTO | ResearchTaskDTO,
    research_plan_text: str,
    form_inputs: dict[str, str],
) -> str:
    """Generate the text for a given research plan component.

    Args:
        application_id: The ID of the application.
        component: The research plan component for which to generate text.
        research_plan_text: The text of the research plan section.
        form_inputs: The user inputs for the application.

    Returns:
        The generated research plan component text.
    """
    logger.debug("Generating text for section.", component=component, application_id=application_id)
    user_prompt = GENERATE_RESEARCH_PLAN_COMPONENT_USER_PROMPT.to_string(
        guiding_questions=component["guiding_questions"],
        instructions=component["instructions"],
        keywords=component["keywords"],
        relationships=component["relationships"],
        research_plan_text=research_plan_text,
        object_type="task" if component.get("task_number") else "objective",
        object_type_description="a concrete research that that is a part of a larger specific research objective"
        if component.get("task_number")
        else "a specific research goal or aim",
    )
    try:
        rag_results = await retrieve_documents(
            application_id=application_id,
            task_description=user_prompt,
            user_inputs=form_inputs,
            section_title=component["title"],
            search_queries=component["search_queries"],
        )

        result = await handle_long_form_text_generation(
            max_words=component["max_words"],
            min_words=int(component["max_words"] * MIN_WORDS_RATIO),
            prompt_identifier="generate_research_plan_component",
            rag_results=rag_results,
            task_description=user_prompt,
            user_inputs=form_inputs,
            section_title=component["title"],
        )
        logger.debug("Generated text for section.", component=component, application_id=application_id)
        return result

    except EvaluationError as e:
        logger.error("Text generation failed.", component=component, application_id=application_id, error=e)
        return (
            "**Text generation for this section failed. If this is not due to missing context data, please try again.**"
        )
