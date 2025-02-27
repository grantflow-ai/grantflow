from functools import partial
from typing import Final, TypedDict

from src.db.json_objects import GrantLongFormSection, ResearchObjective
from src.exceptions import ValidationError
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.prompt_template import PromptTemplate

ENRICH_AND_PLAN_RESEARCH_PLAN_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="enrich_objectives",
    template="""
    Your task is to create a detailed plan for the research plan section in JSON format.  This plan will guide the AI in generating a comprehensive and persuasive research plan.

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

    ## Constraints:

    The research plan section has a maximum word limit:
        <max_words>
        ${max_words}
        </max_words>

    ## Task Description

    1. **Analyze Objectives:**
        * Deconstruct each research objective into its constituent research tasks.
        * Ensure that each task contributes to the overall objective.
        * Ground the analysis in the provided keywords and topics, using them to understand the core concepts and focus of the research.

    2. **Determine Narrative:**
        * Establish a clear and logical progression of research activities.
        * Consider the interdependencies between objectives and tasks.
        * Ensure the narrative aligns with the overall research goals and the provided keywords and topics.

    3. **Identify Relationships:**
        *  Identify dependencies between objectives. (e.g., Objective 2 builds upon the foundation established in Objective 1).
        *  Identify dependencies between tasks within an objective (e.g., Task 1.1 must be completed before Task 1.2 can begin).
        *  Identify dependencies across objectives (e.g., Findings from Task 2.3 will inform the approach taken in Objective 4).
        *  Specify the type of relationship (e.g., causal, sequential, complementary, iterative feedback).
        *  Consider how the relationships between objectives and tasks contribute to addressing the keywords and topics.

    4. **Guiding Questions:**
        *  Formulate a comprehensive set of guiding questions for each objective and task.
        *  **Prioritize the use of provided keywords when creating questions.**
        *  Ensure each objective has at least 3 guiding questions.
        *  Focus on questions that address the core purpose, methodology, expected outcomes, potential challenges, and broader implications of the research.
        *  Ground the questions in the provided keywords and topics to ensure relevance and focus.

    5. **Detailed Descriptions:**
        *  **Purpose:** Clearly state the purpose of each objective and task and its contribution to the overall research goal.
        *  **Methodology:**  Describe the methods and techniques to be employed. Be specific (e.g., "use CRISPR-Cas9 gene editing to target the specific gene sequence...").
        *  **Expected Results:** Outline anticipated outcomes, deliverables, and potential impact.
        *  **Dependencies:** Summarize key dependencies identified in step 3.
        *  **Potential Risks:** Identify potential challenges, limitations, and mitigation strategies.
        *  Ensure the descriptions are grounded in the provided keywords and topics, using them to provide context and focus.

    6. **Generation Instructions:**
        *  Provide detailed instructions for AI text generation of each objective and task description.
        *  Prioritize information from the sources (weight = 2) and incorporate metadata (weight = 1).
        *  Specify the desired writing style (e.g., formal and academic, persuasive, concise).
        *  Include instructions on the level of detail, use of technical terminology, and any specific formatting requirements.
        *  **Explicitly instruct the AI to use the provided keywords and topics to guide the generation of the text.**
        *  Example: "Generate a concise and persuasive description of Objective 2, emphasizing its innovative methodology and potential for clinical translation. Use formal and academic language. Highlight the connection to [keyword 1] and [topic 2]. Explain how this objective addresses the knowledge gap identified in [source 3]."

    7. **Calculate Max Words:**
        *  Calculate the maximum number of words for each objective and task description based on the total word limit provided.
        *  Ensure that the word count aligns with the level of detail and complexity required for each component.
        *  Verify the total word count for the entire research plan section aligns with the numbers assigned to the objectives and tasks.
        *  Assign each objective and each task the appropriate word limit based on its complexity and importance.

    8. **Search Query Generation:**
        * Identify the specific terminology that is relevant to each objective and task.
        * Brainstorm different potential queries - balance specificity with breadth for RAG retrieval.
        * Consider potential synonyms or related terms that could broaden the search.
        * Evaluate each generated query for relevance and effectiveness, refining as necessary.

    ## Output Structure

    Respond using this JSON structure:

    ```json
    {
        "research_objectives": [
            {
                "objective_number": "1",
                "title": "Research Objective Title",
                "description": "Research Objective Description",
                "relationships": [
                    ["2", "Objective 1 provides the foundational data required for Objective 2. Objective 2 will also provide feedback to Objective 1 to refine the experimental design based on initial results."],
                    ["2.1", "The methodology developed in Objective 1 will be directly applied to Task 2.1.  The results from Task 2.1 will inform the optimization of the methodology in Objective 1."]
                ],
                "instructions": "Generate a concise and persuasive description of the objective, emphasizing its importance in achieving the overall research goal. Use formal and academic language. Highlight the connection to [keyword 1] and [keyword 2].",
                "guiding_questions": [
                    "What is the primary aim of this objective?",
                    "How does this objective contribute to the overall research project?",
                    "What are the key challenges anticipated in achieving this objective?"
                ],
                "max_words": 200,
                "keywords": [
                    "keyword1",
                    "keyword2",
                    "topic1",
                    // ... relevant and specific terms from sources and metadata
                ],
                "search_queries": [
                    "Query 1",
                    "Query 2",
                    "Query 3",
                    // Additional queries as needed, up to 10
                ]
            }
        ],
        "research_tasks": [
            {
                "objective_number": "1",
                "task_number": "1",
                "title": "Research Task Title",
                "description": "Research Task Description",
                "relationships": [
                    ["2", "This task contributes to the development of [specific deliverable] required for Objective 2.  Findings from Objective 2 may necessitate adjustments to the task."],
                    ["2.1", "The results of this task will be directly used as input for Task 2.1.  The results from Task 2.1 may require modifications to the approach taken in this task."]
                ],
                "instructions": "Generate a detailed description of the task, including specific methodologies, datasets, and expected outcomes.  Ensure the description aligns with [topic 1] and addresses potential challenges related to [keyword 3].",
                "guiding_questions": [
                    "What specific methods will be used to complete this task?",
                    "What are the anticipated deliverables of this task?",
                    "How will the results of this task be validated?"
                ],
                "max_words": 150,
                "keywords": [
                    "keyword3",
                    "keyword4",
                    "topic2",
                    // ... relevant and terms from sources and metadata
                ],
                "search_queries": [
                    "Query 1",
                    "Query 2",
                    "Query 3",
                    // Additional queries as needed, up to 10
                ]
            }
        ]
    }

    ## Validation:

    1. Completeness Check: Verify that all objectives and tasks have complete information, including titles, descriptions, relationships, instructions, guiding questions, and metadata.
    2. Relationship Validation:
        -  Ensure that all relationships are clearly explained and reference specific objective/task numbers.
        -  Check that relationship descriptions accurately reflect dependencies and progression.
        -  Confirm that relationships are bidirectional where appropriate (e.g., Objective 1 informs Objective 2, and Objective 2 provides feedback to Objective 1).
    3. Instruction Validation:
        -  Ensure that generation instructions are clear, detailed, and specific.
        -  Confirm that instructions align with the provided sources and metadata.
        -  Verify that instructions specify the desired writing style, level of detail, and use of technical terminology.
    4. Metadata Validation:
        -  Ensure that the `metadata` field for each objective and task contains relevant and diverse terms.
        -  Confirm that the metadata is derived from the sources and the provided keywords and topics.
    5. Coherence Check: Review the overall logic and flow of the research plan. Ensure that there is a clear progression and interconnectedness between objectives and tasks.
    6. Grounding Check:  Verify that the provided keywords and topics are appropriately integrated throughout the JSON structure, guiding the analysis, descriptions, and generation instructions.
    7. Consistency Check: Ensure that all information in the JSON is consistent with the provided sources and metadata.
    8. Formatting Check:  Validate that the JSON adheres to the specified structure and formatting conventions.
    9. Word Count Verification: Confirm that the total word count for the research plan section aligns with the provided word limit.
    10. Keyword Relevance: Ensure that the keywords provided are relevant to the objectives and tasks, guiding the content generation effectively. Keywords must balance specificity and topic coverage.
    """,
)


