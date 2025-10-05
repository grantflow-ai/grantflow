from typing import TypedDict

from services.rag.src.utils.completion import handle_completions_request
from src.ai import GEMINI_FLASH_MODEL
from src.exceptions import ValidationError

section_structure_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "id": {"type": "string"},
                    "order": {"type": "integer"},
                    "parent_id": {"type": "string", "nullable": True},
                },
                "required": ["title", "id", "order", "parent_id"],
            },
        },
    },
    "required": ["sections"],
}


class SectionStructureItem(TypedDict):
    id: str
    title: str
    order: int
    parent_id: str | None


class SectionStructureResult(TypedDict):
    sections: list[SectionStructureItem]


def validate_section_structure(response: SectionStructureResult) -> None:
    if not response.get("sections"):
        raise ValidationError("No sections extracted from CFP analysis")

    section_ids = [s["id"] for s in response["sections"]]
    if len(section_ids) != len(set(section_ids)):
        raise ValidationError("Duplicate section IDs found in structure extraction")


async def extract_section_structure(
    task_description: str,
    *,
    trace_id: str,
) -> SectionStructureResult:
    return await handle_completions_request(
        prompt_identifier="section_structure",
        response_type=SectionStructureResult,
        response_schema=section_structure_schema,
        validator=validate_section_structure,
        messages=task_description,
        system_prompt=(
            "Extract hierarchical section structure from CFP analysis. "
            "Create parent-child relationships with max 2-level depth. "
            "Use exact section titles from CFP. Return valid JSON only."
        ),
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
