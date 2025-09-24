import logging
from functools import partial
from typing import TYPE_CHECKING, Final, TypedDict

from packages.db.src.json_objects import ResearchObjective
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.grant_application.dto import EnrichmentDataDTO, EnrichObjectiveInputDTO

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import with_prompt_evaluation
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate

logger = logging.getLogger(__name__)

ENRICH_RESEARCH_OBJECTIVE_SYSTEM_PROMPT: Final[str] = """
You are a specialized component in a RAG system dedicated to enriching STEM grant applications.
Your role is to enhance research objectives with detailed scientific content, guiding questions,
and search queries that will produce competitive and compelling grant applications.
"""

ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="enrich_research_objective",
    template="""
    Your task is to enrich a specific research objective and its tasks with detailed, scientifically rigorous information to guide the generation of a comprehensive, persuasive, and competitive work plan for a grant application.

    ## Sources

    The Research Objective and Tasks:
        <objective_and_tasks>
        ${objective_and_tasks}
        </objective_and_tasks>

    Retrieval Results:
        <rag_results>
        ${rag_results}
        </rag_results>

    User Inputs:
        <form_inputs>
        ${form_inputs}
        </form_inputs>

    ## Metadata

    Keywords:
        <keywords>
        ${keywords}
        </keywords>

    Topics:
        <topics>
        ${topics}
        </topics>

    ## Instructions

    1. **Generate an enriched objective** that enhances and expands the original research objective or task:
        - Provide a comprehensive, detailed version of the original objective/task
        - Expand on the scientific rationale and potential impact
        - Include technical details that enhance understanding
        - Maintain alignment with the original purpose while adding scientific depth
        - Minimum 50 characters required

    2. **Generate scientific context** that explains the rationale and background for this research:
        - Provide scientific background that justifies the research approach
        - Explain the current state of knowledge in this area
        - Describe why this research is needed and timely
        - Connect to broader scientific trends and challenges
        - Ground the work in established scientific principles
        - Minimum 50 characters required

    3. **Generate 5 core scientific terms** that are fundamental to understanding and executing this research:
        - Identify the most important scientific concepts, methodologies, or technologies central to this research
        - Focus on terms that represent the foundational scientific principles underlying the research objective
        - Select terms that would be essential for any researcher or reviewer to understand the scientific basis
        - Ensure terms are specific enough to be meaningful but broad enough to capture key scientific domains
        - These terms will be used for scientific context enhancement and should represent the core scientific foundation

    4. Formulate between 3 to 10 guiding questions for the objective and its tasks:
        - Focus on questions that address the core purpose, methodology, expected outcomes, potential challenges, and broader implications of the research.
        - Ground the questions in the provided keywords and topics to ensure relevance and focus.
        - Include questions that prompt consideration of scientific rigor, innovation potential, and impact.
        - Ensure questions address the relationship between the main objective and its component tasks.
        - Craft questions that will elicit evidence-based, detailed responses suitable for a grant application.

    5. Generate detailed descriptions for the objective and its tasks, addressing the following elements:
        - **Purpose:** Clearly state the purpose and its contribution to the overall research goal, emphasizing scientific significance.
        - **Methodology:** Describe the methods and techniques to be employed with technical precision and scientific rigor.
        - **Expected Results:** Outline anticipated outcomes, deliverables, and potential impact with measurable indicators.
        - **Dependencies:** Summarize key dependencies, highlighting critical path relationships between tasks and the main objective.
        - **Potential Risks:** Identify potential challenges, limitations, and mitigation strategies backed by scientific reasoning.
        - **Innovation Elements:** Highlight novel approaches or techniques that distinguish this research in its field.
        - Ensure all descriptions are grounded in the provided keywords and topics.
        - Support descriptions with evidence from the retrieval results where applicable.

    6. Write detailed instructions for AI text generation:
        - Provide detailed instructions for AI text generation of the objective and task descriptions.
        - Prioritize information from the sources and incorporate metadata.
        - Specify the desired writing style (e.g., formal and academic, persuasive, concise).
        - Include instructions on the level of detail, use of technical terminology, and any specific formatting requirements.
        - Explicitly instruct the AI to use the provided keywords and topics to guide the generation of the text.
        - Direct the AI to maintain a cohesive narrative across the objective and its tasks.
        - Include instructions for emphasizing competitive aspects and advantages of the research approach.
        - Provide guidance on balancing technical detail with accessibility for grant reviewers.

    7. Generate between 3-10 search queries for retrieval of relevant information for the objective and its tasks:
        - Identify the specific terminology that is relevant to the objective and its tasks.
        - Construct queries using precise scientific terminology from the domain.
        - Include queries that combine multiple relevant concepts to increase specificity.
        - Formulate queries using both technical terms and their common variants.
        - Brainstorm different potential queries - balance specificity with breadth for RAG retrieval.
        - Consider potential synonyms or related terms that could broaden the search.
        - Include queries that target methodological approaches specific to the research.
        - Evaluate each generated query for relevance and effectiveness, refining as necessary.
        - Format queries as concise phrases (3-7 words) rather than complete sentences for optimal retrieval.

    ## Output Structure

    Provide enriched content for the research objective and its tasks with the following structure:

    **For the research objective:**
    - Enriched objective: Enhanced and detailed version of the original research objective
    - Core scientific terms: Exactly 5 fundamental scientific terms central to this research
    - Scientific context: Scientific background and context explaining the rationale for this research
    - Instructions: Detailed guidance for AI text generation including writing style, technical depth, and formatting requirements
    - Description: Comprehensive scientific description covering purpose, methodology, expected results, dependencies, risks, and innovation
    - Guiding questions: 3-10 questions addressing core purpose, methodology, outcomes, challenges, and implications
    - Search queries: 3-10 concise queries (3-7 words) using precise scientific terminology for optimal retrieval

    **For each research task:**
    - The same seven components as above, but specific to each individual task
    - Tasks must correspond exactly to those in the input objective
    - Each task represents a specific component of the overall research objective

    Important requirements:
    - All text fields must be substantial (minimum 50 characters) and scientifically meaningful
    - Search queries should be concise, specific phrases optimized for vector retrieval
    - Content must be grounded in provided keywords and topics
    - Maintain consistency across objective and task descriptions
    - Core scientific terms must be exactly 5 terms that represent the foundational scientific concepts
    """,
)

