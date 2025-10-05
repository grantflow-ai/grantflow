from typing import Final, TypedDict

from packages.db.src.json_objects import CFPContentSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_CONTENT_EXTRACTION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Your task is to deconstruct the provided CFP text into a structured list of sections and their corresponding subsections. "
    "Pay close attention to the specific instructions in the user prompt, as they will guide the desired granularity of the output."
)

CFP_CONTENT_EXTRACTION_HIERARCHICAL_FRAGMENT: Final[str] = """
### Strategy: Hierarchical Extraction

- **Goal**: Organize the CFP content into a logical, 2-level hierarchy.
- **Top-Level Sections**: Group the content into primary categories like 'Awards', 'Eligibility', 'Application Requirements', etc.
- **Subsections**: For each top-level section, extract its constituent parts as subtitles.
"""

CFP_CONTENT_EXTRACTION_DETAILED_FRAGMENT: Final[str] = """
### Strategy: Detailed Extraction

- **Goal**: Deconstruct the CFP into a fine-grained list of all possible sections.
- **Method**: Treat every distinct topic as a separate section. Do not create subtitles.
- **Target**: Aim for 12-20 detailed sections.
"""

CFP_CONTENT_EXTRACTION_BROAD_FRAGMENT: Final[str] = """
### Strategy: Broad Extraction

- **Goal**: Identify only the major, top-level organizational sections.
- **Method**: Focus on the main headings and ignore smaller subsections.
- **Target**: Aim for 5-10 broad sections.
"""

CFP_CONTENT_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_content_extraction",
    template="""
    # CFP Content Extraction

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Task

    <task>${task}</task>
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
    task_description: str,
    *,
    trace_id: str,
) -> CFPContentResult:
    # TODO: add evaluation here
    return await handle_completions_request(
        prompt_identifier="cfp_content_hierarchical",
        response_type=CFPContentResult,
        response_schema=cfp_content_schema,
        validator=validate_cfp_content,
        messages=task_description,
        system_prompt=CFP_CONTENT_EXTRACTION_SYSTEM_PROMPT,
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.8,
        trace_id=trace_id,
    )
