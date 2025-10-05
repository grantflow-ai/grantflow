from collections import defaultdict
from typing import Final, NotRequired, TypedDict

from packages.db.src.json_objects import CFPAnalysis
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.dto import ExtractedSectionDTO
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.patterns import SNAKE_CASE_PATTERN

from services.rag.src.grant_template.utils import detect_cycle
from services.rag.src.utils.completion import handle_completions_request

logger = get_logger(__name__)
EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT: Final[str] = """
You are an expert grant application structuring specialist. Create organized section hierarchies for grant applications using CFP analysis section titles.

YOUR TASK: Create section structure and organization based on CFP analysis titles:
- Use exact section titles from CFP analysis required_sections array
- Organize sections into logical hierarchy with parent-child relationships
- Classify section types (narrative, container, research plan, clinical trial)
- Determine writing requirements (applicant content vs external documents)

SECTION CLASSIFICATION:
- needs_writing = TRUE: Sections where applicants write original content (abstracts, project descriptions, research plans, narrative sections, statements, budget justifications)
- needs_writing = FALSE: External documents (CVs, letters of recommendation, letters of support, bibliography/references, biosketches, budget forms/spreadsheets)

BUDGET SECTION CLASSIFICATION:
- needs_writing = TRUE: "Budget Justification", "Budget Narrative", "Budget Explanation", "Budget Description" (requires written content)
- needs_writing = FALSE: "Budget", "Budget Form", "Budget Spreadsheet", "Budget Table", "Budget Summary" (just forms/numbers)

HIERARCHY RULES:
- Create subsections for complex sections (≥3 pages or multi-part requirements)
- Parent sections: title_only=true, contain CFP title
- Child sections: actual writing sections
- Max depth: 2 levels

SECTION TYPES:
- long_form: Narrative sections requiring substantial writing
- is_plan: Exactly one main research methodology section
- clinical: Clinical trial sections
- title_only: Container sections with subsections

Focus on structure and organization. CFP requirements and constraints will be populated separately.
"""
section_extraction_json_schema = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "error": {
            "type": "string",
            "nullable": True,
            "description": "Error if sections cannot be determined",
        },
        "sections": {
            "type": "array",
            "description": "Array of section objects",
            "items": {
                "type": "object",
                "required": [
                    "title",
                    "id",
                    "order",
                    "long_form",
                ],
                "properties": {
                    "title": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 300,
                        "description": "Section title from CFP",
                    },
                    "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "description": "Unique snake_case identifier",
                    },
                    "order": {
                        "type": "integer",
                        "minimum": 1,
                        "description": "Section order, starting at 1",
                    },
                    "parent": {
                        "type": "string",
                        "nullable": True,
                        "description": "Parent section ID, null for top-level",
                    },
                    "needs_writing": {
                        "type": "boolean",
                        "description": "True if applicant writes content, false for external docs",
                    },
                    "is_plan": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "True if detailed research plan/methodology section",
                    },
                    "title_only": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "True if contains only title and subsections",
                    },
                    "long_form": {
                        "type": "boolean",
                        "description": "True if research content section written by applicants",
                    },
                    "clinical": {
                        "type": "boolean",
                        "nullable": True,
                        "description": "True if clinical trial section",
                    },
                },
            },
        },
    },
}


class ExtractedSections(TypedDict):
    sections: list[ExtractedSectionDTO]
    error: NotRequired[str | None]


MAX_NESTING_DEPTH: Final[int] = 5


def _get_children_map(sections: list[ExtractedSectionDTO]) -> dict[str, list[ExtractedSectionDTO]]:
    children_map: dict[str, list[ExtractedSectionDTO]] = {}
    for section in sections:
        parent_id = section.get("parent")
        if parent_id:
            if parent_id not in children_map:
                children_map[parent_id] = []
            children_map[parent_id].append(section)
    return children_map


