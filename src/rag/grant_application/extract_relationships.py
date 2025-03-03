from functools import partial
from typing import Final, TypedDict

from src.constants import ANTHROPIC_SONNET_MODEL
from src.db.json_objects import GrantLongFormSection, ResearchObjective
from src.rag.completion import handle_completions_request
from src.rag.retrieval import retrieve_documents
from src.utils.prompt_template import PromptTemplate

EXTRACT_RELATIONSHIPS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_relationships",
    template="""
    Your task is to analyze the research objectives and identify the relationships between them and their tasks. This will guide the generation of a comprehensive and persuasive work plan.

    ## Sources

    - **Objectives:**
        <research_objectives>
        ${research_objectives}
        </research_objectives>

    - **Retrieval Results:**
        <rag_results>
        ${rag_results}
        </rag_results>

    - **User Inputs:**
        <user_inputs>
        ${user_inputs}
        </user_inputs>

    ## Metadata

    - **Keywords:**
        <keywords>
        ${keywords}
        </keywords>

    - **Topics:**
        <topics>
        ${topics}
        </topics>

    ## Instructions

    1. Analyze the Research Objectives:
        - Deconstruct each research objective into its constituent research tasks.
        - Ensure that each task contributes to the overall objective.
        - Ground the analysis in the provided keywords and topics.

    2. Determine the research narrative:
        - Establish a clear and logical progression of research activities.
        - Consider the interdependencies between objectives and tasks.
        - Ensure the narrative aligns with the overall research goals.

    3. Identify relationships and inter-dependencies:
        - Identify dependencies between objectives (e.g., Objective 2 builds upon the foundation established in Objective 1).
        - Identify dependencies between tasks within an objective (e.g., Task 1.1 must be completed before Task 1.2 can begin).
        - Identify dependencies across objectives (e.g., Findings from Task 2.3 will inform the approach taken in Objective 4).
        - Specify the type of relationship (e.g., causal, sequential, complementary, iterative feedback).
        - Consider how the relationships contribute to addressing the keywords and topics.
        - Ensure relationships demonstrate a cohesive research strategy with logical connections.

    4. Calculate the maximum word count allocation for each objective and task:
        - Calculate the maximum number of words for each objective and task description based on the total word limit provided.
        - The research plan section has a maximum word limit: ${max_words}
        - Ensure that the word count aligns with the level of detail and complexity required for each component.
        - Verify the total word count for the entire research plan section aligns with the numbers assigned to the objectives and tasks.
        - Assign each objective and each task the appropriate word limit based on its complexity and importance.

    ## Output Structure

    Respond with a JSON object adhering to the following format:

    ```json
    {
        "research_objectives": [
            {
                "objective_number": 1,
                "title": "Research Objective Title",
                "relationships": [
                    ["2", "Objective 1 provides the foundational data required for Objective 2. Objective 2 will also provide feedback to Objective 1 to refine the experimental design based on initial results."],
                    ["2.1", "The methodology developed in Objective 1 will be directly applied to Task 2.1. The results from Task 2.1 will inform the optimization of the methodology in Objective 1."]
                ],
                "max_words": 200,
                "tasks": [
                    {
                        "task_number": 1,
                        "title": "Research Task Title",
                        "relationships": [
                            ["2", "This task contributes to the development of specific deliverable required for Objective 2. Findings from Objective 2 may necessitate adjustments to the task."],
                            ["2.1", "The results of this task will be directly used as input for Task 2.1. The results from Task 2.1 may require modifications to the approach taken in this task."]
                        ],
                        "max_words": 150
                    }
                ]
            }
        ]
    }
    """,
)
relationships_schema = {
    "type": "object",
    "properties": {
        "research_objectives": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "objective_number": {"type": "integer", "minimum": 1, "maximum": 100},
                    "title": {"type": "string"},
                    "relationships": {
                        "type": "array",
                        "items": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                    },
                    "max_words": {"type": "integer", "minimum": 50},
                    "tasks": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "task_number": {"type": "integer", "minimum": 1, "maximum": 100},
                                "title": {"type": "string"},
                                "relationships": {
                                    "type": "array",
                                    "items": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "minItems": 2,
                                        "maxItems": 2,
                                    },
                                },
                                "max_words": {"type": "integer", "minimum": 50},
                            },
                            "required": ["task_number", "title", "relationships", "max_words"],
                        },
                    },
                },
                "required": ["objective_number", "title", "relationships", "max_words", "tasks"],
            },
        },
    },
    "required": ["research_objectives"],
}


class TaskRelationships(TypedDict):
    """DTO for task with relationships."""

    task_number: int
    """The number of the task."""
    title: str
    """The title of the task."""
    relationships: list[tuple[str, str]]
    """The relationships of the task to other tasks and objectives."""
    max_words: int
    """The maximum number of words."""


class ObjectiveRelationships(TypedDict):
    """DTO for an objective with relationships."""

    objective_number: int
    """The number of the research objective."""
    title: str
    """The title of the research objective."""
    relationships: list[tuple[str, str]]
    """The relationships of the objective to other objectives and tasks."""
    max_words: int
    """The maximum number of words."""
    tasks: list[TaskRelationships]
    """The tasks for this objective."""


class RelationshipsDTO(TypedDict):
    """DTO for relationships between objectives and tasks."""

    research_objectives: list[ObjectiveRelationships]
    """The research objectives with their relationships."""


def validate_relationships_response(response: RelationshipsDTO, *, input_objectives: list[ResearchObjective]) -> None:
    """Validate the relationships response.

    Args:
         response: The response to validate.
         input_objectives: The input research objectives.

    Raises:
          ValidationError: If the response is invalid.

    Returns:
          None
    """
    # TODO: implement validation logic

    # should raise ValidationError with context. See for example the validator function for src/rag/grant_template/determine_application_sections.py


async def extract_relationships_generation(
    task_description: str,
    *,
    input_objectives: list[ResearchObjective] | None = None,
) -> RelationshipsDTO:
    """Extract relationships between objectives and tasks.

    Args:
        task_description: The task description for the work plan.
        input_objectives: The input research objectives.

    Returns:
        The relationships between objectives and tasks.
    """
    return await handle_completions_request(
        prompt_identifier="plan_relationships",
        messages=task_description,
        response_type=RelationshipsDTO,
        response_schema=relationships_schema,
        model=ANTHROPIC_SONNET_MODEL,
        validator=partial(validate_relationships_response, input_objectives=input_objectives),
    )


async def handle_extract_relationships(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objectives: list[ResearchObjective],
    form_inputs: dict[str, str],
) -> RelationshipsDTO:
    """Generate relationships between objectives and tasks.

    Args:
        application_id: The ID of the grant application.
        grant_section: The grant section for the work plan.
        research_objectives: The research objectives.
        form_inputs: The user inputs.

    Returns:
        The relationships between objectives and tasks.
    """
    relationships_prompt = EXTRACT_RELATIONSHIPS_USER_PROMPT.substitute(
        research_objectives=research_objectives,
        keywords=grant_section["keywords"],
        topics=grant_section["topics"],
        max_words=grant_section["max_words"],
        user_inputs=form_inputs,
    )

    relationships_rag_results = await retrieve_documents(
        application_id=application_id,
        search_queries=grant_section["search_queries"],
        task_description=str(relationships_prompt),
    )

    return await extract_relationships_generation(
        relationships_prompt.to_string(rag_results=relationships_rag_results),
        input_objectives=research_objectives,
    )
