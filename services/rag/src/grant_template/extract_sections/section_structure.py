from functools import partial
from typing import Final, NotRequired, TypedDict, cast

from packages.db.src.json_objects import CFPAnalysis
from packages.shared_utils.src.ai import DEFAULT_THINKING_BUDGET, GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.extract_sections.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

SYSTEM_PROMPT: Final[str] = (
    "You are an expert in organizing grant applications. Your task is to determine the order and high-level classification of sections."
)

USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="structure_and_classify_sections",
    template="""
    # Structure and Classify Grant Application Sections

    <sections>${sections}</sections>
    <cfp_analysis>${cfp_analysis}</cfp_analysis>

    ## Task

    Based on the provided list of sections and the CFP analysis, determine the correct order and perform high-level classification for each section.

    ### Instructions

    - Return all the sections with the new fields.
    - `order`: A 1-based integer, unique and consecutive across all sections.
    - `title_only`: True if the section is a container for subsections.
    - `is_plan`: True for the single, main research methodology section.

    Return valid JSON only.
""",
)

structure_and_classify_json_schema = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "order", "title_only", "is_plan"],
                "properties": {
                    "id": {"type": "string"},
                    "order": {"type": "integer"},
                    "title_only": {"type": "boolean"},
                    "is_plan": {"type": "boolean"},
                },
            },
        },
    },
}


class DefinedSection(TypedDict):
    title: str
    id: str
    parent_id: NotRequired[str | None]


class StructuredAndClassifiedSection(TypedDict):
    id: str
    order: int
    title_only: bool
    is_plan: bool


class StructuredAndClassifiedResult(TypedDict):
    sections: list[StructuredAndClassifiedSection]


class StructuredSection(TypedDict):
    title: str
    id: str
    parent: NotRequired[str | None]
    order: int
    title_only: bool
    is_plan: bool


def validate_structure_and_classification(response: StructuredAndClassifiedResult, expected_ids: set[str]) -> None:
    if not response.get("sections"):
        raise ValidationError("No sections were structured or classified.")

    response_ids = {s["id"] for s in response["sections"]}
    if response_ids != expected_ids:
        raise ValidationError(
            "The structured sections do not match the input sections.",
            context={
                "missing_ids": list(expected_ids - response_ids),
                "extra_ids": list(response_ids - expected_ids),
            },
        )

    orders = [section["order"] for section in response["sections"]]
    if len(orders) != len(set(orders)):
        duplicate_orders = [order for order in orders if orders.count(order) > 1]
        raise ValidationError("Duplicate order values found.", context={"duplicate_orders": duplicate_orders})

    if min(orders) != 1 or max(orders) != len(orders):
        raise ValidationError(
            "Order values must be consecutive and start from 1.",
            context={"min_order": min(orders), "max_order": max(orders), "expected_max": len(orders)},
        )

    is_plan_count = sum(1 for s in response["sections"] if s.get("is_plan"))
    if is_plan_count != 1:
        raise ValidationError(
            f"Exactly one section must have is_plan=true, found {is_plan_count}",
            context={
                "is_plan_sections": [s["id"] for s in response["sections"] if s.get("is_plan")],
            },
        )


async def structure_and_classify_sections(
    sections: list[DefinedSection], cfp_analysis: CFPAnalysis, *, trace_id: str
) -> list[StructuredSection]:
    messages = USER_PROMPT.to_string(
        sections=serialize(sections).decode("utf-8"),
        cfp_analysis=cfp_analysis,
    )

    validator = partial(validate_structure_and_classification, expected_ids={s["id"] for s in sections})

    result = await handle_completions_request(
        prompt_identifier="structure_and_classify_sections",
        model=GEMINI_FLASH_MODEL,
        messages=messages,
        system_prompt=SYSTEM_PROMPT,
        response_schema=structure_and_classify_json_schema,
        response_type=StructuredAndClassifiedResult,
        validator=validator,
        temperature=TEMPERATURE,
        thinking_budget=DEFAULT_THINKING_BUDGET,
        trace_id=trace_id,
    )

    # Merge the results
    result_map = {item["id"]: item for item in result["sections"]}

    merged_sections: list[StructuredSection] = []
    for section in sections:
        # Rename parent_id to parent for consistency with ExtractedSectionDTO
        section_data = dict(section)
        if "parent_id" in section_data:
            section_data["parent"] = section_data.pop("parent_id")

        if structured := result_map.get(section["id"]):
            merged_section = cast("StructuredSection", {**section_data, **structured})
            merged_sections.append(merged_section)
        else:
            merged_sections.append(cast("StructuredSection", section_data))

    merged_sections.sort(key=lambda s: s.get("order", 0))

    return merged_sections
