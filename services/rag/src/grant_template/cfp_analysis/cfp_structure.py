from typing import Final, TypedDict

from packages.db.src.json_objects import CFPContentSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_CONTENT_EXTRACTION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Identify expected application sections that applicants must submit, not CFP document structure."
)

CFP_CONTENT_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_content_extraction",
    template="""# CFP Section Extraction

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Task

    Identify application sections required by this CFP.

    ### Requirements
    - Focus on what applicants must submit
    - Create 2-level hierarchy: main sections with subtitles
    - Main sections: broad categories (e.g., Project Description, Budget, Team)
    - Subtitles: specific subsections under each main section
    - Target 10-20 main sections total

    ### Examples
    - Project Description > [Background, Specific Aims, Methodology, Impact]
    - Budget > [Personnel, Equipment, Supplies, Travel]
    - Team > [Principal Investigator, Co-Investigators, Collaborators]

    ### Output
    Return sections array with title and subtitles for each.
""",
)

CFP_VALIDATION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert validator reviewing extracted CFP sections. "
    "Find gaps, remove duplicates, ensure comprehensive coverage."
)

CFP_VALIDATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_validation_extraction",
    template="""# CFP Section Validation

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Already Extracted Sections
    <sections>${sections}</sections>

    ## Task

    Review the extracted sections and improve them.

    ### Actions
    1. Remove duplicate sections (merge similar titles, combine subtitles)
    2. Add missing sections found in CFP sources
    3. Ensure all application requirements are covered
    4. Maintain 2-level hierarchy (title + subtitles)

    ### Duplicate Detection
    Merge if:
    - Identical or very similar titles
    - One section is subset of another
    - Different wording for same requirement

    When merging, keep the clearer title and combine all unique subtitles.

    ### Output
    Return complete updated sections array (both kept and new sections).
""",
)

cfp_content_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "subtitles": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "subtitles"],
            },
        },
    },
    "required": ["sections"],
}


class CFPContentResult(TypedDict):
    sections: list[CFPContentSection]


def validate_cfp_content(response: CFPContentResult) -> None:
    if not response.get("sections"):
        raise ValidationError("No content sections extracted from CFP")

    if not all(section.get("title") for section in response["sections"]):
        raise ValidationError("All sections must include both a title and content")


async def extract_cfp_structure(
    formatted_sources: str,
    *,
    trace_id: str,
) -> CFPContentResult:
    messages = CFP_CONTENT_EXTRACTION_USER_PROMPT.to_string(rag_sources=formatted_sources)

    return await handle_completions_request(
        prompt_identifier="cfp_content_extraction",
        response_type=CFPContentResult,
        response_schema=cfp_content_schema,
        validator=validate_cfp_content,
        messages=messages,
        system_prompt=CFP_CONTENT_EXTRACTION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.8,
        trace_id=trace_id,
    )


async def validate_and_refine_cfp_structure(
    formatted_sources: str,
    existing_sections: list[CFPContentSection],
    *,
    trace_id: str,
) -> CFPContentResult:
    messages = CFP_VALIDATION_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        sections=existing_sections,
    )

    return await handle_completions_request(
        prompt_identifier="cfp_validation_extraction",
        response_type=CFPContentResult,
        response_schema=cfp_content_schema,
        validator=validate_cfp_content,
        messages=messages,
        system_prompt=CFP_VALIDATION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.8,
        trace_id=trace_id,
    )