response_schema = {
    "type": "object",
    "properties": {
        "research_objectives": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "objective_number": {"type": "integer", "minimum": 1, "maximum": 100},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "max_words": {"type": "integer", "minimum": 50},
                    "relationships": {
                        "type": "array",
                        "items": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                    },
                    "instructions": {"type": "string"},
                    "guiding_questions": {"type": "array", "items": {"type": "string"}, "minItems": 3},
                    "keywords": {"type": "array", "items": {"type": "string"}, "minItems": 5},
                    "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                },
                "required": [
                    "objective_number",
                    "title",
                    "description",
                    "max_words",
                    "relationships",
                    "instructions",
                    "guiding_questions",
                    "keywords",
                    "search_queries",
                ],
            },
        },
        "research_tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "objective_number": {"type": "integer", "minimum": 1, "maximum": 100},
                    "task_number": {"type": "integer", "minimum": 1, "maximum": 100},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "max_words": {"type": "integer", "minimum": 50},
                    "relationships": {
                        "type": "array",
                        "items": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                    },
                    "instructions": {"type": "string"},
                    "guiding_questions": {"type": "array", "items": {"type": "string"}, "minItems": 3},
                    "keywords": {"type": "array", "items": {"type": "string"}, "minItems": 5},
                    "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                },
                "required": [
                    "task_number",
                    "objective_number",
                    "title",
                    "description",
                    "max_words",
                    "relationships",
                    "instructions",
                    "guiding_questions",
                    "keywords",
                    "search_queries",
                ],
            },
        },
    },
    "required": ["research_objectives", "research_tasks"],
}


