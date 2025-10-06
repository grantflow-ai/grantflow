from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.serialization import serialize

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

SECTION_ENRICHMENT_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Enrich application sections with formatting constraints."
)

SECTION_ENRICHMENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_enrichment",
    template="""# Section Enrichment

## Sources
<rag_sources>${rag_sources}</rag_sources>

## Sections
<sections>${sections}</sections>

## Task

For each section, add constraints by searching the ENTIRE CFP document.

**Important**: Search the ENTIRE CFP for constraints. Some CFPs list constraints globally (apply to whole application), others list them per-section. Look everywhere in the CFP text for formatting requirements that apply to each section.

### Constraints
Extract ALL formatting and length constraints mentioned in CFP for each section:
- **Page limits**: "5 pages maximum", "not to exceed 10 pages"
- **Word limits**: "500 words", "maximum 1000 words"
- **Character limits**: "2000 characters including spaces"
- **Font requirements**: "Arial 11pt", "Times New Roman 12pt"
- **Spacing**: "single-spaced", "double-spaced", "1.5 line spacing"
- **Margins**: "1 inch margins", "at least ½ inch margins"
- **Format requirements**: "PDF only", "include page numbers"

For each constraint found:
- type: One of [${constraint_types}]
- value: Exact requirement from CFP

**Examples of constraint matching**:
- "Project description should be 5 pages maximum" → {type: "page_limit", value: "5 pages maximum"}
- "Arial 11-point or Times New Roman 12-point font" → {type: "font", value: "Arial 11pt or Times New Roman 12pt"}
- "2,000 characters, including spaces, maximum" → {type: "char_limit", value: "2000 characters including spaces"}
- "no less than ½ inch margins" → {type: "margin", value: "at least ½ inch margins"}
- "Up to 30 references" → {type: "length", value: "up to 30 references"}

### Output
Return all sections with added constraints field.
""",
)

SECTION_ENRICHMENT_VALIDATION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert validator reviewing enriched CFP sections. "
    "Find missing constraints, ensure comprehensive coverage."
)

SECTION_ENRICHMENT_VALIDATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_enrichment_validation",
    template="""# Section Enrichment Validation

## Sources
<rag_sources>${rag_sources}</rag_sources>

## Enriched Sections
<sections>${sections}</sections>

## Task

Review and improve section enrichment.

### Actions
1. **Find missing constraints**: Search CFP sources for ANY page/word/character limits, font, spacing, or margin requirements not yet captured
2. Add missed formatting/length requirements with exact values from CFP

### Output
Return complete updated sections with validated constraints.
""",
)

section_enrichment_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "parent_id": {"type": "string", "nullable": True},
                    "constraints": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string", "enum": sorted(CONSTRAINT_TYPES)},
                                "value": {"type": "string"},
                            },
                            "required": ["type", "value"],
                        },
                    },
                },
                "required": ["id", "title", "parent_id", "constraints"],
            },
        },
    },
    "required": ["sections"],
}


class EnrichedSectionsResult(TypedDict):
    sections: list[CFPSection]


def validate_section_enrichment(response: EnrichedSectionsResult, expected_ids: set[str]) -> None:
    if not response.get("sections"):
        raise ValidationError("No enriched sections returned")

    response_ids = {s["id"] for s in response["sections"]}
    if response_ids != expected_ids:
        raise ValidationError(
            "Enriched sections do not match input sections",
            context={
                "missing_ids": list(expected_ids - response_ids),
                "extra_ids": list(response_ids - expected_ids),
            },
        )


async def enrich_sections(
    formatted_sources: str,
    sections: list[CFPSection],
    *,
    trace_id: str,
) -> EnrichedSectionsResult:
    messages = SECTION_ENRICHMENT_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        sections=serialize(sections).decode("utf-8"),
        constraint_types=", ".join(sorted(CONSTRAINT_TYPES)),
    )

    validator = partial(validate_section_enrichment, expected_ids={s["id"] for s in sections})

    return await handle_completions_request(
        prompt_identifier="section_enrichment",
        response_type=EnrichedSectionsResult,
        response_schema=section_enrichment_schema,
        validator=validator,
        messages=messages,
        system_prompt=SECTION_ENRICHMENT_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


async def validate_and_refine_enrichment(
    formatted_sources: str,
    enriched_sections: list[CFPSection],
    *,
    trace_id: str,
) -> EnrichedSectionsResult:
    messages = SECTION_ENRICHMENT_VALIDATION_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        sections=serialize(enriched_sections).decode("utf-8"),
    )

    validator = partial(validate_section_enrichment, expected_ids={s["id"] for s in enriched_sections})

    return await handle_completions_request(
        prompt_identifier="section_enrichment_validation",
        response_type=EnrichedSectionsResult,
        response_schema=section_enrichment_schema,
        validator=validator,
        messages=messages,
        system_prompt=SECTION_ENRICHMENT_VALIDATION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
