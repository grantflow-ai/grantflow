from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.grant_template.utils.category_extraction import (
    CategorizationAnalysisResult,
    format_nlp_hints_for_extraction,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

SECTION_ENRICHMENT_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Enrich application sections with categories and precise length constraints."
)

SECTION_ENRICHMENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_enrichment",
    template="""# Section Enrichment

## CFP Sources
<rag_sources>${rag_sources}</rag_sources>

## Organization Guidelines
<organization_guidelines>${organization_guidelines}</organization_guidelines>

## Category Hints
<category_hints>${category_hints}</category_hints>

## Sections
<sections>${sections}</sections>

## Task

For each section, add categories and a single length constraint (if one exists) by searching the ENTIRE CFP document and organization guidelines.

**Important**:
- If organization guidelines are provided (non-empty), they are the PRIMARY and AUTHORITATIVE source for constraints
- Search the ENTIRE CFP and guidelines for constraints
- Some CFPs list constraints globally (apply to whole application), others list them per-section
- Look everywhere in the CFP text and guidelines for formatting requirements that apply to each section

### Length Constraint
Extract ONE applicant writing length constraint per section if available. Convert constraints to a normalized structure:
- **Word limits**: Record value as-is with `type="words"`
- **Character limits**: Record value as-is with `type="characters"`
- **Page limits**: Convert to words using 415 words/page and set `type="words"`
- If both word and character limits are stated, choose the more restrictive and note it
- If multiple conflicting limits exist, choose the strictest requirement explicitly covering the applicant-written content
- If no constraint exists, set `length_constraint=null`
- Always capture a short source quote or citation in the `source` field

### Categories
Verify and refine categories for each section from: research, budget, team, compliance, other
- **research**: Scientific aims, methodology, data, hypotheses, innovation
- **budget**: Costs, funding, justifications, resources
- **team**: Personnel, qualifications, collaboration, organization
- **compliance**: Ethics, regulations, data sharing, protocols
- **other**: Anything not fitting above categories

### Output
Return all sections with categories and standardized length_constraint.
""",
)

SECTION_ENRICHMENT_VALIDATION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert validator reviewing enriched CFP sections. "
    "Ensure categories are correct and that each section has a precise length constraint when one exists."
)

SECTION_ENRICHMENT_VALIDATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_enrichment_validation",
    template="""# Section Enrichment Validation

## CFP Sources
<rag_sources>${rag_sources}</rag_sources>

## Organization Guidelines
<organization_guidelines>${organization_guidelines}</organization_guidelines>

## Category Hints
<category_hints>${category_hints}</category_hints>

## Enriched Sections
<sections>${sections}</sections>

## Task

Review and improve section enrichment.

**IMPORTANT**: If organization guidelines are provided (non-empty), they are the PRIMARY source for constraints.

### Actions
1. Confirm the categories are correct for each section
2. Ensure each section has at most ONE length constraint
3. Normalize constraints into the structure {type: "words"/"characters", value: integer, source: quote or citation}
   - Convert page limits to words using 415 words/page
   - If multiple limits are present, keep the strictest one that applies to applicant writing
   - If no applicable limit exists, return null
4. Make sure value > 0 and source text clearly identifies where the constraint came from

### Output
Return complete updated sections with validated categories and normalized length_constraint.
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
                    "length_constraint": {
                        "type": "object",
                        "nullable": True,
                        "properties": {
                            "type": {"type": "string", "enum": ["words", "characters"]},
                            "value": {"type": "integer", "minimum": 1},
                            "source": {"type": "string", "nullable": True},
                        },
                        "required": ["type", "value", "source"],
                    },
                    "categories": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["research", "budget", "team", "compliance", "other"],
                        },
                    },
                },
                "required": ["id", "title", "parent_id", "length_constraint", "categories"],
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

    for section in response["sections"]:
        constraint = section.get("length_constraint")
        if constraint is None:
            continue

        constraint_type = constraint.get("type")
        if constraint_type not in {"words", "characters"}:
            raise ValidationError(
                "Invalid length constraint type",
                context={
                    "section_id": section["id"],
                    "constraint_type": constraint_type,
                    "allowed_types": ["words", "characters"],
                },
            )

        value = constraint.get("value")
        if not isinstance(value, int) or value <= 0:
            raise ValidationError(
                "Length constraint value must be a positive integer",
                context={
                    "section_id": section["id"],
                    "value": value,
                    "recovery_instruction": "Provide an integer greater than zero",
                },
            )

        source = constraint.get("source")
        if source is not None and (not isinstance(source, str) or not source.strip()):
            raise ValidationError(
                "Length constraint source must be a non-empty string or null",
                context={
                    "section_id": section["id"],
                    "source": source,
                    "recovery_instruction": "Provide a citation/quote or null",
                },
            )


async def enrich_sections(
    formatted_sources: str,
    sections: list[CFPSection],
    organization_guidelines: str,
    cfp_categories: CategorizationAnalysisResult,
    *,
    trace_id: str,
) -> EnrichedSectionsResult:
    category_hints = format_nlp_hints_for_extraction(cfp_categories)
    messages = SECTION_ENRICHMENT_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        organization_guidelines=organization_guidelines,
        sections=sections,
        category_hints=category_hints,
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
    organization_guidelines: str,
    cfp_categories: CategorizationAnalysisResult,
    *,
    trace_id: str,
) -> EnrichedSectionsResult:
    category_hints = format_nlp_hints_for_extraction(cfp_categories)
    messages = SECTION_ENRICHMENT_VALIDATION_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        organization_guidelines=organization_guidelines,
        sections=enriched_sections,
        category_hints=category_hints,
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