class ResearchObjectiveDTO(TypedDict):
    """DTO for a research objective data."""

    objective_number: int
    """The number of the research objective."""
    title: str
    """The title of the research objective or task."""
    description: str
    """The description of the research objective or task."""
    max_words: int
    """The maximum number of words."""
    relationships: list[tuple[str, str]]
    """The relations of the research objective or task to other tasks and objectives.

    Format:
    [
        ("task_number", "relationship_type"),
        ...
    ]
    """
    instructions: str
    """Instructions for the research objective or task."""
    guiding_questions: list[str]
    """Guiding questions for the research objective or task."""
    keywords: list[str]
    """Keywords for guiding the writing of the research objective or task."""
    search_queries: list[str]


class ResearchTaskDTO(ResearchObjectiveDTO):
    """DTO for a research task data."""

    task_number: int
    """The number of the task."""


class ResearchPlanDTO(TypedDict):
    """DTO for a research plan."""

    research_objectives: list[ResearchObjectiveDTO]
    """The research objectives for the research plan."""
    research_tasks: list[ResearchTaskDTO]
    """The research tasks for the research plan."""


def research_plan_validator(tool_response: ResearchPlanDTO, *, input_objectives: list[ResearchObjective]) -> None:  # noqa: C901, PLR0912
    """Validate the research plan response.

    Args:
        tool_response: The tool response.
        input_objectives: The input research objectives.

    Raises:
        ValidationError: If the response is invalid.
    """
    if len(tool_response["research_objectives"]) != len(input_objectives):
        raise ValidationError("The number of research objectives does not match the input.")

    mapped_input_objectives = {objective["number"]: objective for objective in input_objectives}

    for objective in tool_response["research_objectives"]:
        objective_tasks = [
            task
            for task in tool_response["research_tasks"]
            if task["objective_number"] == objective["objective_number"]
        ]

        if input_objective := mapped_input_objectives.get(objective["objective_number"]):
            if len(objective_tasks) != len(input_objective["research_tasks"]):
                raise ValidationError(
                    f"The number of tasks for objective number {objective['objective_number']} does not match the input."
                )
        else:
            raise ValidationError(
                f"Objective number {objective['objective_number']} not found in the input objectives."
            )

        for relationship in objective["relationships"]:
            if len(relationship) != 2:
                raise ValidationError("Each relationship must have exactly two elements")

            target_id = relationship[0]
            try:
                if "." in target_id:
                    obj_num, task_num = map(int, target_id.split("."))
                    if not any(
                        task["objective_number"] == obj_num and task["task_number"] == task_num
                        for task in tool_response["research_tasks"]
                    ):
                        raise ValidationError(f"Referenced task {target_id} not found")
                elif not any(obj["objective_number"] == int(target_id) for obj in tool_response["research_objectives"]):
                    raise ValidationError(f"Referenced objective {target_id} not found")
            except ValueError as e:
                raise ValidationError(f"Invalid relationship target ID format: {target_id}") from e

    for task in tool_response["research_tasks"]:
        for relationship in task["relationships"]:
            if len(relationship) != 2:
                raise ValidationError("Each relationship must have exactly two elements")

            target_id = relationship[0]
            try:
                if "." in target_id:
                    obj_num, task_num = map(int, target_id.split("."))
                    if not any(
                        t["objective_number"] == obj_num and t["task_number"] == task_num
                        for t in tool_response["research_tasks"]
                    ):
                        raise ValidationError(f"Referenced task {target_id} not found")
                elif not any(obj["objective_number"] == int(target_id) for obj in tool_response["research_objectives"]):
                    raise ValidationError(f"Referenced objective {target_id} not found")
            except ValueError as e:
                raise ValidationError(f"Invalid relationship target ID format: {target_id}") from e