def _validate_parent_child_structure(
    sections: list[ExtractedSectionDTO], children_map: dict[str, list[ExtractedSectionDTO]]
) -> None:
    {s["id"]: s for s in sections}

    for section in sections:
        section_id = section["id"]
        children = children_map.get(section_id, [])

        if children and not section.get("title_only"):
            raise ValidationError(
                "Parent sections with children must be title-only (is_title_only=true)",
                context={
                    "parent": section_id,
                    "parent_title": section["title"],
                    "title_only": section.get("title_only"),
                    "children_count": len(children),
                    "children_ids": [c["id"] for c in children],
                },
            )

        if section.get("title_only") and not children:
            raise ValidationError(
                "Title-only sections must have at least one child section",
                context={
                    "section_id": section_id,
                    "section_title": section["title"],
                    "title_only": section.get("title_only"),
                },
            )

        if parent_id := section.get("parent"):
            parent_children = children_map.get(parent_id, [])
            if section not in parent_children:
                raise ValidationError(
                    "Parent-child relationship inconsistency detected",
                    context={
                        "child_id": section_id,
                        "child_title": section["title"],
                        "parent_id": parent_id,
                        "parent_children_count": len(parent_children),
                        "parent_children_ids": [c["id"] for c in parent_children],
                        "recovery_instruction": f"Ensure section '{section_id}' is properly listed as a child of parent '{parent_id}'",
                    },
                )

        if children:
            child_orders = [c["order"] for c in children]
            if len(child_orders) != len(set(child_orders)):
                duplicates = [order for order in child_orders if child_orders.count(order) > 1]
                raise ValidationError(
                    "Children of same parent have duplicate order values",
                    context={
                        "parent_id": section_id,
                        "parent_title": section["title"],
                        "duplicate_orders": list(set(duplicates)),
                        "children_orders": [(c["id"], c["order"]) for c in children],
                        "recovery_instruction": f"Assign unique order values to children of parent '{section_id}'",
                    },
                )


def _validate_word_limit_distribution(_section: ExtractedSectionDTO, _children: list[ExtractedSectionDTO]) -> None:
    return


def _validate_section_depth(section: ExtractedSectionDTO, mapped_sections: dict[str, ExtractedSectionDTO]) -> None:
    depth = 1
    current_id = section["id"]
    parent_id = mapped_sections[current_id].get("parent")

    while parent_id:
        depth += 1
        current_id = parent_id
        parent_id = mapped_sections[current_id].get("parent")

    if depth > MAX_NESTING_DEPTH:
        raise ValidationError(
            "Maximum nesting depth exceeded",
            context={"section_id": section["id"], "depth": depth, "max_depth": MAX_NESTING_DEPTH},
        )


