from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPAnalysisConstraint, CFPSection
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

CFP_CONSTRAINTS_SYSTEM_EXTRACTION_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Your task is to meticulously extract all explicit constraints and limitations from the provided text, "
    "associating them with the relevant sections."
)

CFP_CONSTRAINTS_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_constraints_extraction",
    template="""# CFP Constraint Extraction

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Sections
    <sections>${sections}</sections>

    ## Task

    For each section in the `<sections>` list, analyze the provided sources and identify which constraints apply to it. Return the full section object with a new `constraints` field.

    ### Constraint Types
    - word_limit
    - page_limit
    - char_limit / character_limit
    - format
    - font
    - spacing
    - margin
    - length
    - size

    ### Output Format

    Return a list of section objects. Each object should have all the original fields from the input, plus a new `constraints` field containing a list of constraint objects that apply to that section.

    For each constraint, provide:
    - `type`: One of the allowed constraint types.
    - `value`: The specific value of the constraint (e.g., "10 pages", "PDF", "1-inch").

    Return valid JSON only.
""",
)

cfp_constraints_schema = {
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
                    "subtitles": {"type": "array", "items": {"type": "string"}},
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
                "required": ["id", "title", "parent_id", "subtitles", "constraints"],
            },
        },
    },
    "required": ["sections"],
}


class ConstrainedCFPSection(TypedDict):
    id: str
    title: str
    parent_id: str | None
    subtitles: list[str]
    constraints: list[CFPAnalysisConstraint]


class CFPConstraintsResult(TypedDict):
    sections: list[ConstrainedCFPSection]


def validate_cfp_constraints(response: CFPConstraintsResult, expected_ids: set[str]) -> None:
    if not response.get("sections"):
        raise ValidationError("No constraints identified")

    response_ids = {s["id"] for s in response["sections"]}
    if response_ids != expected_ids:
        raise ValidationError(
            "The constrained sections do not match the input sections.",
            context={
                "missing_ids": list(expected_ids - response_ids),
                "extra_ids": list(response_ids - expected_ids),
            },
        )


async def extract_cfp_constraints(
    rag_sources: str,
    sections: list[CFPSection],
    *,
    trace_id: str,
) -> CFPConstraintsResult:
    messages = CFP_CONSTRAINTS_EXTRACTION_USER_PROMPT.to_string(
        rag_sources=rag_sources, sections=serialize(sections).decode("utf-8")
    )

    validator = partial(validate_cfp_constraints, expected_ids={s["id"] for s in sections})

    return await handle_completions_request(
        prompt_identifier="cfp_constraints",
        response_type=CFPConstraintsResult,
        response_schema=cfp_constraints_schema,
        validator=validator,
        messages=messages,
        system_prompt=CFP_CONSTRAINTS_SYSTEM_EXTRACTION_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
