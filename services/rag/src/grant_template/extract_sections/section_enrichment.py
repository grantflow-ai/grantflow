from functools import partial
from typing import Final, NotRequired, TypedDict, cast

from packages.db.src.json_objects import CFPAnalysis, CFPConstraint
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.extract_sections.constants import TEMPERATURE
from services.rag.src.grant_template.extract_sections.section_structure import StructuredSection
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application guidelines. Your task is to extract specific details, guidelines, and constraints for each section."
)

USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="enrich_with_details",
    template="""
# Enrich Sections with Details

<sections>${sections}</sections>
<cfp_analysis>${cfp_analysis}</cfp_analysis>

## Task

For each section in the `<sections>` list, extract the following details from the CFP analysis.

## Field Definitions

1.  **guidelines**: Relevant CFP text excerpts for this section (3-10 items).
2.  **length_limit**: Word count from CFP (convert pages: 250 words/page, chars: 6 chars/word).
3.  **length_source**: Exact quote from CFP documenting the limit.
4.  **other_limits**: Additional formatting/structure constraints.
5.  **definition**: Concise summary from guidelines (single guideline as-is, 4+ add 'Plus X additional requirements').

Return valid JSON only. All fields are optional.
""",
)

enrichment_json_schema = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id"],
                "properties": {
                    "id": {"type": "string"},
                    "guidelines": {
                        "type": "array",
                        "items": {"type": "string"},
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
                    },
                    "definition": {"type": "string", "nullable": True},
                },
            },
        },
    },
}


class EnrichedSectionDetails(TypedDict):
    id: str
    guidelines: NotRequired[list[str]]
    length_limit: NotRequired[int | None]
    length_source: NotRequired[str | None]
    other_limits: NotRequired[list[CFPConstraint]]
    definition: NotRequired[str | None]


class EnrichmentResult(TypedDict):
    sections: list[EnrichedSectionDetails]


class EnrichedSection(StructuredSection):
    guidelines: NotRequired[list[str]]
    length_limit: NotRequired[int | None]
    length_source: NotRequired[str | None]
    other_limits: NotRequired[list[CFPConstraint]]
    definition: NotRequired[str | None]


def validate_enrichment_details(response: EnrichmentResult, expected_ids: set[str]) -> None:
    if not response.get("sections"):
        raise ValidationError("No details were extracted for enrichment.")

    response_ids = {s["id"] for s in response["sections"]}
    if response_ids != expected_ids:
        raise ValidationError(
            "The enriched sections do not match the input sections.",
            context={
                "missing_ids": list(expected_ids - response_ids),
                "extra_ids": list(response_ids - expected_ids),
            },
        )

    for section in response["sections"]:
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


async def enrich_with_details(
    sections: list[StructuredSection],
    cfp_analysis: CFPAnalysis,
    *,
    trace_id: str,
) -> list[EnrichedSection]:
    messages = USER_PROMPT.to_string(
        sections=serialize(sections).decode("utf-8"),
        cfp_analysis=cfp_analysis,
    )

    validator = partial(validate_enrichment_details, expected_ids={s["id"] for s in sections})

    result = await handle_completions_request(
        prompt_identifier="enrich_with_details",
        model=GEMINI_FLASH_MODEL,
        messages=messages,
        system_prompt=SYSTEM_PROMPT,
        response_schema=enrichment_json_schema,
        response_type=EnrichmentResult,
        validator=validator,
        temperature=TEMPERATURE,
        trace_id=trace_id,
    )

    # Merge the results
    result_map = {item["id"]: item for item in result["sections"]}

    merged_sections: list[EnrichedSection] = []
    for section in sections:
        if enrichment := result_map.get(section["id"]):
            merged_section = cast("EnrichedSection", {**section, **enrichment})
            merged_sections.append(merged_section)
        else:
            merged_sections.append(cast("EnrichedSection", section))

    return merged_sections
