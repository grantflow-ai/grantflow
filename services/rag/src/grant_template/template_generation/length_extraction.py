from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPAnalysisConstraint, CFPSection
from packages.shared_utils.src.ai import DEFAULT_THINKING_BUDGET, GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

LENGTH_EXTRACTION_SYSTEM_PROMPT: Final[str] = (
    "You extract and normalize length constraints from grant application requirements. "
    "Convert page limits to words using 415 words/page."
)

LENGTH_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="length_extraction",
    template="""# Extract Section Length Constraints

    ## Organization Guidelines
    ${organization_guidelines}

    ## Sections with Constraints
    ${sections}

    ## Task

    For each section, extract length constraints and other formatting requirements.

    ### Length Constraints

    Parse the "constraints" field and extract length limits:
    - **Page limits**: "5 pages maximum" -> 2075 words (5 * 415)
    - **Word limits**: "500 words" -> 500 words
    - **Character limits**: "2000 characters" -> ~300 words (/ 6.5)
    - Use 415 words/page conversion factor

    ### Fields

    1. **length_limit**: Total words allowed (integer or null if no limit)
    2. **length_source**: Human-readable source from CFP (e.g., "5 pages maximum per CFP section 3.2")
    3. **other_limits**: Non-length constraints (font, spacing, margins, format)

    ### Guidelines

    - If section has no constraints, set length_limit=null, length_source=null, other_limits=[]
    - For page limits, convert to words: pages * 415
    - For character limits, convert to words: chars / 6.5
    - Preserve exact CFP language in length_source
    - Move non-length constraints to other_limits

    ### Output

    Return all sections with parsed length information.
""",
)

length_extraction_schema: Final = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "length_limit": {"type": "integer", "nullable": True},
                    "length_source": {"type": "string", "nullable": True},
                    "other_limits": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string"},
                                "value": {"type": "string"},
                                "quote": {"type": "string"},
                            },
                            "required": ["type", "value", "quote"],
                        },
                    },
                },
                "required": ["id", "length_limit", "length_source", "other_limits"],
            },
        },
    },
    "required": ["sections"],
}


class LengthConstraint(TypedDict):
    id: str
    length_limit: int | None
    length_source: str | None
    other_limits: list[CFPAnalysisConstraint]


class LengthExtractionResult(TypedDict):
    sections: list[LengthConstraint]


def validate_length_extraction(response: LengthExtractionResult, *, input_sections: list[CFPSection]) -> None:
    if not response.get("sections"):
        raise ValidationError("No sections in length extraction result")

    input_ids = {s["id"] for s in input_sections}
    output_ids = {s["id"] for s in response["sections"]}

    if input_ids != output_ids:
        added = output_ids - input_ids
        removed = input_ids - output_ids
        raise ValidationError(
            "Section ID mismatch in length extraction",
            context={
                "added_sections": list(added) if added else None,
                "removed_sections": list(removed) if removed else None,
                "expected_ids": sorted(input_ids),
                "actual_ids": sorted(output_ids),
                "recovery_instruction": "Match input section IDs exactly",
            },
        )

    for section in response["sections"]:
        if section["length_limit"] is not None:
            if section["length_limit"] <= 0:
                raise ValidationError(
                    "Length limit must be positive",
                    context={
                        "section_id": section["id"],
                        "length_limit": section["length_limit"],
                        "recovery_instruction": "Set positive word count or null",
                    },
                )
            if section["length_limit"] > 50000:
                logger.warning(
                    "Unusually large length limit",
                    section_id=section["id"],
                    length_limit=section["length_limit"],
                )

        has_limit = section["length_limit"] is not None
        has_source = section["length_source"] is not None

        if has_limit != has_source:
            raise ValidationError(
                "Length limit and source must both be set or both be null",
                context={
                    "section_id": section["id"],
                    "has_limit": has_limit,
                    "has_source": has_source,
                    "recovery_instruction": "Either set both length_limit and length_source, or set both to null",
                },
            )


