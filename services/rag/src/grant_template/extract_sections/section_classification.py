from functools import partial
from typing import Final, TypedDict, cast

from packages.db.src.json_objects import CFPAnalysis
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.extract_sections.constants import TEMPERATURE
from services.rag.src.grant_template.extract_sections.section_structure import StructuredSection
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application guidelines. Your task is to classify the writing requirements for each section."
)

USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="classify_writing_requirements",
    template="""
    # Classify Writing Requirements

    <sections>${sections}</sections>
    <cfp_analysis>${cfp_analysis}</cfp_analysis>
    <organization_guidelines>${organization_guidelines}</organization_guidelines>

    ## Task

    For each section in the `<sections>` list, classify its writing requirements.

    ### Instructions

    - Return all the sections with the new fields.
    - `long_form`: True if the section requires substantial narrative writing.
    - `needs_writing`: True if the applicant needs to write original content.
    - `clinical`: True if the section is related to clinical trials.

    Return valid JSON only.
""",
)

classification_json_schema = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "long_form", "needs_writing", "clinical"],
                "properties": {
                    "id": {"type": "string"},
                    "long_form": {"type": "boolean"},
                    "needs_writing": {"type": "boolean"},
                    "clinical": {"type": "boolean"},
                },
            },
        },
    },
}


class WritingRequirements(TypedDict):
    id: str
    long_form: bool
    needs_writing: bool
    clinical: bool


class WritingRequirementsResult(TypedDict):
    sections: list[WritingRequirements]


class ClassifiedSection(StructuredSection):
    long_form: bool
    needs_writing: bool
    clinical: bool


def validate_writing_requirements(response: WritingRequirementsResult, expected_ids: set[str]) -> None:
    if not response.get("sections"):
        raise ValidationError("No writing requirements were classified.")

    response_ids = {s["id"] for s in response["sections"]}
    if response_ids != expected_ids:
        raise ValidationError(
            "The classified sections do not match the input sections.",
            context={
                "missing_ids": list(expected_ids - response_ids),
                "extra_ids": list(response_ids - expected_ids),
            },
        )


async def classify_writing_requirements(
    sections: list[StructuredSection],
    cfp_analysis: CFPAnalysis,
    organization_guidelines: str,
    *,
    trace_id: str,
) -> list[ClassifiedSection]:
    messages = USER_PROMPT.to_string(
        sections=serialize(sections).decode("utf-8"),
        cfp_analysis=cfp_analysis,
        organization_guidelines=organization_guidelines,
    )

    validator = partial(validate_writing_requirements, expected_ids={s["id"] for s in sections})

    result = await handle_completions_request(
        prompt_identifier="classify_writing_requirements",
        model=GEMINI_FLASH_MODEL,
        messages=messages,
        system_prompt=SYSTEM_PROMPT,
        response_schema=classification_json_schema,
        response_type=WritingRequirementsResult,
        validator=validator,
        temperature=TEMPERATURE,
        trace_id=trace_id,
    )

    # Merge the results
    result_map = {item["id"]: item for item in result["sections"]}

    merged_sections: list[ClassifiedSection] = []
    for section in sections:
        if classification := result_map.get(section["id"]):
            merged_section = cast("ClassifiedSection", {**section, **classification})
            merged_sections.append(merged_section)
        else:
            merged_sections.append(cast("ClassifiedSection", section))

    return merged_sections
