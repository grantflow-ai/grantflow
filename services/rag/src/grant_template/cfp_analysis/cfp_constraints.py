from typing import Final, TypedDict

from packages.db.src.json_objects import CFPAnalysisConstraint
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

CFP_CATEGORIES_EXTRACTION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Your task is to meticulously extract all explicit constraints and limitations from the provided text. "
    "Focus on quantifiable limits and specific formatting requirements."
)

CFP_CATEGORIES_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_constraints_extraction",
    template="""
    # CFP Constraint Extraction

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Task

    Analyze the provided sources and extract all constraints related to the grant application's format and length.

    ### Constraint Types and Definitions

    - **word_limit**: Maximum number of words.
    - **page_limit**: Maximum number of pages.
    - **char_limit** or **character_limit**: Maximum number of characters.
    - **format**: Specific file format (e.g., PDF, Word).
    - **font**: Required font size or family (e.g., 11-point Arial).
    - **spacing**: Line spacing requirements (e.g., single-spaced, double-spaced).
    - **margin**: Required document margins (e.g., 1-inch margins).
    - **length**: A generic length constraint when the unit is not specified.
    - **size**: A file size constraint (e.g., 10MB).

    ### Output Format

    For each constraint found, provide:
    - `type`: One of the allowed constraint types.
    - `value`: The specific value of the constraint (e.g., "10 pages", "PDF", "1-inch").
    - `section`: The name of the section the constraint applies to. If it applies to the whole application, use "Full Application".

    Return valid JSON only.
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
                    "section": {"type": "string"},
                },
                "required": ["type", "value"],
            },
        },
    },
    "required": ["constraints"],
}


class CFPConstraintsResult(TypedDict):
    constraints: list[CFPAnalysisConstraint]


def validate_cfp_constraints(response: CFPConstraintsResult) -> None:
    if not response.get("constraints"):
        raise ValidationError("No constraints identified")


async def extract_cfp_constraints(
    task_description: str,
    *,
    trace_id: str,
) -> CFPConstraintsResult:
    return await handle_completions_request(
        prompt_identifier="cfp_constraints",
        response_type=CFPConstraintsResult,
        response_schema=cfp_constraints_schema,
        validator=validate_cfp_constraints,
        messages=task_description,
        system_prompt=CFP_CATEGORIES_EXTRACTION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
