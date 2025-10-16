from functools import partial
from typing import Final, TypedDict

from packages.db.src.json_objects import CFPSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

SECTION_CLASSIFICATION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert grant-application analyst embedded in a structured pipeline designed to classify proposal sections "
    "and extract precise writing guidelines. "
    "Before producing classifications, you must carefully read all provided context, identify implicit patterns and relationships, "
    "reason about each section's purpose and dependencies, and only then write the output. "
    "Be accurate, specific, and measurable-never fabricate or assume data that is not provided."
)

SECTION_CLASSIFICATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_classification",
    template="""SECTION_CLASSIFICATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(

## Pipeline Logic

Follow this reasoning sequence before output:
1. **Read** - Carefully read *all* organization guidelines and section descriptions.
   Understand each section's role, purpose, and context within the application.
2. **Identify** - Detect features that define section type (e.g., narrative vs. tabular).
   Identify indicators of research plan, clinical scope, or structural headers.
3. **Reason** - Deduce logical relationships among sections (hierarchy, dependencies, relevance).
   Determine which one is the *main research plan* (`is_plan=true`) and ensure all classifications are consistent.
   If data is unclear or missing, reason explicitly and base classification only on available evidence.
4. **Write** - Provide clear, structured classifications and concise actionable guidelines.
   Each decision should be specific, evidence-based, and aligned with grant-writing standards.

---

## Organization Guidelines

${organization_guidelines}

## Sections to Classify

${sections}

## Task

For each section, provide classification and extract writing guidelines.

### Classifications

1. **long_form** - Does this section require substantial narrative writing? (`true`/`false`)
   - True: Research plans, methodology, background, justifications, protocols
   - False: Budget tables, biosketches, letters, cover pages, forms

2. **is_plan** - Is this the main detailed research plan section? (`true`/`false`)
   - Exactly **one** section should be true (e.g., “Research Plan”, “Project Description”, “Research Strategy”)

3. **clinical** - Is this section specific to clinical trial information? (`true`/`false`)
   - True: Protocol synopsis, clinical trial design, intervention protocols
   - False: All other sections

4. **title_only** - Is this just a structural header with no content? (`true`/`false`)
   - True: Section groupings like “Application Components”, “Required Documents”
   - False: Sections that contain substantive text

5. **needs_writing** - Does this require original applicant writing? (`true`/`false`)
   - True: Narrative sections, justifications, descriptions
   - False: Pre-filled forms, budget tables, biosketches, or externally provided content

---

### Guidelines Extraction

Extract **2-5 actionable writing guidelines** for each section from the CFP or organizational guidelines:
- Focus on *content expectations*, *style*, *format*, and *inclusions/exclusions*
- Avoid redundancy with length requirements
- Be concise, concrete, and field-relevant
- If no specific guidelines exist, return an empty list

---

### Output

Return all sections with their classifications and extracted guidelines in JSON format.
Do not include reasoning or explanations in the final output.


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
        trace_id=trace_id,
    )
