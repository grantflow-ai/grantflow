from typing import Any, Final, TypedDict

from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CONSTRAINT_TYPES: Final[frozenset[str]] = frozenset(
    {
        "word_limit",
        "page_limit",
        "char_limit",
        "character_limit",
        "format",
        "font",
        "spacing",
        "margin",
        "length",
        "size",
    }
)


CFP_CATEGORIES_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_length_limit_extraction",
    template="""
    # CFP Length Limits Extraction

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Task

    Extract legnth requirements for each section:
    - **type**: Words, characters, pages
    - **value**: The limit
    - **Section**: The section, if per section
    """,
)

cfp_constraints_schema = {
    "type": "object",
    "properties": {
        "constraints": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": sorted(CONSTRAINT_TYPES)},
                    "value": {"type": "string"},
                    "section": {"type": "string", "nullable": True},
                },
                "required": ["type", "value"],
            },
        },
    },
    "required": ["constraints"],
}


class CFPConstraintsResult(TypedDict):
    constraints: list[dict[str, Any]]


def validate_cfp_constraints(response: CFPConstraintsResult) -> None:
    if not response.get("constraints"):
        return

    invalid_constraints = []
    for idx, constraint in enumerate(response["constraints"]):
        constraint_type = constraint.get("type", "").lower().replace(" ", "_")
        if constraint_type and constraint_type not in CONSTRAINT_TYPES:
            invalid_constraints.append(
                {
                    "index": idx,
                    "type": constraint.get("type"),
                    "value": constraint.get("value"),
                }
            )

    if invalid_constraints:
        raise ValidationError(
            "Invalid constraint types found in CFP constraints",
            context={
                "invalid_constraints": invalid_constraints,
                "valid_types": sorted(CONSTRAINT_TYPES),
                "recovery_instruction": f"Ensure constraint types are one of: {', '.join(sorted(CONSTRAINT_TYPES))}",
            },
        )


async def extract_cfp_constraints(
    task_description: str,
    *,
    trace_id: str,
) -> CFPConstraintsResult:
    # TODO: add evaluation here
    return await handle_completions_request(
        prompt_identifier="cfp_constraints",
        response_type=CFPConstraintsResult,
        response_schema=cfp_constraints_schema,
        validator=validate_cfp_constraints,
        messages=task_description,
        system_prompt="Extract length limits (word/page/char) and formatting requirements from CFP. Return valid JSON only.",
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
