from collections import defaultdict
from functools import partial
from typing import TYPE_CHECKING, Final, TypedDict

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective
from packages.shared_utils.src.ai import ANTHROPIC_SONNET_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)

ResearchRelationships = dict[str, list[tuple[str, str]]]


EXTRACT_RELATIONSHIPS_SYSTEM_PROMPT: Final[str] = """
Identify and characterize relationships between research objectives and tasks.
Create coherent research narrative demonstrating strategic planning.
"""

EXTRACT_RELATIONSHIPS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_relationships",
    template="""
Identify significant relationships between research objectives and tasks.

## Input

<research_objectives>${research_objectives}</research_objectives>
<rag_results>${rag_results}</rag_results>
<form_inputs>${form_inputs}</form_inputs>

## Task

Analyze objectives and tasks to identify:
- Dependencies (between objectives, between tasks, across objectives)
- Relationship types: Sequential, Causal, Complementary, Iterative, Methodological, Conceptual
- Information flow and strategic alignment

## Notation

- Objectives: "1", "2", "3"
- Tasks: "1.1", "2.3", "3.2"

## Output

Array of relationships as three-element arrays: [source_id, target_id, description]

Description (100-200 words) should explain:
- Relationship type and nature
- How elements interact
- Significance for research plan

Focus on meaningful relationships (quality over quantity).

## Example

Input:
```
Objective 1: Develop CRISPR gene editing platform
  Task 1.1: Optimize Cas9 delivery
  Task 1.2: Validate off-target effects

Objective 2: Test platform in preclinical models
  Task 2.1: Establish tumor xenograft models
  Task 2.2: Assess therapeutic efficacy
```

Output:
```json
{
  "relationships": [
    [
      "1.1",
      "1.2",
      "Sequential relationship: Task 1.1 (Cas9 delivery optimization) must precede Task 1.2 (off-target validation) because effective delivery mechanisms are prerequisite for meaningful off-target analysis. The optimized delivery parameters from 1.1 (e.g., nanoparticle composition, dosing) directly inform the experimental design for 1.2. This sequential dependency ensures that off-target assessment reflects realistic therapeutic conditions rather than suboptimal delivery artifacts."
    ],
    [
      "1",
      "2",
      "Causal relationship: Objective 1 (platform development) directly enables Objective 2 (preclinical testing). The validated CRISPR platform with optimized delivery and confirmed specificity from Objective 1 becomes the therapeutic intervention tested in Objective 2. Findings from 1.2 (off-target validation) establish safety parameters that guide dosing strategies in 2.2. This causal chain demonstrates logical research progression from tool development to biological validation."
    ],
    [
      "1.2",
      "2.1",
      "Methodological relationship: Task 1.2 (off-target validation) and Task 2.1 (xenograft establishment) share whole-genome sequencing methodologies and bioinformatics pipelines. Technical expertise and protocols developed for genomic analysis in 1.2 will be adapted for tumor characterization in 2.1, creating methodological synergy that enhances experimental rigor and reduces technical risk across both objectives."
    ]
  ]
}
```

Return array with all significant relationships.
""",
)

relationships_schema = {
    "type": "object",
    "properties": {
        "relationships": {
            "type": "array",
            "description": "Array of relationships between research objectives and tasks",
            "items": {
                "type": "array",
                "description": "A three-element array representing a relationship: [source_id, target_id, description]",
                "items": {
                    "type": "string",
                    "description": "Element 0: source identifier (e.g., '1', '2.3'), Element 1: target identifier, Element 2: detailed relationship description (100-200 words)",
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
    trace_id: str,
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
        trace_id=trace_id,
    )


async def handle_extract_relationships(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    research_objectives: list[ResearchObjective],
    form_inputs: ResearchDeepDive,
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
) -> ResearchRelationships:
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
        form_inputs=form_inputs,
    )

    rag_results = await retrieve_documents(
        application_id=application_id,
        search_queries=grant_section["search_queries"],
        task_description=str(prompt),
        trace_id=trace_id,
    )

    # Compress only the RAG results before template substitution
    compressed_rag_results = compress_prompt_text("\n".join(rag_results), aggressive=True)

    logger.debug(
        "Prepared and compressed RAG results for relationship extraction",
        original_rag_chars=len("\n".join(rag_results)),
        compressed_rag_chars=len(compressed_rag_results),
        trace_id=trace_id,
    )

    full_prompt = prompt.to_string(rag_results=compressed_rag_results)

    result = await with_evaluation(
        prompt_identifier="extract_relationships",
        prompt=full_prompt,
        prompt_handler=extract_relationships_generation,
        research_objectives=research_objectives,
        trace_id=trace_id,
        **get_evaluation_kwargs(
            "extract_relationships",
            job_manager,
            section_config=grant_section,
            rag_context=rag_results,
            research_objectives=research_objectives,
            is_json_content=True,
        ),
    )
    ret: ResearchRelationships = defaultdict(list)
    for dependent_id, target_id, description in result["relationships"]:
        ret[dependent_id].append((target_id, description))

    return ret
