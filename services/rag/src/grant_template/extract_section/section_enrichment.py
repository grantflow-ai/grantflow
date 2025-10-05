from typing import Final, NotRequired, TypedDict

from packages.db.src.json_objects import CFPConstraint
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.extract_section.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

SECTION_ENRICHMENT_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application guidelines. Your task is to extract constraints and guidelines for each section of the grant application from the provided text."
)

SECTION_ENRICHMENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_enrichment",
    template="""
    # Section Enrichment Extraction
    
    <cfp_analysis>${task_description}</cfp_analysis>
    <cfp_constraints>${cfp_constraints}</cfp_constraints>
    
    ## Task
    
    Extract CFP constraints and guidelines for grant application sections.
    
    ## Field Definitions
    
    1.  **guidelines**: Relevant CFP text excerpts for this section (3-10 items).
    2.  **length_limit**: Word count from CFP (convert pages: 250 words/page, chars: 6 chars/word).
    3.  **length_source**: Exact quote from CFP documenting the limit.
    4.  **other_limits**: Additional formatting/structure constraints.
    5.  **definition**: Concise summary from guidelines (single guideline as-is, 4+ add 'Plus X additional requirements').
    
    Return valid JSON only. All fields nullable if not found.
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
                    "guidelines": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,
                    },
                    "length_limit": {"type": "integer", "nullable": True},
                    "length_source": {"type": "string", "nullable": True},
                    "other_limits": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "constraint_type": {"type": "string"},
                                "constraint_value": {"type": "string"},
                                "source_quote": {"type": "string"},
                            },
                            "required": ["constraint_type", "constraint_value", "source_quote"],
                        },
                        "minItems": 1,
                    },
                    "definition": {"type": "string", "nullable": True},
                },
                "required": ["id"],
            },
        },
    },
    "required": ["sections"],
}


class EnrichedSection(TypedDict):
    id: str
    guidelines: NotRequired[list[str]]
    length_limit: NotRequired[int | None]
    length_source: NotRequired[str | None]
    other_limits: NotRequired[list[CFPConstraint]]
    definition: NotRequired[str | None]


class SectionEnrichmentResult(TypedDict):
    sections: list[EnrichedSection]


def validate_section_enrichment(response: SectionEnrichmentResult) -> None:
    if not response.get("sections"):
        raise ValidationError("No section enrichments extracted")

    for section in response["sections"]:
        if not section.get("id"):
            raise ValidationError("Enriched section is missing an ID")

        if section.get("length_limit") is not None and not section.get("length_source"):
            raise ValidationError(
                f"Section {section.get('id')} has length_limit but no length_source",
                context={"section_id": section.get("id")},
            )

        if section.get("length_source") is not None and section.get("length_limit") is None:
            raise ValidationError(
                f"Section {section.get('id')} has length_source but no length_limit",
                context={"section_id": section.get("id")},
            )


async def extract_section_enrichment(
    task_description: str,
    *,
    trace_id: str,
) -> SectionEnrichmentResult:
    return await handle_completions_request(
        prompt_identifier="section_enrichment",
        response_type=SectionEnrichmentResult,
        response_schema=section_enrichment_schema,
        validator=validate_section_enrichment,
        messages=task_description,
        system_prompt=SECTION_ENRICHMENT_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
