from typing import Final, TypedDict

from packages.db.src.json_objects import CFPAnalysisCategory
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_CATEGORIES_SYSTEM_EXTRACTION_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Your task is to identify and categorize the key requirements mentioned in the provided text. "
    "For each category, you will count the number of requirements and provide a few representative examples."
)

CFP_CATEGORIES_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_categories_extraction",
    template="""
    # CFP Requirement Category Extraction

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Task

    Analyze the provided sources and categorize the grant application requirements into the following predefined categories.

    ### Categories and Definitions

    - **research**: Requirements related to the scientific or technical aspects of the project.
      - *Examples*: "Describe the research methodology.", "Provide a statement of innovation.", "List the specific aims."

    - **budget**: Requirements related to the financial aspects of the project.
      - *Examples*: "Submit a detailed budget justification.", "Include a breakdown of personnel costs."

    - **team**: Requirements related to the personnel and collaborators involved in the project.
      - *Examples*: "Provide biographical sketches for all key personnel.", "Include letters of collaboration."

    - **compliance**: Requirements related to ethical, legal, or administrative obligations.
      - *Examples*: "Include a statement on human subjects protection.", "Provide a data management plan."

    - **other**: Any requirements that do not fit into the above categories.

    ### Output Format

    For each category, provide:
    - `name`: The name of the category.
    - `count`: The total number of requirements you identified for that category.
    - `examples`: A list of 2-3 verbatim quotes from the source text that are representative of the requirements in that category.

    Return valid JSON only.
""",
)

cfp_categories_schema = {
    "type": "object",
    "properties": {
        "categories": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "enum": ["research", "budget", "team", "compliance", "other"]},
                    "count": {"type": "integer"},
                    "examples": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["name", "count"],
            },
        },
    },
    "required": ["categories"],
}


class CFPCategoriesResult(TypedDict):
    categories: list[CFPAnalysisCategory]


def validate_cfp_categories(response: CFPCategoriesResult) -> None:
    if not response.get("categories"):
        raise ValidationError("No requirement categories identified")


async def extract_cfp_categories(
    task_description: str,
    *,
    trace_id: str,
) -> CFPCategoriesResult:
    return await handle_completions_request(
        prompt_identifier="cfp_categories",
        response_type=CFPCategoriesResult,
        response_schema=cfp_categories_schema,
        validator=validate_cfp_categories,
        messages=task_description,
        system_prompt=CFP_CATEGORIES_SYSTEM_EXTRACTION_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
