from functools import partial
from typing import Final, TypedDict

from src.constants import ANTHROPIC_SONNET_MODEL
from src.db.json_objects import GrantLongFormSection, ResearchObjective
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.prompt_template import PromptTemplate

ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="enrich_research_objective",
    template="""
    Your task is to enrich a specific research objective and its tasks with detailed information to guide the generation of a comprehensive and persuasive work plan.

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
        <user_inputs>
        ${user_inputs}
        </user_inputs>

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

    1. Formulate between 3 to 10 guiding questions for the objective and its tasks:
        - Focus on questions that address the core purpose, methodology, expected outcomes, potential challenges, and broader implications of the research.
        - Ground the questions in the provided keywords and topics to ensure relevance and focus.

    2. Generate detailed descriptions for the objective and its tasks, addressing the following elements:
        - **Purpose:** Clearly state the purpose and its contribution to the overall research goal.
        - **Methodology:** Describe the methods and techniques to be employed with technical precision.
        - **Expected Results:** Outline anticipated outcomes, deliverables, and potential impact with measurable indicators.
        - **Dependencies:** Summarize key dependencies, highlighting critical path relationships.
        - **Potential Risks:** Identify potential challenges, limitations, and mitigation strategies.
        - **Innovation Elements:** Highlight novel approaches or techniques that distinguish this research.
        - Ensure all descriptions are grounded in the provided keywords and topics.

    3. Write detailed instructions for AI text generation:
        - Provide detailed instructions for AI text generation of the objective and task descriptions.
        - Prioritize information from the sources and incorporate metadata.
        - Specify the desired writing style (e.g., formal and academic, persuasive, concise).
        - Include instructions on the level of detail, use of technical terminology, and any specific formatting requirements.
        - Explicitly instruct the AI to use the provided keywords and topics to guide the generation of the text.

    4. Generate between 3-10 search queries for retrieval of relevant information for each objective and task:
        - Identify the specific terminology that is relevant to the objective and its tasks.
        - Brainstorm different potential queries - balance specificity with breadth for RAG retrieval.
        - Consider potential synonyms or related terms that could broaden the search.
        - Evaluate each generated query for relevance and effectiveness, refining as necessary.

    ## Output Structure

    Respond with a JSON object adhering to the following format:

    ```json
    {
        "research_objective": {
            "instructions": "Detailed instructions for text generation",
            "description": "Detailed description of the research objective",
            "guiding_questions": [
                "Question 1",
                "...",
            ],
            "max_words": 200,
            "search_queries": [
                "Query 1",
                "Query 2",
                "Query 3"
            ]
        },
        "research_tasks": [
            {
                "instructions": "Detailed instructions for text generation",
                "description": "Detailed description of the research objective",
                "guiding_questions": [
                    "Question 1",
                    "Question 2",
                    "Question 3"
                ],
                "max_words": 150,
                "search_queries": [
                    "Query 1",
                    "Query 2",
                    "Query 3"
                ]
            }
        ]
    }
    ```

    Important:
        - The objects in the research task array must correspond to the tasks of the input research objective.
    """,
)

enriched_object_shcema = {
    "type": "object",
    "properties": {
        "instructions": {"type": "string", "minLength": 20},
        "description": {"type": "string", "minLength": 20},
        "max_words": {"type": "integer", "minimum": 50, "maximum": 500},
        "guiding_questions": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
        "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
    },
}

research_objective_enrichment_schema = {
    "type": "object",
    "properties": {
        "research_objective": enriched_object_shcema,
        "research_tasks": {
            "type": "array",
            "items": enriched_object_shcema,
        },
    },
    "required": ["research_objective", "research_tasks"],
}


class EnrichmentDataDTO(TypedDict):
    """DTO for enrichment data."""

    instructions: str
    """Detailed instructions for text generation."""
    description: str
    """Detailed description of the research objective."""
    guiding_questions: list[str]
    """Guiding questions for the objective."""
    max_words: int
    """Maximum word count."""
    search_queries: list[str]
    """Search queries for the objective."""


class ObjectiveEnrichmentDTO(TypedDict):
    """DTO for enrichment of a specific objective and its tasks."""

    objective: EnrichmentDataDTO
    """The enriched objective."""
    tasks: list[EnrichmentDataDTO]
    """The enriched tasks for this objective."""


def validate_enrichment_response(response: ObjectiveEnrichmentDTO, *, input_objective: ResearchObjective) -> None:
    """Validate the enrichment response.

    Args:
        response: The response to validate.
        input_objective: The input objective.


    Raises:
        ValidationError: If the response is invalid.

    Returns:
          None
    """
    # TODO: implement validation logic, the function should ValidationError with context. See for example the validator function for src/rag/grant_template/determine_application_sections.py


async def enrich_objective_generation(
    task_description: str,
    *,
    input_objective: ResearchObjective | None = None,
) -> ObjectiveEnrichmentDTO:
    """Enrich a specific objective and its tasks.

    Args:
        task_description: The task description for the objective enrichment.
        input_objective: The input objective with tasks to enrich.

    Returns:
        The enriched objective and tasks.
    """
    return await handle_completions_request(
        prompt_identifier="enrich_objective",
        messages=task_description,
        response_type=ObjectiveEnrichmentDTO,
        response_schema=research_objective_enrichment_schema,
        model=ANTHROPIC_SONNET_MODEL,
        validator=partial(validate_enrichment_response, input_objective=input_objective),
    )


criteria: list[EvaluationCriterion] = []


async def handle_enrich_objective(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objective: ResearchObjective,
    form_inputs: dict[str, str],
) -> ObjectiveEnrichmentDTO:
    """Generate a detailed plan for the work plan section using a two-step process.

    First, determine the relationships between objectives and tasks.
    Then, for each objective, enrich it and its tasks with detailed information.

    Args:
        application_id: The ID of the grant application.
        grant_section: The grant section for the work plan.
        research_objective: The research objective to enrich.
        form_inputs: The user inputs.

    Returns:
        The work plan dto.
    """
    enrichment_prompt = ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT.substitute(
        objective_and_tasks=research_objective,
        keywords=grant_section["keywords"],
        topics=grant_section["topics"],
        user_inputs=form_inputs,
    )

    enrichment_rag_results = await retrieve_documents(
        application_id=application_id,
        search_queries=grant_section["search_queries"],
        task_description=str(enrichment_prompt),
    )

    return await with_prompt_evaluation(
        prompt_identifier="enrich_objective",
        prompt=enrichment_prompt.to_string(rag_results=enrichment_rag_results),
        criteria=criteria,
        passing_score=95,
        increment=10,
    )
