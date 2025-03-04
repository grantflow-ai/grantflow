from typing import Any, Final

from src.constants import MIN_WORDS_RATIO
from src.rag.grant_application.dto import ResearchComponentGenerationDTO
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.long_form import generate_long_form_text
from src.rag.retrieval import retrieve_documents
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


GENERATE_WORK_COMPONENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="work_component_generation",
    template="""
    Your task is to write the text for a ${object_type} in a grant application work plan.

    An ${object_type} is ${object_type_description}. This component must be scientifically accurate, methodologically sound, and demonstrate a clear scientific contribution to the field. The text will be evaluated by scientific experts and must balance technical precision with clarity.

    ## Generation Instructions

    Adhere to these instructions to generate the text:
        <instructions>
        ${instructions}
        </instructions>

    ## Relationships
    These are the relationships this ${object_type} has with other components:
        <relationships>
        ${relationships}
        </relationships>

    Use these relationships to ensure that the generated text is consistent with the context and information provided in the previous sections.

    ## Content Guidance

    The generated text should address (implicitly) the following guiding questions:
        <guiding_questions>
        ${guiding_questions}
        </guiding_questions>

    Use these keywords to ground the content in the specific context of the grant application:
        <keywords>
        ${keywords}
        </keywords>

    Use the part of the work plan that has already been written to ensure that the generated text is consistent with the context and information provided in the previous sections:
        <work_plan_text>
        ${work_plan_text}
        </work_plan_text>
    """,
)

evaluation_criteria = [
    EvaluationCriterion(
        name="Completeness",
        evaluation_instructions="""
        - Ensure all aspects of the research task or objective are addressed.
        - Verify that the text leverages the work plan, keywords, and metadata effectively.
        """,
    ),
    EvaluationCriterion(
        name="Grounding",
        evaluation_instructions="""
        - Confirm that the content is firmly grounded in the context provided by the work plan, keywords, and metadata.
        - Verify accurate reflection of relationships with other objectives/tasks in the narrative.
        """,
    ),
    EvaluationCriterion(
        name="Clarity",
        evaluation_instructions="""
        - Ensure the narrative is clear, concise, and free of ambiguity.
        - Verify logical structure and smooth flow of ideas.
        """,
    ),
    EvaluationCriterion(
        name="Information Density",
        evaluation_instructions="""
        - Ensure high information density with minimal redundancy.
        - Confirm the use of expert terminology to convey complex concepts effectively.
        """,
    ),
    EvaluationCriterion(
        name="Scientific Accuracy",
        evaluation_instructions="""
        - Verify the use of precise, field-specific technical terminology.
        - Ensure factual accuracy and absence of fabricated information.
        """,
    ),
    EvaluationCriterion(
        name="Specificity",
        evaluation_instructions="""
        - Confirm that methodologies, expected outcomes, and dependencies are detailed and precise.
        - Avoid vague or overly general statements.
        """,
    ),
    EvaluationCriterion(
        name="Style",
        evaluation_instructions="""
        - Ensure a formal, data-driven tone is maintained.
        - Emphasize succinctness and specificity in the text.
        """,
    ),
    EvaluationCriterion(
        name="Word Count Adherence",
        evaluation_instructions="""
        - Verify that the text does not exceed the allocated word count.
        - Ensure the length is appropriate for the level of detail required.
        """,
    ),
    EvaluationCriterion(
        name="Hellucination",
        evaluation_instructions="""
        - Ensure the text does not contain hallucinated information (invented facts, persons, terms, etc.).
        """,
        weight=1.5,
    ),
]


async def handle_work_plan_component_generation(
    prompt: str,
    *,
    min_words: int,
    max_words: int,
    **kwargs: Any,
) -> str:
    """Generate the text for a given work plan component.

    Args:
        prompt: The prompt to use for generating the component text.
        min_words: The minimum number of words to generate.
        max_words: The maximum number of words to generate.
        **kwargs: Additional keyword arguments for the generation process.

    Returns:
        The generated component text.
    """
    return await generate_long_form_text(
        max_words=max_words,
        min_words=min_words,
        prompt_identifier="generate_work_component",
        task_description=prompt,
        **kwargs,
    )


async def generate_work_plan_component_text(
    *,
    application_id: str,
    component: ResearchComponentGenerationDTO,
    form_inputs: dict[str, str],
    work_plan_text: str,
) -> str:
    """Generate the text for a given work plan component.

    Args:
        application_id: The ID of the application.
        component: The work plan component for which to generate text.
        form_inputs: The user inputs for the application.
        work_plan_text: The text of the work plan section.

    Returns:
        The generated work plan component text.
    """
    logger.debug("Generating text for work plan component.", component=component)

    prompt = GENERATE_WORK_COMPONENT_USER_PROMPT.to_string(
        guiding_questions=component["guiding_questions"],
        instructions=component["instructions"],
        keywords=component["guiding_questions"],
        relationships=component["relationships"],
        work_plan_text=work_plan_text,
        object_type=component["type"],
        object_type_description="a concrete research task that is a part of a larger specific research objective"
        if component["type"] == "task"
        else "a specific research goal or aim",
    )

    rag_results = await retrieve_documents(
        application_id=application_id,
        task_description=prompt,
        search_queries=component["search_queries"],
        user_inputs=form_inputs,
        section_title=component["title"],
    )

    return await with_prompt_evaluation(
        criteria=evaluation_criteria,
        max_words=component["max_words"],
        min_words=int(component["max_words"] * MIN_WORDS_RATIO),
        prompt=prompt,
        prompt_handler=handle_work_plan_component_generation,
        prompt_identifier="generate_work_component",
        rag_results=rag_results,
        passing_score=85,
        increment=10,
        retries=5,
    )
