from collections import defaultdict
from functools import partial
from typing import TYPE_CHECKING, Final, TypedDict

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize

from services.rag.src.utils.completion import handle_completions_request
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

Array of relationship objects with properties:
- **source**: Source identifier (e.g., "1", "2.3")
- **target**: Target identifier (e.g., "1", "2.3")
- **desc**: Relationship description (100-200 words)

Description should explain:
- Relationship type and nature
- How elements interact
- Significance for research plan

Focus on meaningful relationships (quality over quantity).
""",
)

RELATIONSHIPS_REFINEMENT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="refine_relationships",
    template="""
Review the draft relationships and produce an improved version that strictly follows the schema.

## Research Objectives
${research_objectives}

## Draft Relationships
${draft_relationships}

## Requirements
1. Remove duplicate (source, target) pairs and any self-relationships.
2. Ensure each relationship description stays within 100-200 words and remains specific.
3. Cover at least 70% of research objectives; add concise relationships when coverage is lacking.
4. Preserve valid insights from the draft while improving clarity and structure.

Return the full relationship list using the exact schema.
""",
)

relationships_schema = {
    "type": "object",
    "properties": {
        "relationships": {
            "type": "array",
            "description": "Relationships between research objectives and tasks",
            "items": {
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "description": "Source identifier (e.g., '1', '2.3')",
                    },
                    "target": {
                        "type": "string",
                        "description": "Target identifier (e.g., '1', '2.3')",
                    },
                    "desc": {
                        "type": "string",
                        "minLength": 50,
                        "description": "Relationship description (100-200 words)",
                    },
                },
                "required": ["source", "target", "desc"],
            },
        },
    },
    "required": ["relationships"],
}


class RelationshipItem(TypedDict):
    source: str
    target: str
    desc: str


class RelationshipsDTO(TypedDict):
    relationships: list[RelationshipItem]


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
        source_id = relationship.get("source")
        target_id = relationship.get("target")
        description = relationship.get("desc")

        if not source_id or not target_id or not description:
            raise ValidationError(
                f"Relationship at index {idx} missing required fields",
                context={"relationship": relationship, "required": ["source", "target", "desc"]},
            )

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

        if len(description.strip()) < 50:
            raise ValidationError(
                f"Relationship description at index {idx} is too short",
                context={"relationship": relationship, "min_length": 50},
            )

        if source_id == target_id:
            raise ValidationError(
                f"Self-relationship detected at index {idx}",
                context={"relationship": relationship},
            )

    relationship_pairs = [(r["source"], r["target"]) for r in response["relationships"]]
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
        source_id = relationship["source"]
        target_id = relationship["target"]
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
        model=GEMINI_FLASH_MODEL,
        system_prompt=EXTRACT_RELATIONSHIPS_SYSTEM_PROMPT,
        validator=partial(validate_relationships_response, research_objectives=research_objectives),
        max_attempts=5,
        trace_id=trace_id,
    )


async def refine_relationships(
    *,
    draft: RelationshipsDTO,
    research_objectives: list[ResearchObjective],
    trace_id: str,
) -> RelationshipsDTO:
    if not research_objectives:
        return draft

    research_payload = serialize(
        [
            {
                "number": str(obj["number"]),
                "title": obj["title"],
                "tasks": [
                    {
                        "number": f"{obj['number']}.{task['number']}",
                        "title": task["title"],
                    }
                    for task in obj.get("research_tasks", [])
                ],
            }
            for obj in research_objectives
        ]
    ).decode("utf-8")

    refinement_prompt = RELATIONSHIPS_REFINEMENT_PROMPT.to_string(
        research_objectives=research_payload,
        draft_relationships=serialize(draft).decode("utf-8"),
    )

    return await handle_completions_request(
        prompt_identifier="refine_relationships",
        messages=refinement_prompt,
        response_type=RelationshipsDTO,
        response_schema=relationships_schema,
        model=GEMINI_FLASH_MODEL,
        system_prompt=EXTRACT_RELATIONSHIPS_SYSTEM_PROMPT,
        validator=partial(validate_relationships_response, research_objectives=research_objectives),
        max_attempts=3,
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

    compressed_rag_results = compress_prompt_text("\n".join(rag_results), aggressive=True)

    logger.debug(
        "Prepared and compressed RAG results for relationship extraction",
        original_rag_chars=len("\n".join(rag_results)),
        compressed_rag_chars=len(compressed_rag_results),
        trace_id=trace_id,
    )

    full_prompt = prompt.to_string(rag_results=compressed_rag_results)

    draft_result = await extract_relationships_generation(
        full_prompt,
        trace_id=trace_id,
        research_objectives=research_objectives,
    )

    await job_manager.ensure_not_cancelled()

    refined_result = await refine_relationships(
        draft=draft_result,
        research_objectives=research_objectives,
        trace_id=trace_id,
    )

    result = refined_result or draft_result

    ret: ResearchRelationships = defaultdict(list)
    for relationship in result["relationships"]:
        ret[relationship["source"]].append((relationship["target"], relationship["desc"]))

    return ret