def validate_section_extraction(response: ExtractedSections) -> None:
    if (
        error := response.get("error")
    ) and error != "null":  # occasionally, the model suffers a stroke and returns "null" as a string ~keep
        raise InsufficientContextError(error, context={"response": response})

    if not response["sections"]:
        raise ValidationError("No sections extracted. Please provide an error message.", context=response)

    for section in response["sections"]:
        if len(section["title"].strip()) < 3:
            raise ValidationError(
                "Section title too short or empty", context={"section_id": section["id"], "title": section["title"]}
            )

    section_titles = [section["title"].strip().lower() for section in response["sections"]]
    for title in set(section_titles):
        if section_titles.count(title) > 1:
            duplicate_sections = [s for s in response["sections"] if s["title"].strip().lower() == title]
            raise ValidationError(
                "Duplicate section titles found",
                context={"title": title, "section_ids": [s["id"] for s in duplicate_sections]},
            )

    def get_title_words(title: str) -> set[str]:
        common_words = {"the", "a", "an", "and", "or", "of", "for", "in", "on", "at", "to", "with"}
        return {word for word in title.lower().split() if word not in common_words and len(word) > 2}

    similar_pairs = []
    for i, section_a in enumerate(response["sections"]):
        title_a = section_a["title"].strip()
        words_a = get_title_words(title_a)
        if not words_a:
            continue

        for section_b in response["sections"][i + 1 :]:
            title_b = section_b["title"].strip()
            words_b = get_title_words(title_b)
            if not words_b:
                continue

            overlap = words_a & words_b
            union = words_a | words_b
            similarity = len(overlap) / len(union) if union else 0

            if similarity > 0.5:
                similar_pairs.append(
                    {
                        "section_a": {"id": section_a["id"], "title": title_a},
                        "section_b": {"id": section_b["id"], "title": title_b},
                        "similarity": round(similarity, 2),
                        "shared_words": list(overlap),
                    }
                )

    if similar_pairs:
        raise ValidationError(
            "Sections with suspiciously similar titles detected",
            context={
                "similar_pairs": similar_pairs,
                "pair_count": len(similar_pairs),
                "recovery_instruction": "Ensure section titles are distinct and clearly differentiate sections. Consider merging or renaming similar sections.",
            },
        )

    all_orders = [section["order"] for section in response["sections"]]
    if len(set(all_orders)) != len(all_orders):
        duplicate_orders = [order for order in all_orders if all_orders.count(order) > 1]
        raise ValidationError("Duplicate order values found", context={"duplicate_orders": duplicate_orders})

    if min(all_orders) != 1 or max(all_orders) != len(all_orders):
        raise ValidationError(
            "Order values must start at 1 and be consecutive",
            context={"min_order": min(all_orders), "max_order": max(all_orders), "expected_max": len(all_orders)},
        )

    section_ids = [section["id"] for section in response["sections"]]
    if len(section_ids) != len(set(section_ids)):
        duplicate_ids = [section_id for section_id in section_ids if section_ids.count(section_id) > 1]
        raise ValidationError(
            "Duplicate section IDs found. Section IDs must be unique.", context={"duplicate_ids": duplicate_ids}
        )

    research_plan_sections = [s for s in response["sections"] if s.get("is_plan")]
    if len(research_plan_sections) != 1:
        raise ValidationError(
            f"Exactly one section must be marked as detailed research_plan. Found {len(research_plan_sections)}.",
            context={"research_plan_sections": [s["id"] for s in research_plan_sections]},
        )

    if research_plan_sections and not research_plan_sections[0].get("long_form"):
        raise ValidationError(
            "The detailed research_plan section must be marked as a long-form section",
            context={"research_plan_id": research_plan_sections[0]["id"], "title": research_plan_sections[0]["title"]},
        )

    long_form_sections = [s for s in response["sections"] if s.get("long_form")]
    if not long_form_sections:
        raise ValidationError("At least one section must be marked as long-form")

    mapped_sections = {section["id"]: section for section in response["sections"]}
    dependency_graph = defaultdict[str, list[str]](list)
    for section in response["sections"]:
        if parent_id := section.get("parent"):
            dependency_graph[section["id"]].append(parent_id)

    for section_id in dependency_graph:
        if cycle_nodes := detect_cycle(graph=dependency_graph, start=section_id):
            raise ValidationError(
                "Circular dependency detected in section hierarchy",
                context={
                    "starting_node": section_id,
                    "cycle_nodes": list(cycle_nodes),
                    "full_dependency_graph": dict(dependency_graph.items()),
                    "cycle_path": " → ".join([*list(cycle_nodes), next(iter(cycle_nodes))]),
                    "recovery_instruction": "Break the circular dependency by removing one of the parent-child relationships in the cycle.",
                },
            )

    valid_ids = set(section_ids)
    for section in response["sections"]:
        if not SNAKE_CASE_PATTERN.match(section["id"]):
            raise ValidationError(
                "Invalid section ID format", context={"section_id": section["id"], "expected_format": "snake_case"}
            )

        if parent_id := section.get("parent"):
            if parent_id not in valid_ids:
                raise ValidationError(
                    f"Invalid parent section reference. The section {section['id']} defines a parent section {parent_id} that does not exist in the sections list.",
                )
            if mapped_sections[parent_id].get("is_plan"):
                raise ValidationError(
                    "The research_plan section cannot have any sub-sections as children",
                    context={"research_plan_id": parent_id, "child_id": section["id"]},
                )

        _validate_section_depth(section, mapped_sections)

    children_map = _get_children_map(response["sections"])
    _validate_parent_child_structure(response["sections"], children_map)

    for section in response["sections"]:
        children = children_map.get(section["id"], [])
        if children:
            _validate_word_limit_distribution(section, children)


async def extract_sections(task_description: str, *, trace_id: str, cfp_analysis: CFPAnalysis) -> ExtractedSections:
    logger.info(
        "Extracted CFP analysis from task_description",
        task_description_length=len(task_description),
        cfp_analysis=cfp_analysis,
        trace_id=trace_id,
    )

    return await handle_completions_request(
        prompt_identifier="section_extraction",
        model=GEMINI_FLASH_MODEL,
        messages=task_description,
        system_prompt=EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT,
        response_schema=section_extraction_json_schema,
        response_type=ExtractedSections,
        validator=validate_section_extraction,
        temperature=0.1,
        timeout=300,
        trace_id=trace_id,
    )
