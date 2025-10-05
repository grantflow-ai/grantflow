from typing import Final, TypedDict

from packages.db.src.json_objects import CFPAnalysisCategory
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_CATEGORIES_SYSTEM_PROMPT: Final[str] = (
    "Analyze CFP to identify requirement categories (Research, Budget, Team, Compliance, Other) with counts and examples. Return valid JSON only."
)

CFP_CATEGORIES_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_categories_extraction",
    template="""
    # CFP Categories Extraction Task

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>

    ## Task

    Extract requirements by category:
    - **Research**: Scientific methodology, innovation, objectives
    - **Budget**: Funding amounts, justification, cost breakdown
    - **Team**: Personnel, qualifications, collaboration
    - **Compliance**: Ethics, regulations, reporting requirements
    - **Other**: Additional requirements not in above categories
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
                    "name": {"type": "string"},
                    "count": {"type": "integer"},
                    "examples": {"type": "array", "items": {"type": "string"}},
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
        system_prompt=CFP_CATEGORIES_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
