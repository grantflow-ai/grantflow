from collections import defaultdict
from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import GrantLongFormSection, ResearchObjective
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from services.backend.src.rag.completion import handle_completions_request
from services.backend.src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from services.backend.src.rag.retrieval import retrieve_documents
from services.backend.src.utils.prompt_template import PromptTemplate

EXTRACT_RELATIONSHIPS_SYSTEM_PROMPT: Final[str] = """
You are a specialized component in a RAG system dedicated to analyzing STEM grant applications.
Your specific role is to identify and characterize relationships between research objectives and tasks,
helping create a coherent research narrative that demonstrates strategic planning and scientific rigor.
"""

EXTRACT_RELATIONSHIPS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_relationships",
    template="""
    Your task is to analyze the research objectives and identify the significant relationships between them and their tasks. This critical analysis will guide the generation of a comprehensive, coherent, and persuasive work plan that demonstrates a well-structured research strategy.

    ## Sources

    Research Objectives:
        <research_objectives>
        ${research_objectives}
        </research_objectives>

    Retrieval Results:
        <rag_results>
        ${rag_results}
        </rag_results>

    User Inputs:
        <user_inputs>
        ${user_inputs}
        </user_inputs>

    ## Instructions

    1. Analyze the Research Objectives:
        - Examine each research objective and its constituent research tasks in detail.
        - Assess how each task contributes to fulfilling its parent objective.
        - Identify the scientific and methodological connections between objectives and tasks.
        - Consider both explicit connections (clearly stated) and implicit connections (logically necessary).
        - Evaluate the temporal sequencing and logical flow between objectives and tasks.

    2. Identify and Characterize Relationships:
        - Identify dependencies between objectives (e.g., Objective 2 builds upon the foundation established in Objective 1).
        - Identify dependencies between tasks within an objective (e.g., Task 1.1 must be completed before Task 1.2 can begin).
        - Identify dependencies across objectives (e.g., Findings from Task 2.3 will inform the approach taken in Objective 4).
        - Specify the type and nature of each relationship using the following categories:
              * Sequential: One element must precede another in time (prerequisite relationships)
              * Causal: One element directly leads to or influences another
              * Complementary: Elements work together synergistically without strict dependencies
              * Iterative: Elements involve feedback loops or cyclical refinement processes
              * Methodological: Elements share similar techniques or approaches
              * Conceptual: Elements are connected through theoretical frameworks
        - For each relationship, explain precisely how the elements interact and why the relationship exists.
        - Ensure relationships are bidirectional when appropriate (i.e., consider how elements influence each other).

    3. Ensure Coherence and Strategic Alignment:
        - Verify that the identified relationships form a cohesive and logical research strategy.
        - Check that relationships demonstrate how the objectives collectively address the overall research goals.
        - Ensure the relationships describe clear pathways for information flow between research components.
        - Confirm that the relationship network doesn't contain contradictions or impossible sequences.
        - Focus on relationships that meaningfully contribute to the research narrative and avoid trivial connections.

    ## Relationship Notation

    When identifying relationships between objectives and tasks, use the following notation:
    - For relationships between objectives: use the objective numbers (e.g., "1", "2", "3")
    - For relationships between tasks: use the full task ID including objective (e.g., "1.1", "2.3", "3.2")
    - For relationships between objectives and tasks: use the appropriate notation for each element

    ## Output Structure

    Respond with a JSON object adhering to the following format:

    ```json
    {
        "relationships": [
            ["1", "2", "Objective 1 provides the foundational data required for Objective 2. Specifically, the analytical methods developed in Objective 1 enable the interventions planned in Objective 2. In turn, Objective 2 will provide feedback to refine the experimental design in Objective 1."],
            ["1.1", "1.2", "Task 1.1 will generate preliminary data needed to optimize the protocols in Task 1.2. Both tasks form an iterative cycle where results from Task 1.2 may necessitate refinements to the methods in Task 1.1."],
            ["1.2", "2.1", "The methodology developed in Task 1.2 will be directly applied to Task 2.1. The results from Task 2.1 will then inform further optimization of the methodology in Task 1.2."],
            ["2", "3", "The intervention strategies developed in Objective 2 provide the foundation for the translational applications explored in Objective 3. This sequential relationship ensures that applied work builds on validated mechanisms."]
        ]
    }
    ```

    Each relationship entry in the array should contain exactly three elements:
        1. The identifier for the first research element (objective or task)
        2. The identifier for the second research element (objective or task)
        3. A detailed description of the relationship that explains the nature, type, and significance of the connection (100-200 words)

        Focus on identifying the most significant and meaningful relationships rather than attempting to connect every possible pair of research elements. Quality is more important than quantity - each relationship should be substantive and contribute to understanding the research plan.
    """,
)
relationships_schema = {
    "type": "object",
    "properties": {
        "relationships": {
            "type": "array",
            "items": {
                "type": "array",
                "items": {
                    "type": "string",
                },
                "minItems": 3,
                "maxItems": 3,
            },
        },
    },
    "required": ["relationships"],
}


