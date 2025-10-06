from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPAnalysisConstraint, CFPSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
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


async def extract_length_constraints(
    sections: list[CFPSection],
    organization_guidelines: str,
    *,
    trace_id: str,
) -> LengthExtractionResult:
    messages = LENGTH_EXTRACTION_USER_PROMPT.to_string(
        organization_guidelines=organization_guidelines or "No organization guidelines provided.",
        sections=serialize(sections).decode("utf-8"),
    )

    return await handle_completions_request(
        prompt_identifier="length_extraction",
        response_type=LengthExtractionResult,
        response_schema=length_extraction_schema,
        validator=partial(validate_length_extraction, input_sections=sections),
        messages=messages,
        system_prompt=LENGTH_EXTRACTION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
