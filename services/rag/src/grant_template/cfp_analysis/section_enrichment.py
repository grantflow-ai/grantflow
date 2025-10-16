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
    "You are an expert analyst specialized in Calls for Proposals (CFPs) and research-grant documentation. "
    "Before enriching sections, you must carefully read all provided sources, organization guidelines, and NLP category hints. "
    "Identify explicit and implicit signals about section purpose, scope, and constraints. "
    "Reason step-by-step about the evidence available before adding categories or constraints. "
    "If data is missing, explain in reasoning (not in JSON) why it cannot be extracted, and only then output the structured enrichment. "
    "Be authoritative, consistent, and precise-never fabricate details."
)

SECTION_ENRICHMENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_enrichment",
    template="""# # Section Enrichment

## Reasoning Procedure

Follow this internal reasoning sequence before generating structured output:

1. **Read** - Examine *all* CFP sources, organization guidelines, and category hints in full.
   Understand each section's function, expected content, and context within the CFP.
2. **Identify** - Detect explicit mentions of categories or formatting requirements.
   Search the *entire* CFP and guidelines for section-specific or global constraints.
3. **Reason** - Determine which details are reliable and authoritative.
   Prioritize organization guidelines; if they contradict CFP text, guidelines prevail.
   If information is incomplete, reason about it explicitly (but do not fabricate).
4. **Write** - Produce the structured enrichment with verified categories and normalized constraints.

---

## CFP Sources
<rag_sources>${rag_sources}</rag_sources>

## Organization Guidelines
<organization_guidelines>${organization_guidelines}</organization_guidelines>

## Category Hints
<category_hints>${category_hints}</category_hints>

## Sections
<sections>${sections}</sections>

---

## Task

For each section, enrich the record by adding validated **categories** and a single **length_constraint** (if one exists).
Use information from *all* sources above.

**Important:**
- Organization guidelines (if non-empty) are the **primary** and **authoritative** source.
- Search across the *entire* CFP for global or section-specific formatting rules.
- Document global constraints if they apply to applicant-written sections.

---

### Length Constraint Extraction
Extract **one** constraint per section, normalized as follows:

- **Word limits** -> `type="words"` with the exact numeric value
- **Character limits** -> `type="characters"` with numeric value
- **Page limits** -> Convert using 415 words per page (`type="words"`)
- If both word and character limits exist -> choose the stricter one
- If conflicting constraints exist -> select the strictest one that clearly applies
- If no constraint exists -> `length_constraint=null`
- Always include a short **source quote or citation** for traceability

---

### Category Assignment
Verify and refine from {research, budget, team, compliance, other}:
- **research** - scientific aims, methodology, data, innovation
- **budget** - costs, resources, justification
- **team** - personnel, qualifications, collaborations
- **compliance** - ethics, regulations, data management
- **other** - any remaining sections

---

### Output

Return all enriched sections in JSON with standardized `categories` and `length_constraint`.
Do not include reasoning in the final JSON output.
""",
)

SECTION_ENRICHMENT_VALIDATION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert validator for CFP section enrichment. "
    "Read all provided sources and guidelines first. "
    "Identify inconsistencies between categories, constraints, and evidence. "
    "Reason explicitly about potential conflicts before producing validated structured output. "
    "If organization guidelines exist, treat them as the highest authority. "
    "Do not fabricate missing information-only validate or correct based on what is given."
)

SECTION_ENRICHMENT_VALIDATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_enrichment_validation",
    template="""# Section Enrichment Validation

## Validation Logic

Perform these steps before producing your output:

1. **Read** - Review all CFP sources, guidelines, category hints, and enriched sections.
2. **Identify** - Locate all constraint mentions and cross-check with each section.
3. **Reason** - Determine the correct normalization and strictest applicable limit.
   - Prefer organization guidelines over CFP text when both exist.
   - Resolve conflicts explicitly before writing output.
4. **Write** - Output fully validated JSON with consistent constraints and categories.

---

## CFP Sources
<rag_sources>${rag_sources}</rag_sources>

## Organization Guidelines
<organization_guidelines>${organization_guidelines}</organization_guidelines>

## Category Hints
<category_hints>${category_hints}</category_hints>

## Enriched Sections
<sections>${sections}</sections>

---

## Task

Review and refine each enriched section.

**Critical Rules:**
- At most **one** constraint per section.
- Normalize constraints into `{type: "words"/"characters", value: integer, source: quote/citation}`.
- Convert pages -> 415 words each.
- Choose the **strictest** relevant constraint.
- If no explicit limit -> `length_constraint=null`.
- Value must be >0, and `source` must be a short citation or null.

---

### Output

Return the complete validated list of sections in structured JSON.
Exclude your reasoning from the final output.
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