class RelationshipsDTO(TypedDict):
    relationships: list[tuple[str, str, str]]


def validate_relationships_response(
    response: RelationshipsDTO, *, research_objectives: list[ResearchObjective] | None
) -> None:
    if "relationships" not in response:
        raise ValidationError("Missing relationships in response", context=response)

    if not response["relationships"]:
        raise ValidationError("Relationships array is empty", context=response)

    if not research_objectives:
        return

    valid_ids = set()
    for obj_idx, objective in enumerate(research_objectives, start=1):
        obj_id = str(obj_idx)
        valid_ids.add(obj_id)

        if "research_tasks" in objective:
            for task_idx, _ in enumerate(objective["research_tasks"], start=1):
                task_id = f"{obj_id}.{task_idx}"
                valid_ids.add(task_id)

    for idx, relationship in enumerate(response["relationships"]):
        if len(relationship) != 3:
            raise ValidationError(
                f"Relationship at index {idx} has incorrect format",
                context={"relationship": relationship, "expected_length": 3},
            )

        source_id, target_id, description = relationship

        if source_id not in valid_ids:
            raise ValidationError(
                f"Invalid source ID in relationship at index {idx}",
                context={
                    "invalid_id": source_id,
                    "relationship": relationship,
                    "valid_ids": sorted(valid_ids),
                },
            )

        if target_id not in valid_ids:
            raise ValidationError(
                f"Invalid target ID in relationship at index {idx}",
                context={
                    "invalid_id": target_id,
                    "relationship": relationship,
                    "valid_ids": sorted(valid_ids),
                },
            )

        if not description or len(description.strip()) < 50:
            raise ValidationError(
                f"Relationship description at index {idx} is too short",
                context={"relationship": relationship, "min_length": 50},
            )

        if source_id == target_id:
            raise ValidationError(
                f"Self-relationship detected at index {idx}",
                context={"relationship": relationship},
            )

    relationship_pairs = [(r[0], r[1]) for r in response["relationships"]]
    unique_pairs = set(relationship_pairs)

    if len(unique_pairs) != len(relationship_pairs):
        duplicates = [pair for pair in relationship_pairs if relationship_pairs.count(pair) > 1]
        raise ValidationError(
            "Duplicate relationships detected (same source and target)",
            context={"duplicate_pairs": duplicates},
        )

    objective_ids = [str(i) for i in range(1, len(research_objectives) + 1)]
    objectives_in_relationships = set()

    for relationship in response["relationships"]:
        source_id, target_id, _ = relationship
        if source_id in objective_ids:
            objectives_in_relationships.add(source_id)
        if target_id in objective_ids:
            objectives_in_relationships.add(target_id)

    if len(objectives_in_relationships) < len(objective_ids) * 0.7:
        raise ValidationError(
            "Insufficient coverage of research objectives in relationships",
            context={
                "objectives_covered": sorted(objectives_in_relationships),
                "all_objectives": objective_ids,
                "coverage_percent": len(objectives_in_relationships) / len(objective_ids) * 100,
            },
        )


async def extract_relationships_generation(
    task_description: str,
    *,
    research_objectives: list[ResearchObjective] | None = None,
) -> RelationshipsDTO:
    return await handle_completions_request(
        prompt_identifier="plan_relationships",
        messages=task_description,
        response_type=RelationshipsDTO,
        response_schema=relationships_schema,
        model=ANTHROPIC_SONNET_MODEL,
        system_prompt=EXTRACT_RELATIONSHIPS_SYSTEM_PROMPT,
        validator=partial(validate_relationships_response, research_objectives=research_objectives),
        max_attempts=5,
    )


