from asyncio import gather
from typing import TYPE_CHECKING, Any, Final

from packages.db.src.json_objects import ResearchDeepDive
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.exceptions import EvaluationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.constants import MIN_WORDS_RATIO
from services.rag.src.dto import ResearchComponentGenerationDTO
from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.utils.evaluation import with_prompt_evaluation
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.source_validation import handle_source_validation

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager

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


async def handle_work_plan_component_generation(
    prompt: str,
    *,
    min_words: int,
    max_words: int,
    timeout: float = 480,
    **kwargs: Any,
) -> str:
    return await generate_long_form_text(
        max_words=max_words,
        min_words=min_words,
        prompt_identifier="generate_work_component",
        task_description=prompt,
        model=ANTHROPIC_SONNET_MODEL,
        timeout=timeout,
        **kwargs,
    )


async def generate_work_plan_component_text(
    *,
    application_id: str,
    component: ResearchComponentGenerationDTO,
    form_inputs: ResearchDeepDive,
    work_plan_text: str,
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
) -> str:
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
        form_inputs=form_inputs,
        section_title=component["title"],
        with_guided_retrieval=True,
        trace_id=trace_id,
    )

    if source_validation_error := await handle_source_validation(
        task_description=str(prompt),
        sources={"rag_results": rag_results, "form_inputs": form_inputs},
        max_length=component["max_words"],
        trace_id=trace_id,
    ):
        return source_validation_error
    try:
        return await with_prompt_evaluation(
            max_words=component["max_words"],
            min_words=int(component["max_words"] * MIN_WORDS_RATIO),
            prompt=prompt,
            prompt_handler=handle_work_plan_component_generation,
            prompt_identifier="generate_work_component",
            rag_results=rag_results,
            user_input=form_inputs,
            trace_id=trace_id,
            **get_evaluation_kwargs("generate_work_plan", job_manager),
        )
    except EvaluationError:
        return "Failed to generate component text."


async def generate_workplan_section(
    *,
    application_id: str,
    form_inputs: ResearchDeepDive,
    components: list[ResearchComponentGenerationDTO],
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
) -> str:
    all_texts = await gather(
        *[
            generate_work_plan_component_text(
                application_id=application_id,
                component=component,
                work_plan_text="",
                form_inputs=form_inputs,
                trace_id=trace_id,
                job_manager=job_manager,
            )
            for component in components
        ]
    )

    work_plan_text = ""
    for component, text in zip(components, all_texts, strict=True):
        if "." not in component["number"]:
            work_plan_text += f"\n\n### Objective {component['number']}: {component['title']}\n{text}"
        else:
            work_plan_text += f"\n\n#### {component['number']}: {component['title']}\n{text}"

    return work_plan_text.strip()
