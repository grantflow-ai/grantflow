from typing import Final, TypedDict

from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from src.ai import GEMINI_FLASH_MODEL
from src.exceptions import ValidationError

SECTION_STRUCTURE_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application guidelines. Your task is to extract the hierarchical structure of the application sections from the provided text."
)

SECTION_STRUCTURE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_structure",
    template="""
    # Section Structure Extraction
    
    <cfp_analysis>${cfp_analysis}</cfp_analysis>
    
    ## Task
    
    Extract the hierarchical section structure from the provided CFP analysis.
    
    - Create parent-child relationships with a maximum depth of 2 levels.
    - Use the exact section titles from the CFP.
    - Assign a unique ID to each section.
    - Ensure the `order` field reflects the sequence of sections.
    - The `parent_id` should be the ID of the parent section, or `null` for top-level sections.
    
    ## Field Definitions
    
    1.  **title**: The exact title of the section.
    2.  **id**: A unique identifier for the section (e.g., "section-1").
    3.  **order**: The 1-based index of the section in the overall structure.
    4.  **parent_id**: The ID of the parent section, or `null` if it is a top-level section.
    
    Return valid JSON only.
""",
)

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
        system_prompt=SECTION_STRUCTURE_SYSTEM_PROMPT,
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
