from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPAnalysisCategory, CFPSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_CATEGORIES_SYSTEM_EXTRACTION_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Your task is to identify and categorize the key requirements mentioned in the provided text, "
    "associating them with the relevant sections."
)

CFP_CATEGORIES_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_categories_extraction",
    template="""
    # CFP Requirement Category Extraction

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Sections
    <sections>${sections}</sections>

    ## Task

    For each section in the `<sections>` list, analyze the provided sources and identify which requirement categories apply to it. Return the full section object with a new `categories` field.

    ### Categories
    - research
    - budget
    - team
    - compliance
    - other

    ### Output Format
    Return a list of section objects. Each object should have all the original fields from the input, plus a new `categories` field containing a list of category names that apply to that section.

    Return valid JSON only.
""",
)

cfp_categories_schema = {
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
                    "categories": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["research", "budget", "team", "compliance", "other"]},
                    },
                },
                "required": ["id", "title", "parent_id", "subtitles", "categories"],
            },
        },
    },
    "required": ["sections"],
}


class CategorizedCFPSection(TypedDict):
    id: str
    title: str
    parent_id: str | None
    subtitles: list[str]
    categories: list[CFPAnalysisCategory]


class CFPCategoriesResult(TypedDict):
    sections: list[CategorizedCFPSection]


def validate_cfp_categories(response: CFPCategoriesResult, expected_ids: set[str]) -> None:
    if not response.get("sections"):
        raise ValidationError("No requirement categories identified")

    response_ids = {s["id"] for s in response["sections"]}
    if response_ids != expected_ids:
        raise ValidationError(
            "The categorized sections do not match the input sections.",
            context={
                "missing_ids": list(expected_ids - response_ids),
                "extra_ids": list(response_ids - expected_ids),
            },
        )


async def extract_cfp_categories(
    rag_sources: str,
    sections: list[CFPSection],
    *,
    trace_id: str,
) -> CFPCategoriesResult:
    messages = CFP_CATEGORIES_EXTRACTION_USER_PROMPT.to_string(
        rag_sources=rag_sources, sections=serialize(sections).decode("utf-8")
    )

    validator = partial(validate_cfp_categories, expected_ids={s["id"] for s in sections})

    return await handle_completions_request(
        prompt_identifier="cfp_categories",
        response_type=CFPCategoriesResult,
        response_schema=cfp_categories_schema,
        validator=validator,
        messages=messages,
        system_prompt=CFP_CATEGORIES_SYSTEM_EXTRACTION_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
