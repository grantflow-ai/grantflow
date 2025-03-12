from typing import Any, Final

from src.constants import ANTHROPIC_SONNET_MODEL, MIN_WORDS_RATIO
from src.exceptions import EvaluationError
from src.rag.grant_application.dto import ResearchComponentGenerationDTO
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.long_form import generate_long_form_text
from src.rag.retrieval import retrieve_documents
from src.rag.source_validation import handle_source_validation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

TASK_CONTENT_GUIDELINES: Final[str] = """For this task:
- Be specific about the methodologies, protocols, and techniques that will be used
- Include concrete steps for implementation
- Clarify dependencies on other tasks where applicable
- Explain expected outcomes and deliverables
- Consider potential challenges and contingency plans
"""

TASK_RELATIONSHIP_GUIDELINES: Final[str] = """When addressing relationships between tasks:
- Make explicit connections to prerequisite tasks
- Explain how this task builds upon outputs from other tasks
- Clarify how results from this task will feed into subsequent tasks
- Maintain clear timeline dependencies
- Ensure methodological consistency across related tasks
"""

OBJECTIVE_CONTENT_GUIDELINES: Final[str] = """For this research objective:
- Articulate the overarching scientific goal and its significance
- Provide a high-level strategy for achievement
- Explain how this objective advances knowledge in your field
- Outline how the constituent tasks collectively address this objective
- Highlight the expected scientific impact
"""

OBJECTIVE_RELATIONSHIP_GUIDELINES: Final[str] = """When addressing relationships between objectives:
- Explain how this objective complements other research objectives
- Highlight synergies between objectives that enhance overall scientific impact
- Maintain conceptual alignment with the broader research goals
- Ensure your objective creates a coherent narrative with other research aims
"""

GENERATE_WORK_COMPONENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="work_component_generation",
    template="""
    Your task is to write the text for a ${object_type} in a grant application work plan.

    An ${object_type} is ${object_type_description}. This component must be scientifically accurate, methodologically sound, and demonstrate a clear scientific contribution to the field. The text will be evaluated by scientific experts and must balance technical precision with clarity.

    The title of this ${object_type} is ${object_title} and the user provided the following description for it:

    <description>
    ${description}
    </description>

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

    ${relationship_guidance}

    Use these relationships to ensure that the generated text is consistent with the context and information provided in the previous sections.

    ## Content Guidance

    ${object_type_specific_guidance}

    The generated text should address (implicitly) the following guiding questions:
        <guiding_questions>
        ${guiding_questions}
        </guiding_questions>

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
        - Ensure all aspects of the research task or objective are addressed given the provided word limits.
        - If information is missing, **MISSING INFORMATION** is inserted as expected.
        """,
    ),
    EvaluationCriterion(
        name="Grounding",
        evaluation_instructions="""
        - Confirm that the content is firmly grounded in the sources.
        - Verify accurate reflection of relationships with other objectives/tasks in the narrative.
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
        - Ensure factual accuracy.
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
        name="Hellucination",
        evaluation_instructions="""
        - Ensure the text does not contain hallucinated information (invented facts, persons, terms, etc.).
        """,
        weight=1.2,
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
        model=ANTHROPIC_SONNET_MODEL,
        **kwargs,
    )


async def generate_work_plan_component_text(
    *,
    application_id: str,
    component: ResearchComponentGenerationDTO,
    user_inputs: dict[str, str],
    work_plan_text: str,
) -> str:
    """Generate the text for a given work plan component.

    Args:
        application_id: The ID of the application.
        component: The work plan component for which to generate text.
        user_inputs: The user inputs for the application.
        work_plan_text: The text of the work plan section.

    Returns:
        The generated work plan component text.
    """
    logger.debug("Generating text for work plan component.", component=component)

    object_type_specific_guidance = (
        TASK_CONTENT_GUIDELINES if component["type"] == "task" else OBJECTIVE_CONTENT_GUIDELINES
    )
    relationship_guidance = (
        TASK_RELATIONSHIP_GUIDELINES if component["type"] == "task" else OBJECTIVE_RELATIONSHIP_GUIDELINES
    )

    prompt = GENERATE_WORK_COMPONENT_USER_PROMPT.to_string(
        description=component.get("description", "none given"),
        guiding_questions=component["guiding_questions"],
        instructions=component["instructions"],
        relationships=component["relationships"],
        work_plan_text=work_plan_text,
        object_type=component["type"],
        object_type_description="a concrete research task that is a part of a larger specific research objective"
        if component["type"] == "task"
        else "a specific research goal or aim",
        object_type_specific_guidance=object_type_specific_guidance,
        relationship_guidance=relationship_guidance,
        object_title=component["title"],
    )

    rag_results = await retrieve_documents(
        application_id=application_id,
        task_description=prompt,
        search_queries=component["search_queries"],
        user_inputs=user_inputs,
        section_title=component["title"],
        with_guided_retrieval=True,
    )

    if source_validation_error := await handle_source_validation(
        task_description=str(prompt),
        sources={"rag_results": rag_results, "user_inputs": user_inputs},
        max_length=component["max_words"],
    ):
        return source_validation_error
    try:
        return await with_prompt_evaluation(
            criteria=evaluation_criteria,
            max_words=component["max_words"],
            min_words=int(component["max_words"] * MIN_WORDS_RATIO),
            prompt=prompt,
            prompt_handler=handle_work_plan_component_generation,
            prompt_identifier="generate_work_component",
            rag_results=rag_results,
            user_input=user_inputs,
            passing_score=85,
            increment=10,
            retries=5,
        )
    except EvaluationError:
        return "Failed to generate component text."