enriched_object_schema = {
    "type": "object",
    "properties": {
        "enriched_objective": {
            "type": "string",
            "minLength": 50,
            "description": "Enhanced and detailed version of the original research objective or task",
        },
        "core_scientific_terms": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 5,
            "maxItems": 5,
            "description": "Exactly 5 fundamental scientific terms central to this research",
        },
        "scientific_context": {
            "type": "string",
            "minLength": 50,
            "description": "Scientific background and context explaining the rationale for this research",
        },
        "instructions": {
            "type": "string",
            "minLength": 50,
            "description": "Detailed instructions for AI text generation including style, technical depth, and formatting",
        },
        "description": {
            "type": "string",
            "minLength": 50,
            "description": "Comprehensive description covering purpose, methodology, expected results, dependencies, risks, and innovation",
        },
        "guiding_questions": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 10,
            "description": "Questions addressing core purpose, methodology, outcomes, challenges, and broader implications",
        },
        "search_queries": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 10,
            "description": "Concise queries (3-7 words) using precise scientific terminology for vector retrieval",
        },
    },
    "required": [
        "enriched_objective",
        "core_scientific_terms",
        "scientific_context",
        "instructions",
        "description",
        "guiding_questions",
        "search_queries",
    ],
}

research_objective_enrichment_schema = {
    "type": "object",
    "properties": {
        "research_objective": enriched_object_schema,
        "research_tasks": {
            "type": "array",
            "items": enriched_object_schema,
            "description": "Array of enriched content for each research task, must match input tasks exactly",
        },
    },
    "required": ["research_objective", "research_tasks"],
}


class ObjectiveEnrichmentDTO(TypedDict):
    research_objective: EnrichmentDataDTO
    research_tasks: list[EnrichmentDataDTO]


