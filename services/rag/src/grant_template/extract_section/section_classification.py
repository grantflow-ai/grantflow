from typing import Final, NotRequired, TypedDict

from services.rag.src.grant_template.extract_section.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from src.ai import GEMINI_FLASH_MODEL
from src.exceptions import ValidationError

SECTION_CLASSIFICATION_SYSTEM_PROMPT: Final[str] = (
    "Given the results of CFP analysis and any available organization guidelines, classify the grant application sections."
)
SECTION_CLASSIFICATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_classification",
    template="""
    # Section Classification
    
    <cfp_analysis>${cfp_analysis}</cfp_analysis>
    <organization_guidelines>${organization_guidelines}</organization_guidelines>

    ## Task
    
    Classify grant application sections by type and writing requirements.
    
    ## Field Definitions
        
    1. **long_form**: Narrative sections requiring substantial writing by applicants. 
        Include research plans, project descriptions, abstracts, summaries, justifications, data management plans, 
        impact statements, and any section where applicants write prose 
        (not just fill forms). Sections with page/word limits are usually long_form.
    2. **is_plan**: Exactly ONE main research methodology section (research approach, methods, aims).
    3. **title_only**: Container sections with subsections only.
    4. **clinical**: Clinical trial sections.
    5. **needs_writing**: True if applicant writes content (not external docs like CVs, letters).
            
    Return valid JSON only.
""",
)

section_classification_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "long_form": {"type": "boolean"},
                    "is_plan": {"type": "boolean", "nullable": True},
                    "title_only": {"type": "boolean", "nullable": True},
                    "clinical": {"type": "boolean", "nullable": True},
                    "needs_writing": {"type": "boolean"},
                },
                "required": ["id", "long_form", "needs_writing"],
            },
        },
    },
    "required": ["sections"],
}


class SectionClassificationItem(TypedDict):
    id: str
    long_form: bool
    is_plan: bool
    title_only: NotRequired[bool]
    clinical: NotRequired[bool]
    needs_writing: NotRequired[bool]


class SectionClassificationResult(TypedDict):
    sections: list[SectionClassificationItem]


def validate_section_classification(response: SectionClassificationResult) -> None:
    if not response.get("sections"):
        raise ValidationError("No section classifications extracted")

    is_plan_count = sum(1 for s in response["sections"] if s.get("is_plan"))
    if is_plan_count != 1:
        raise ValidationError(
            f"Exactly one section must have is_plan=true, found {is_plan_count}",
            context={
                "is_plan_sections": [s["id"] for s in response["sections"] if s.get("is_plan")],
                "recovery_instruction": "Mark exactly one main research methodology section as is_plan=true",
            },
        )


async def extract_section_classification(
    task_description: str,
    *,
    trace_id: str,
) -> SectionClassificationResult:
    return await handle_completions_request(
        prompt_identifier="section_classification",
        response_type=SectionClassificationResult,
        response_schema=section_classification_schema,
        validator=validate_section_classification,
        messages=task_description,
        system_prompt=SECTION_CLASSIFICATION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