criteria: list[EvaluationCriterion] = [
    EvaluationCriterion(
        name="Relationship Identification",
        evaluation_instructions="""
        Evaluate the comprehensiveness and accuracy of relationship identification:
            - Appropriate relationships are identified between research objectives
            - Meaningful connections between tasks within objectives are captured
            - Cross-objective task relationships are properly identified
            - The most significant and relevant relationships are prioritized
            - Relationships cover different aspects of the research plan (methodological, sequential, etc.)
        """,
        weight=1.2,
    ),
    EvaluationCriterion(
        name="Relationship Description Quality",
        evaluation_instructions="""
        Assess the quality and depth of relationship descriptions:
            - Descriptions clearly explain how elements interact and influence each other
            - The nature of dependencies is specified (sequential, causal, complementary, etc.)
            - Descriptions include specific scientific or methodological connections
            - Explanations are detailed and informative (100-200 words)
            - Descriptions avoid vagueness and overgeneralization
        """,
    ),
    EvaluationCriterion(
        name="Research Strategy Coherence",
        evaluation_instructions="""
        Evaluate how well the relationships support a coherent research strategy:
            - Relationships collectively form a logical workflow
            - The network of relationships demonstrates a clear research narrative
            - Relationships support the overarching research goals
            - The structure aligns with scientific best practices in the domain
            - There are no contradictions or impossible sequences in the relationship network
        """,
    ),
    EvaluationCriterion(
        name="Bidirectional Considerations",
        evaluation_instructions="""
        Assess the bidirectional nature of relationships where appropriate:
            - Feedback mechanisms between research elements are identified
            - Iterative processes are properly characterized
            - Mutual influences between elements are considered
            - Emphasis is placed on information flow in both directions where relevant
            - Appropriate balance between unidirectional and bidirectional relationships
        """,
    ),
    EvaluationCriterion(
        name="Technical Accuracy",
        evaluation_instructions="""
        Evaluate the technical accuracy of the relationships:
            - Correct notation is used for objectives and tasks
            - Relationships are grounded in the scientific methodology described
            - Temporal and logical sequencing is scientifically sound
            - Dependencies reflect actual scientific and methodological requirements
            - Relationship statements demonstrate understanding of the research domain
        """,
    ),
    EvaluationCriterion(
        name="Strategic Value for Grant Application",
        evaluation_instructions="""
        Assess the strategic value of the identified relationships for the grant application:
            - Relationships highlight the integrated nature of the research plan
            - Connections demonstrate thoughtful research design
            - The relationship structure emphasizes efficiency and effectiveness
            - Relationships underscore the feasibility of the research plan
            - The network of relationships strengthens the overall grant narrative
        """,
    ),
]


async def handle_extract_relationships(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objectives: list[ResearchObjective],
    form_inputs: dict[str, str],
) -> dict[str, list[tuple[str, str]]]:
    prompt = EXTRACT_RELATIONSHIPS_USER_PROMPT.substitute(
        research_objectives=[
            {
                "number": str(objective["number"]),
                "title": objective["title"],
                "description": objective.get("description", ""),
                "research_tasks": [
                    {
                        "number": f"{objective['number']}.{task['number']}",
                        "title": task["title"],
                        "description": task.get("description", ""),
                    }
                    for task in objective["research_tasks"]
                ],
            }
            for objective in research_objectives
        ],
        user_inputs=form_inputs,
    )

    rag_results = await retrieve_documents(
        application_id=application_id,
        search_queries=grant_section["search_queries"],
        task_description=str(prompt),
    )

    result = await with_prompt_evaluation(
        prompt_identifier="extract_relationships",
        prompt=prompt.to_string(rag_results=rag_results),
        prompt_handler=extract_relationships_generation,
        research_objectives=research_objectives,
        criteria=criteria,
        passing_score=80,
        increment=10,
        retries=5,
    )
    ret = defaultdict[str, list[tuple[str, str]]](list)
    for dependent_id, target_id, description in result["relationships"]:
        ret[dependent_id].append((target_id, description))

    return ret
