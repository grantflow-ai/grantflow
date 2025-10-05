from typing import Final, TypedDict

from packages.db.src.json_objects import CFPContentSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_CONTENT_EXTRACTIONSYSTEM_PROMPT: Final[str] = """Extract sections from the CFP. For each section, return:
    1. **Title**: The title of the section, or an appropriate title if none given
    2. **subtitles**: Any subtitles in the section
"""

CFP_HIERARCHICAL_CONTENT_EXTRACTION_FRAGMENT: Final[str] = (
    "Extract structured hierarchical sections from CFP. Organize into logical categories (Awards, Eligibility, Application Requirements, Budget, Submission Process, Review) and break each into relevant subsections. Maintain clear 2-level structure. Return valid JSON only."
)
CFP_DETAILED_CONTENT_EXTRACTION_FRAGMENT: Final[str] = (
    "Extract comprehensive detailed sections from CFP. Break down into specific categories: each award type, eligibility criteria, budget requirements, application components, deadlines, review process, terms. Target 12-20 detailed sections. Return valid JSON only."
)
CFP_BROAD_CONTENT_EXTRACTION_FRAGMENT: Final[str] = (
    "Extract major organizational sections from CFP. Focus on high-level categories: Awards, Eligibility, Requirements, Budget, Process, Review. Target 5-10 broad sections. Return valid JSON only."
)

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
        system_prompt=CFP_CONTENT_EXTRACTIONSYSTEM_PROMPT,
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.8,
        trace_id=trace_id,
    )