def propagate_parent_constraints_to_children(
    sections: list[CFPSection],
    length_results: list[LengthConstraint],
) -> list[LengthConstraint]:
    """
    Propagate parent section length constraints to child sections.

    If a parent has a length_limit and children don't, we need to communicate
    that the children share the parent's budget.
    """
    logger.info(
        "Starting parent constraint propagation",
        total_sections=len(sections),
        total_length_results=len(length_results),
        trace_id="length_extraction",
    )

    # Build maps for quick lookup
    section_map = {s["id"]: s for s in sections}
    length_map = {lc["id"]: lc for lc in length_results}

    # Find parent-child relationships
    children_by_parent: dict[str, list[str]] = {}
    for section in sections:
        parent_id = section.get("parent_id")
        if parent_id:
            if parent_id not in children_by_parent:
                children_by_parent[parent_id] = []
            children_by_parent[parent_id].append(section["id"])

    logger.info(
        "Parent-child relationships found",
        total_parents=len(children_by_parent),
        parent_details={
            parent_id: {
                "title": section_map[parent_id].get("title", "unknown"),
                "children_count": len(children),
                "has_limit": length_map[parent_id]["length_limit"] is not None if parent_id in length_map else False,
            }
            for parent_id, children in children_by_parent.items()
        },
        trace_id="length_extraction",
    )

    # Track which sections we've already processed
    processed_ids: set[str] = set()
    updated_results: list[LengthConstraint] = []
    propagations_made = 0

    for length_constraint in length_results:
        section_id = length_constraint["id"]
        current_section: CFPSection | None = section_map.get(section_id)

        if section_id in processed_ids:
            logger.debug("Skipping already processed section", section_id=section_id, trace_id="length_extraction")
            continue

        if current_section is None:
            logger.warning("Section not found in section_map", section_id=section_id, trace_id="length_extraction")
            updated_results.append(length_constraint)
            processed_ids.add(section_id)
            continue

        # Check if this section has children and a length limit
        has_children = section_id in children_by_parent
        has_limit = length_constraint["length_limit"] is not None

        logger.debug(
            "Evaluating section for propagation",
            section_id=section_id,
            section_title=current_section.get("title"),
            has_children=has_children,
            has_limit=has_limit,
            length_limit=length_constraint["length_limit"],
            trace_id="length_extraction",
        )

        if has_children and has_limit:
            # Parent with constraint - mark it and propagate to children
            parent_limit = length_constraint["length_limit"]
            parent_source = length_constraint["length_source"]
            child_ids = children_by_parent[section_id]

            logger.info(
                "Propagating parent constraint to children",
                parent_id=section_id,
                parent_title=current_section.get("title"),
                parent_limit=parent_limit,
                parent_source=parent_source,
                children_count=len(child_ids),
                child_ids=child_ids,
                trace_id="length_extraction",
            )
            propagations_made += 1

            # Update parent to note it has children sharing the limit
            updated_constraint: LengthConstraint = {
                "id": length_constraint["id"],
                "length_limit": length_constraint["length_limit"],
                "length_source": f"{parent_source} (shared across {len(child_ids)} subsections)",
                "other_limits": length_constraint["other_limits"],
            }
            updated_results.append(updated_constraint)
            processed_ids.add(section_id)

            # Update all children to inherit parent's limit
            for child_id in child_ids:
                child_constraint = length_map.get(child_id)
                if child_constraint:
                    if child_constraint["length_limit"] is None:
                        # Child has no individual limit - inherit parent's shared budget
                        updated_child: LengthConstraint = {
                            "id": child_constraint["id"],
                            "length_limit": parent_limit,
                            "length_source": (
                                f"Shared budget with {len(child_ids) - 1} sibling(s) under '{section_map[section_id]['title']}' "
                                f"({parent_source})"
                            ),
                            "other_limits": child_constraint["other_limits"],
                        }
                        logger.info(
                            "Updated child with inherited constraint",
                            child_id=child_id,
                            child_title=section_map[child_id].get("title"),
                            inherited_limit=parent_limit,
                            trace_id="length_extraction",
                        )
                        updated_results.append(updated_child)
                    else:
                        # Child has its own limit - keep it
                        logger.info(
                            "Child has own limit, not inheriting",
                            child_id=child_id,
                            child_title=section_map[child_id].get("title"),
                            own_limit=child_constraint["length_limit"],
                            trace_id="length_extraction",
                        )
                        updated_results.append(child_constraint)
                    processed_ids.add(child_id)
        else:
            updated_results.append(length_constraint)
            processed_ids.add(section_id)

    logger.info(
        "Completed parent constraint propagation",
        total_propagations=propagations_made,
        input_count=len(length_results),
        output_count=len(updated_results),
        trace_id="length_extraction",
    )

    return updated_results


async def extract_length_constraints(
    *,
    organization_guidelines: str,
    sections: list[CFPSection],
    trace_id: str,
) -> LengthExtractionResult:
    messages = LENGTH_EXTRACTION_USER_PROMPT.to_string(
        organization_guidelines=organization_guidelines or "No organization guidelines provided.",
        sections=serialize(sections).decode("utf-8"),
    )

    result = await handle_completions_request(
        prompt_identifier="length_extraction",
        response_type=LengthExtractionResult,
        response_schema=length_extraction_schema,
        validator=partial(validate_length_extraction, input_sections=sections),
        messages=messages,
        system_prompt=LENGTH_EXTRACTION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        thinking_budget=DEFAULT_THINKING_BUDGET,
        trace_id=trace_id,
    )

    logger.info(
        "Length extraction LLM result before propagation",
        section_count=len(result["sections"]),
        sections_with_limits=sum(1 for s in result["sections"] if s["length_limit"] is not None),
        trace_id=trace_id,
    )

    # Propagate parent constraints to children
    updated_sections = propagate_parent_constraints_to_children(sections, result["sections"])

    logger.info(
        "Length extraction result after propagation",
        section_count=len(updated_sections),
        sections_with_limits=sum(1 for s in updated_sections if s["length_limit"] is not None),
        trace_id=trace_id,
    )

    return LengthExtractionResult(sections=updated_sections)
