from typing import NotRequired, TypedDict

from services.rag.src.utils.completion import handle_completions_request
from src.ai import GEMINI_FLASH_MODEL
from src.json_objects import CFPAnalysis, CFPConstraint
from src.serialization import serialize

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


async def extract_section_enrichment(
    task_description: str,
    cfp_analysis: CFPAnalysis,
    *,
    trace_id: str,
) -> SectionEnrichmentResult:
    constraints = cfp_analysis.get("analysis_metadata", {}).get("constraints", [])
    enrichment_prompt = (
        f"{task_description}\n\n<cfp_constraints>{serialize(constraints).decode('utf-8')}</cfp_constraints>"
    )

    return await handle_completions_request(
        prompt_identifier="section_enrichment",
        response_type=SectionEnrichmentResult,
        response_schema=section_enrichment_schema,
        validator=None,
        messages=enrichment_prompt,
        system_prompt=(
            "Extract CFP constraints and guidelines for grant application sections. "
            "guidelines: Relevant CFP text excerpts for this section (3-10 items). "
            "length_limit: Word count from CFP (convert pages: 250 words/page, chars: 6 chars/word). "
            "length_source: Exact quote from CFP documenting the limit. "
            "other_limits: Additional formatting/structure constraints. "
            "definition: Concise summary from guidelines (single guideline as-is, 4+ add 'Plus X additional requirements'). "
            "Return valid JSON only. All fields nullable if not found."
        ),
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
