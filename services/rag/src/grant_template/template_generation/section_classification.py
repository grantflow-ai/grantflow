from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPSection
from packages.shared_utils.src.ai import DEFAULT_THINKING_BUDGET, GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

SECTION_CLASSIFICATION_SYSTEM_PROMPT: Final[str] = (
    "You classify grant application sections by type and extract writing guidelines. Be concise and specific."
)

SECTION_CLASSIFICATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_classification",
    template="""# Classify Application Sections

    ## Organization Guidelines
    ${organization_guidelines}

    ## Sections to Classify
    ${sections}

    ## Task

    For each section, provide classification and guidelines.

    ### Classifications

    1. **long_form**: Does this section require substantial narrative writing? (true/false)
       - True: Research plans, methodology, background, justifications, protocols
       - False: Budget tables, biosketches, letters, cover pages, forms

    2. **is_plan**: Is this the main detailed research plan section? (true/false)
       - Exactly ONE section should be true (typically "Research Plan", "Project Description", or "Research Strategy")

    3. **clinical**: Is this specifically for clinical trial information? (true/false)
       - True: Protocol synopsis, clinical trial design, intervention protocols
       - False: All other sections

    4. **title_only**: Is this just a structural header with no content? (true/false)
       - True: Section groupings like "Application Components", "Required Documents"
       - False: Sections that need content

    5. **needs_writing**: Does this require original applicant writing? (true/false)
       - True: Narrative sections, justifications, descriptions
       - False: Pre-filled forms, budget tables, biosketches, letters from others

    ### Guidelines

    Extract 2-5 specific writing guidelines for each section from CFP/organization guidelines:
    - Length requirements already handled separately
    - Focus on: content requirements, style, formatting, what to include/avoid
    - Be specific and actionable
    - Empty list if no specific guidelines

    ### Output

    Return all sections with classifications and guidelines.
""",
)

section_classification_schema: Final = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "long_form": {"type": "boolean"},
                    "is_plan": {"type": "boolean"},
                    "clinical": {"type": "boolean"},
                    "title_only": {"type": "boolean"},
                    "needs_writing": {"type": "boolean"},
                    "guidelines": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "definition": {"type": "string", "nullable": True},
                },
                "required": ["id", "long_form", "is_plan", "clinical", "title_only", "needs_writing", "guidelines"],
            },
        },
    },
    "required": ["sections"],
}


class SectionClassification(TypedDict):
    id: str
    long_form: bool
    is_plan: bool
    clinical: bool
    title_only: bool
    needs_writing: bool
    guidelines: list[str]
    definition: str | None


class SectionClassificationResult(TypedDict):
    sections: list[SectionClassification]


def validate_section_classification(response: SectionClassificationResult, *, input_sections: list[CFPSection]) -> None:
    if not response.get("sections"):
        raise ValidationError("No sections in classification result")

    input_ids = {s["id"] for s in input_sections}
    output_ids = {s["id"] for s in response["sections"]}

    if input_ids != output_ids:
        added = output_ids - input_ids
        removed = input_ids - output_ids
        raise ValidationError(
            "Section ID mismatch in classification",
            context={
                "added_sections": list(added) if added else None,
                "removed_sections": list(removed) if removed else None,
                "expected_ids": sorted(input_ids),
                "actual_ids": sorted(output_ids),
                "recovery_instruction": "Match input section IDs exactly",
            },
        )

    plan_sections = [s for s in response["sections"] if s["is_plan"]]
    if len(plan_sections) != 1:
        raise ValidationError(
            "Exactly one section must be marked as research plan",
            context={
                "plan_count": len(plan_sections),
                "plan_sections": [s["id"] for s in plan_sections],
                "recovery_instruction": "Mark exactly ONE section as is_plan=true (the main research/project description)",
            },
        )

    for section in response["sections"]:
        if section["title_only"] and section["needs_writing"]:
            raise ValidationError(
                "Title-only sections cannot require writing",
                context={
                    "section_id": section["id"],
                    "recovery_instruction": "Set needs_writing=false for title_only sections",
                },
            )


async def classify_sections(
    *,
    organization_guidelines: str,
    sections: list[CFPSection],
    trace_id: str,
) -> SectionClassificationResult:
    messages = SECTION_CLASSIFICATION_USER_PROMPT.to_string(
        organization_guidelines=organization_guidelines or "No organization guidelines provided.",
        sections=sections,
    )

    return await handle_completions_request(
        prompt_identifier="section_classification",
        response_type=SectionClassificationResult,
        response_schema=section_classification_schema,
        validator=partial(validate_section_classification, input_sections=sections),
        messages=messages,
        system_prompt=SECTION_CLASSIFICATION_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        thinking_budget=DEFAULT_THINKING_BUDGET,
        trace_id=trace_id,
    )