async def enrich_and_plan_research_plan_generation(
    task_description: str, *, input_objectives: list[ResearchObjective]
) -> ResearchPlanDTO:
    """Generate a detailed plan for the research plan section.

    Args:
        task_description: The task description for the research plan.
        input_objectives: The input research objectives. This value is piped through to the validator.

    Returns:
        The research plan dto.
    """
    return await handle_completions_request(
        prompt_identifier="enrich_and_plan_research_plan",
        messages=task_description,
        response_type=ResearchPlanDTO,
        response_schema=response_schema,
        validator=partial(research_plan_validator, input_objectives=input_objectives),
    )


async def handle_enrich_and_plan_research_plan(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objectives: list[ResearchObjective],
    form_inputs: dict[str, str],
) -> ResearchPlanDTO:
    """Generate a detailed plan for the research plan section.

    Args:
        application_id: The ID of the grant application.
        grant_section: The grant section for the research plan.
        research_objectives: The research objectives.
        form_inputs: The user inputs.

    Returns:
        The research plan dto.
    """
    prompt = ENRICH_AND_PLAN_RESEARCH_PLAN_USER_PROMPT.substitute(
        research_objectives=research_objectives,
        keywords=grant_section["keywords"],
        topics=grant_section["topics"],
        max_words=grant_section["max_words"],
        user_inputs=form_inputs,
    )
    rag_results = await retrieve_documents(
        application_id=application_id,
        search_queries=grant_section["search_queries"],
        task_description=prompt,
    )
    return await with_prompt_evaluation(
        prompt_identifier="research_plan_generation",
        prompt=prompt.to_string(rag_results=rag_results),
        prompt_handler=partial(enrich_and_plan_research_plan_generation, input_objectives=research_objectives),
        passing_score=90,
        increment=5,
        retries=5,
        criteria=[
            EvaluationCriterion(
                name="Completeness",
                evaluation_instructions="""
    Evaluate the completeness of the research plan by checking:

    1. Research Objectives:
        - Each objective has all required fields (title, description, relationships, etc.)
        - All objectives from input are included
        - Objectives have appropriate level of detail in descriptions
        - At least 3 guiding questions per objective
        - Contains 5+ relevant keywords
        - Contains 3-10 search queries

    2. Research Tasks:
        - Each task has all required fields
        - All tasks from input objectives are included
        - Tasks have appropriate level of detail
        - At least 3 guiding questions per task
        - Contains 5+ relevant keywords
        - Contains 3-10 search queries

    3. Word Count Allocation:
        - Each objective and task has specified max_words
        - Word counts are reasonable for complexity
        - Total word count matches section limit

    Score lower if any required elements are missing or incomplete.
    """,
            ),
            EvaluationCriterion(
                name="Correctness",
                evaluation_instructions="""
    Assess the technical accuracy and logical consistency:

    1. Objective and Task Structure:
        - Objective numbers match input objectives
        - Task numbers correctly associated with objectives
        - Hierarchical structure maintains correct parent-child relationships

    2. Data Formatting:
        - Numbers are within valid ranges (1-100)
        - Relationship arrays contain exactly 2 elements
        - IDs in relationships use correct format (e.g., "1" or "1.1")

    3. Content Logic:
        - Instructions align with objective/task purpose
        - Guiding questions are relevant to the objective/task
        - Keywords relate to content and purpose
        - Search queries are well-formed and relevant

    Score lower for any technical errors or logical inconsistencies.
    """,
            ),
            EvaluationCriterion(
                name="Prompt Adherence",
                evaluation_instructions="""
    Evaluate how well the response follows prompt requirements:

    1. Task Description Adherence:
        - Follows the 8-step process outlined
        - Properly analyzes objectives
        - Establishes clear narrative
        - Identifies relationships correctly
        - Creates appropriate guiding questions
        - Provides detailed descriptions
        - Includes generation instructions
        - Calculates word counts
        - Generates search queries

    2. Output Structure:
        - Follows specified JSON structure exactly
        - All required fields present
        - Arrays contain minimum required items
        - Data types match schema requirements

    3. Metadata Integration:
        - Effectively uses provided keywords
        - Incorporates specified topics
        - References source materials appropriately

    Score lower if response deviates from prompt instructions.
    """,
            ),
            EvaluationCriterion(
                name="Relevance",
                evaluation_instructions="""
    Assess the relevance and appropriateness of content:

    1. Content Relevance:
        - Keywords align with research domain
        - Search queries target relevant information
        - Guiding questions address core research aspects
        - Instructions focus on essential elements

    2. Source Integration:
        - Content reflects provided research objectives
        - Incorporates user inputs appropriately
        - Utilizes retrieval results effectively
        - References provided keywords and topics

    3. Purpose Alignment:
        - Content supports overall research goals
        - Tasks contribute to objective completion
        - Instructions guide toward desired outcomes
        - Questions probe relevant aspects

    Score lower if content strays from research focus or fails to integrate sources.
    """,
            ),
            EvaluationCriterion(
                name="Relationships",
                evaluation_instructions="""
    Evaluate the quality and logic of relationships:

    1. Relationship Structure:
        - Each relationship properly formatted [id, description]
        - IDs reference valid objectives or tasks
        - Descriptions explain connection clearly

    2. Relationship Logic:
        - Dependencies are correctly identified
        - Progression between objectives is logical
        - Task interdependencies make sense
        - Circular dependencies are avoided

    3. Relationship Completeness:
        - All important connections identified
        - Bidirectional relationships noted where appropriate
        - Cross-objective relationships included
        - Task-to-task relationships documented

    4. Relationship Description Quality:
        - Clear explanation of connection type
        - Specific about how elements relate
        - Identifies impact and dependencies
        - Notes feedback loops where relevant

    Score lower for missing, incorrect, or poorly described relationships.
    """,
            ),
        ],
    )
