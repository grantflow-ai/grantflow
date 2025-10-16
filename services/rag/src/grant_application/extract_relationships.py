from collections import defaultdict
from functools import partial
from typing import TYPE_CHECKING, Final, TypedDict

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger

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
You are a professional grant writer and research analyst embedded in a system designed to produce best-in-class grant applications.
Your role is to identify and characterize meaningful relationships between research objectives and tasks, revealing a coherent,
strategically aligned research plan.

### Operating Pipeline
1. **Read** all input materials carefully - including research objectives, their tasks, RAG results, and form inputs.
2. **Identify**:
   - Logical, methodological, or conceptual dependencies between objectives and tasks.
   - Sequential, causal, complementary, or iterative flows within the project.
   - Shared resources, data, or methods that connect components.
3. **Reason**:
   - Determine which relationships best demonstrate scientific planning, integration, and feasibility.
   - Plan concise and accurate explanations of how objectives and tasks reinforce each other.
   - Ensure clarity, factual accuracy, and balance between depth and brevity.
4. **Write**:
   - Generate structured relationships that follow the schema precisely.
   - Each description must be specific, measurable, and 100-200 words in length.
   - Use professional academic tone, concrete examples, and scientific terminology.
   - Emphasize purpose, mechanism of interaction, and significance for project success.

### Style and Fidelity
- Preserve the tone and terminology of the input.
- Integrate researcher names, technical methods, or references from the data where relevant.
- Prefer concise, evidence-based reasoning over generic claims.
- Ensure internal logical flow across all relationships.
"""

EXTRACT_RELATIONSHIPS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_relationships",
    template="""
Identify and articulate significant relationships between research objectives and tasks for the grant narrative.

## Pipeline
1. **Read** the full input - objectives, tasks, contextual RAG data, and form inputs.
2. **Identify**:
   - Dependencies (between objectives, tasks, or both).
   - Relationship types: Sequential, Causal, Complementary, Iterative, Methodological, or Conceptual.
   - Any explicitly stated links or shared methodologies.
3. **Reason**:
   - Map how each relationship contributes to strategic alignment and overall feasibility.
   - Plan explanations that are specific, balanced, and well-structured (100-200 words).
4. **Write**:
   - Produce relationship objects following the schema exactly.
   - Each description should clearly explain:
       * The relationship type and interaction mechanism.
       * How the elements collaborate or depend on each other.
       * Why the relationship strengthens the research plan.
   - Use concise academic tone and include examples or details where relevant.

## Input
<research_objectives>${research_objectives}</research_objectives>
<rag_results>${rag_results}</rag_results>
<form_inputs>${form_inputs}</form_inputs>

## Notation
- Objectives: "1", "2", "3"
- Tasks: "1.1", "2.3", "3.2"

## Required Output Schema
Array of relationship objects with:
- **source**: Source identifier (e.g., "1", "2.3")
- **target**: Target identifier (e.g., "1", "2.3")
- **desc**: Relationship description (100-200 words)

## Output Requirements
- Avoid duplicates and self-relationships.
- Focus on clarity, logical structure, and meaningful connections.
- Quality over quantity - ensure every relationship adds narrative or methodological value.
""",
)

RELATIONSHIPS_REFINEMENT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="refine_relationships",
    template="""
You are a professional grant writer and scientific editor responsible for refining research-relationship mappings.
Your goal is to improve clarity, precision, and structural coverage while preserving logical and factual accuracy.

## Reasoning Pipeline
1. **Read** the provided research objectives and draft relationships carefully.
2. **Identify**:
   - Duplicates, self-links, or irrelevant pairs.
   - Weak or vague descriptions needing clarity or evidence.
   - Missing coverage - ensure at least 70% of objectives appear as source or target.
3. **Reason**:
   - Plan targeted improvements to strengthen logic, coverage, and coherence.
   - Maintain fidelity to scientific tone and technical content.
   - Align descriptions with the overall research plan's narrative flow.
4. **Write**:
   - Produce the refined list using the same schema (source, target, desc).
   - Each description must remain 100-200 words, specific, and logically grounded.
   - Retain valid insights; rephrase only for clarity or structure.
   - Use examples, names, or methods naturally - evidence is the best validation.

## Input
<research_objectives>${research_objectives}</research_objectives>
<draft_relationships>${draft_relationships}</draft_relationships>

## Output Requirements
1. Remove duplicates and self-links.
2. Ensure schema conformity and field completeness.
3. Strengthen scientific reasoning and logical flow.
4. Maintain academic tone and factual precision.
5. Provide coherent, refined relationships ready for inclusion in the final grant narrative.

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

    research_payload = [
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

    refinement_prompt = RELATIONSHIPS_REFINEMENT_PROMPT.to_string(
        research_objectives=research_payload,
        draft_relationships=draft,
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
