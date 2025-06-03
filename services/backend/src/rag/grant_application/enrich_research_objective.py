from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from services.backend.src.rag.completion import handle_completions_request
from services.backend.src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from services.backend.src.rag.retrieval import retrieve_documents
from services.backend.src.utils.prompt_template import PromptTemplate

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

    1. Formulate between 3 to 10 guiding questions for the objective and its tasks:
        - Focus on questions that address the core purpose, methodology, expected outcomes, potential challenges, and broader implications of the research.
        - Ground the questions in the provided keywords and topics to ensure relevance and focus.
        - Include questions that prompt consideration of scientific rigor, innovation potential, and impact.
        - Ensure questions address the relationship between the main objective and its component tasks.
        - Craft questions that will elicit evidence-based, detailed responses suitable for a grant application.

    2. Generate detailed descriptions for the objective and its tasks, addressing the following elements:
        - **Purpose:** Clearly state the purpose and its contribution to the overall research goal, emphasizing scientific significance.
        - **Methodology:** Describe the methods and techniques to be employed with technical precision and scientific rigor.
        - **Expected Results:** Outline anticipated outcomes, deliverables, and potential impact with measurable indicators.
        - **Dependencies:** Summarize key dependencies, highlighting critical path relationships between tasks and the main objective.
        - **Potential Risks:** Identify potential challenges, limitations, and mitigation strategies backed by scientific reasoning.
        - **Innovation Elements:** Highlight novel approaches or techniques that distinguish this research in its field.
        - Ensure all descriptions are grounded in the provided keywords and topics.
        - Support descriptions with evidence from the retrieval results where applicable.

    3. Write detailed instructions for AI text generation:
        - Provide detailed instructions for AI text generation of the objective and task descriptions.
        - Prioritize information from the sources and incorporate metadata.
        - Specify the desired writing style (e.g., formal and academic, persuasive, concise).
        - Include instructions on the level of detail, use of technical terminology, and any specific formatting requirements.
        - Explicitly instruct the AI to use the provided keywords and topics to guide the generation of the text.
        - Direct the AI to maintain a cohesive narrative across the objective and its tasks.
        - Include instructions for emphasizing competitive aspects and advantages of the research approach.
        - Provide guidance on balancing technical detail with accessibility for grant reviewers.

    4. Generate between 3-10 search queries for retrieval of relevant information for the objective and its tasks:
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

    Respond with a JSON object adhering to the following format:

    ```json
    {
        "research_objective": {
            "instructions": "Detailed instructions for text generation",
            "description": "Detailed description of the research objective",
            "guiding_questions": [
                "Question 1",
                "Question 2",
                "Question 3",
                "..."
            ],
            "search_queries": [
                "Query 1",
                "Query 2",
                "Query 3",
                "..."
            ]
        },
        "research_tasks": [
            {
                "instructions": "Detailed instructions for text generation",
                "description": "Detailed description of the research task",
                "guiding_questions": [
                    "Question 1",
                    "Question 2",
                    "Question 3",
                    "..."
                ],
                "search_queries": [
                    "Query 1",
                    "Query 2",
                    "Query 3",
                    "..."
                ]
            }
        ]
    }
    ```

    Important:
        - The objects in the research_tasks array must correspond exactly to the tasks of the input research objective.
        - Each task in the array represents a specific component of the overall research objective.
        - All text fields should be substantial (minimum 50 characters) and scientifically meaningful.
        - Search queries should be concise, specific, and focused on retrieving high-quality scientific information.
    """,
)

enriched_object_schema = {
    "type": "object",
    "properties": {
        "instructions": {"type": "string", "minLength": 50},
        "description": {"type": "string", "minLength": 50},
        "guiding_questions": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
        "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
    },
    "required": ["instructions", "description", "guiding_questions", "search_queries"],
}

research_objective_enrichment_schema = {
    "type": "object",
    "properties": {
        "research_objective": enriched_object_schema,
        "research_tasks": {
            "type": "array",
            "items": enriched_object_schema,
        },
    },
    "required": ["research_objective", "research_tasks"],
}


class EnrichmentDataDTO(TypedDict):
    instructions: str
    description: str
    guiding_questions: list[str]
    search_queries: list[str]


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

    for field in ["instructions", "description", "guiding_questions", "search_queries"]:
        if field not in objective:
            raise ValidationError(f"Missing {field} in objective", context=objective)

    if len(objective["guiding_questions"]) < 3:
        raise ValidationError(
            "Objective must have at least 3 guiding questions",
            context={"questions_count": len(objective["guiding_questions"])},
        )

    if len(objective["search_queries"]) < 3:
        raise ValidationError(
            "Objective must have at least 3 search queries", context={"queries_count": len(objective["search_queries"])}
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
        for field in ["instructions", "description", "guiding_questions", "search_queries"]:
            if field not in task:
                raise ValidationError(f"Missing {field} in task at index {i}", context=task)

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

        if len(task["instructions"].strip()) < 50:
            raise ValidationError(
                f"Task at index {i} instructions too short", context={"content": task["instructions"]}
            )

        if len(task["description"].strip()) < 50:
            raise ValidationError(f"Task at index {i} description too short", context={"content": task["description"]})


async def enrich_objective_generation(
    task_description: str,
    *,
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
    )


criteria: list[EvaluationCriterion] = [
    EvaluationCriterion(
        name="Objective & Task Alignment",
        evaluation_instructions="""
        Evaluate how well the enriched content aligns with the original objective:
            - Instructions and descriptions are directly relevant to the research objective and tasks
            - No critical aspect of the original objective is omitted or misinterpreted
            - The enrichment preserves the scientific intent of the objective and tasks
            - The guiding questions address the core aspects of the objective and tasks
            - Search queries effectively capture the domain-specific terminology
        """,
        weight=1.2,
    ),
    EvaluationCriterion(
        name="Scientific Rigor & Precision",
        evaluation_instructions="""
        Assess the scientific accuracy and technical precision:
            - Technical descriptions use correct scientific terminology
            - Methodological details are accurate and appropriate for the research context
            - Descriptions reflect current scientific understanding in the domain
            - Search queries use appropriate scientific terms relevant to the methodology
            - Guiding questions demonstrate understanding of scientific principles
        """,
    ),
    EvaluationCriterion(
        name="Comprehensiveness",
        evaluation_instructions="""
        Verify the completeness of the enriched content:
            - All required components are present (instructions, descriptions, questions, etc.)
            - Each task is appropriately enriched with substantive content
            - The scope of descriptions covers all relevant aspects of the objective/tasks
            - Guiding questions address different dimensions of the research
            - Search queries collectively cover the breadth of the research area
        """,
    ),
    EvaluationCriterion(
        name="Clarity & Structure",
        evaluation_instructions="""
        Evaluate the clarity and logical organization:
            - Instructions provide clear guidance for text generation
            - Descriptions are well-structured and logically organized
            - Guiding questions are clearly formulated and purposeful
            - Content follows a logical flow appropriate for a work plan
            - Search queries are well-formulated for effective retrieval
        """,
    ),
    EvaluationCriterion(
        name="Context Integration",
        evaluation_instructions="""
        Assess how well the enrichment incorporates provided context:
            - Keywords and topics are effectively integrated into the content
            - RAG results are appropriately utilized where relevant
            - User inputs are meaningfully incorporated
            - The enrichment builds upon rather than repeats source material
            - Search queries leverage context to enhance relevance
        """,
    ),
    EvaluationCriterion(
        name="Strategic Value",
        evaluation_instructions="""
        Evaluate the strategic quality of the enrichment:
            - Content emphasizes aspects likely to strengthen the grant application
            - Instructions guide toward persuasive and competitive content
            - Descriptions highlight innovative aspects and potential impact
            - Guiding questions prompt consideration of significance and broader implications
            - The enrichment positions the research effectively for evaluation
        """,
    ),
]


async def handle_enrich_objective(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objective: ResearchObjective,
    form_inputs: ResearchDeepDive,
) -> ObjectiveEnrichmentDTO:
    enrichment_prompt = ENRICH_RESEARCH_OBJECTIVE_USER_PROMPT.substitute(
        objective_and_tasks=research_objective,
        keywords=grant_section["keywords"],
        topics=grant_section["topics"],
        form_inputs=form_inputs,
    )

    enrichment_rag_results = await retrieve_documents(
        application_id=application_id,
        search_queries=grant_section["search_queries"],
        task_description=str(enrichment_prompt),
    )

    return await with_prompt_evaluation(
        prompt_identifier="enrich_objective",
        prompt_handler=enrich_objective_generation,
        prompt=enrichment_prompt.to_string(rag_results=enrichment_rag_results),
        input_objective=research_objective,
        criteria=criteria,
        passing_score=80,
        increment=10,
    )
