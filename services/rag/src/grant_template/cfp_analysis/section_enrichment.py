from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.grant_template.utils.category_extraction import (
    CategorizationAnalysisResult,
    format_nlp_hints_for_extraction,
)
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

    ## CFP Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Organization Guidelines
    <organization_guidelines>${organization_guidelines}</organization_guidelines>

    ## Category Hints
    <category_hints>${category_hints}</category_hints>

    ## Sections
    <sections>${sections}</sections>

    ## Task

    For each section, add constraints and categories by searching the ENTIRE CFP document and organization guidelines.

    **Important**:
    - If organization guidelines are provided (non-empty), they are the PRIMARY and AUTHORITATIVE source for constraints
    - Search the ENTIRE CFP and guidelines for constraints
    - Some CFPs list constraints globally (apply to whole application), others list them per-section
    - Look everywhere in the CFP text and guidelines for formatting requirements that apply to each section

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
    - quote: Direct quote from source showing where constraint was found

    **Examples of constraint matching**:
    - "Project description should be 5 pages maximum" → {type: "page_limit", value: "5 pages maximum", quote: "Project description should be 5 pages maximum"}
    - "Arial 11-point or Times New Roman 12-point font" → {type: "font", value: "Arial 11pt or Times New Roman 12pt", quote: "Arial 11-point or Times New Roman 12-point font"}
    - "2,000 characters, including spaces, maximum" → {type: "char_limit", value: "2000 characters including spaces", quote: "2,000 characters, including spaces, maximum"}
    - "no less than ½ inch margins" → {type: "margin", value: "at least ½ inch margins", quote: "no less than ½ inch margins"}
    - "Up to 30 references" → {type: "length", value: "up to 30 references", quote: "Up to 30 references"}

    ### Categories
    Verify and refine categories for each section from: research, budget, team, compliance, other
    - **research**: Scientific aims, methodology, data, hypotheses, innovation
    - **budget**: Costs, funding, justifications, resources
    - **team**: Personnel, qualifications, collaboration, organization
    - **compliance**: Ethics, regulations, data sharing, protocols
    - **other**: Anything not fitting above categories

    ### Output
    Return all sections with constraints and categories fields.
""",
)

SECTION_ENRICHMENT_VALIDATION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert validator reviewing enriched CFP sections. "
    "Find missing constraints, ensure comprehensive coverage."
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
    1. **Find missing constraints**: Search CFP sources and organization guidelines for ANY page/word/character limits, font, spacing, or margin requirements not yet captured
    2. Add missed formatting/length requirements with exact values from CFP or guidelines
    3. **Verify categories**: Ensure each section has appropriate categories assigned

    ### Output
    Return complete updated sections with validated constraints and categories.
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
                                "quote": {"type": "string"},
                            },
                            "required": ["type", "value", "quote"],
                        },
                    },
                    "categories": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["research", "budget", "team", "compliance", "other"],
                        },
                    },
                },
                "required": ["id", "title", "parent_id", "constraints", "categories"],
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
    organization_guidelines: str,
    cfp_categories: CategorizationAnalysisResult,
    *,
    trace_id: str,
) -> EnrichedSectionsResult:
    category_hints = format_nlp_hints_for_extraction(cfp_categories)
    messages = SECTION_ENRICHMENT_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        organization_guidelines=organization_guidelines,
        sections=serialize(sections).decode("utf-8"),
        constraint_types=", ".join(sorted(CONSTRAINT_TYPES)),
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
        sections=serialize(enriched_sections).decode("utf-8"),
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