def validate_enrichment_response(
    response: ObjectiveEnrichmentDTO, *, input_objective: ResearchObjective | None
) -> None:
    if "research_objective" not in response:
        raise ValidationError("Missing objective in response", context=response)

    objective = response["research_objective"]
    if not isinstance(objective, dict):
        raise ValidationError(
            "Objective must be a dictionary",
            context={
                "type": type(objective).__name__,
            },
        )

    for field in [
        "enriched_objective",
        "core_scientific_terms",
        "scientific_context",
        "instructions",
        "description",
        "guiding_questions",
        "search_queries",
    ]:
        if field not in objective:
            raise ValidationError(f"Missing {field} in objective", context=objective)

    if len(objective["core_scientific_terms"]) != 5:
        raise ValidationError(
            "Objective must have exactly 5 core scientific terms",
            context={"terms_count": len(objective["core_scientific_terms"])},
        )

    if len(objective["guiding_questions"]) < 3:
        raise ValidationError(
            "Objective must have at least 3 guiding questions",
            context={"questions_count": len(objective["guiding_questions"])},
        )

    if len(objective["search_queries"]) < 3:
        raise ValidationError(
            "Objective must have at least 3 search queries", context={"queries_count": len(objective["search_queries"])}
        )

    if len(objective["enriched_objective"].strip()) < 50:
        raise ValidationError(
            "Objective enriched_objective too short", context={"content": objective["enriched_objective"]}
        )

    if len(objective["scientific_context"].strip()) < 50:
        raise ValidationError(
            "Objective scientific_context too short", context={"content": objective["scientific_context"]}
        )

    if len(objective["instructions"].strip()) < 50:
        raise ValidationError("Objective instructions too short", context={"content": objective["instructions"]})

    if len(objective["description"].strip()) < 50:
        raise ValidationError("Objective description too short", context={"content": objective["description"]})

    if "research_tasks" not in response:
        raise ValidationError("Missing tasks in response", context=response)

    if (
        input_objective
        and input_objective.get("research_tasks")
        and len(response["research_tasks"]) != len(input_objective["research_tasks"])
    ):
        raise ValidationError(
            "Number of enriched tasks doesn't match input objective tasks",
            context={
                "input_tasks_count": len(input_objective["research_tasks"]),
                "response_tasks_count": len(response["research_tasks"]),
            },
        )

    for i, task in enumerate(response["research_tasks"]):
        for field in [
            "enriched_objective",
            "core_scientific_terms",
            "scientific_context",
            "instructions",
            "description",
            "guiding_questions",
            "search_queries",
        ]:
            if field not in task:
                raise ValidationError(f"Missing {field} in task at index {i}", context=task)

        if len(task["core_scientific_terms"]) != 5:
            raise ValidationError(
                f"Task at index {i} must have exactly 5 core scientific terms",
                context={"terms_count": len(task["core_scientific_terms"])},
            )

        if len(task["guiding_questions"]) < 3:
            raise ValidationError(
                f"Task at index {i} must have at least 3 guiding questions",
                context={"questions_count": len(task["guiding_questions"])},
            )

        if len(task["search_queries"]) < 3:
            raise ValidationError(
                f"Task at index {i} must have at least 3 search queries",
                context={"queries_count": len(task["search_queries"])},
            )

        if len(task["enriched_objective"].strip()) < 50:
            raise ValidationError(
                f"Task at index {i} enriched_objective too short", context={"content": task["enriched_objective"]}
            )

        if len(task["scientific_context"].strip()) < 50:
            raise ValidationError(
                f"Task at index {i} scientific_context too short", context={"content": task["scientific_context"]}
            )

        if len(task["instructions"].strip()) < 50:
            raise ValidationError(
                f"Task at index {i} instructions too short", context={"content": task["instructions"]}
            )

        if len(task["description"].strip()) < 50:
            raise ValidationError(f"Task at index {i} description too short", context={"content": task["description"]})


async def enrich_objective_generation(
    task_description: str,
    *,
    trace_id: str,
    input_objective: ResearchObjective | None = None,
) -> ObjectiveEnrichmentDTO:
    return await handle_completions_request(
        prompt_identifier="enrich_objective",
        messages=task_description,
        response_type=ObjectiveEnrichmentDTO,
        response_schema=research_objective_enrichment_schema,
        model=ANTHROPIC_SONNET_MODEL,
        system_prompt=ENRICH_RESEARCH_OBJECTIVE_SYSTEM_PROMPT,
        validator=partial(validate_enrichment_response, input_objective=input_objective),
        trace_id=trace_id,
    )


async def handle_enrich_objective(
    dto: EnrichObjectiveInputDTO, *, job_manager: "JobManager[StageDTO]"
) -> ObjectiveEnrichmentDTO:
    enrichment_prompt = ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT.substitute(
        objective_and_tasks=dto["research_objective"],
        keywords=dto["keywords"],
        topics=dto["topics"],
        form_inputs=dto["form_inputs"],
    )

    full_prompt = enrichment_prompt.to_string(rag_results=dto["retrieval_context"])
    compressed_prompt = compress_prompt_text(full_prompt, aggressive=True)

    return await with_prompt_evaluation(
        prompt_identifier="enrich_objective",
        prompt_handler=enrich_objective_generation,
        prompt=compressed_prompt,
        input_objective=dto["research_objective"],
        trace_id=dto["trace_id"],
        **get_evaluation_kwargs("enrich_objectives", job_manager),
    )
