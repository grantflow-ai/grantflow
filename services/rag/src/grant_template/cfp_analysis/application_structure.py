from typing import Final, TypedDict

from packages.db.src.json_objects import CFPSection
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CFP_CONTENT_EXTRACTION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert in analyzing grant application Calls for Proposals (CFPs). "
    "Extract content sections that applicants write or prepare, not form fields or administrative requirements."
)

CFP_CONTENT_EXTRACTION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_content_extraction",
    template="""# Extract Application Content Sections

## CFP Sources
<rag_sources>${rag_sources}</rag_sources>

## Organization Guidelines
<organization_guidelines>${organization_guidelines}</organization_guidelines>

## Task

Extract ONLY the content sections that applicants must **write or prepare** as part of their proposal.

**IMPORTANT**: If organization guidelines are provided (non-empty), they are the PRIMARY and AUTHORITATIVE source for application structure. The CFP provides context about the funding opportunity, but guidelines define the actual application sections.

### Include
- Narrative sections (Research Plan, Specific Aims, Background, Methodology, etc.)
- Written justifications (Budget Justification, Team Qualifications, etc.)
- Project-specific documents (Protocol Synopsis, Timeline, Data Management Plan, etc.)

### Exclude
- Form fields (PI name, institution, award amount, keywords, etc.)
- Administrative documents (letters of support, IRB approval, biosketches, etc.)
- Submission process steps (Title Page, Validate, Submit, Enable Users, etc.)
- Eligibility requirements (PI eligibility, institutional requirements, geographic eligibility, etc.)
- Review criteria or evaluation guidance

### Structure
Flat list with **maximum 2-level depth** (H2 parent + H3 children only):
- Each section has: id, title, parent_id
- Parent sections (H2): main categories (parent_id = null)
- Child sections (H3): direct subsections under a parent (parent_id = parent's id)
- **NO grandchildren** (H4+): flatten into nearest parent
- Target: 8-15 parent sections total

### Common Grant Application Sections (for reference)
Most grant applications include sections like:
- Project Description (with subsections: Background, Aims, Methodology)
- Budget Justification
- Team/Personnel
- Data Sharing Plan
- Protocol Synopsis (for clinical trials)
- Literature References

Only include sections explicitly required by this CFP.

### Output
Return flat sections array with id, title, parent_id for each.
""",
)

CFP_VALIDATION_SYSTEM_PROMPT: Final[str] = (
    "You are an expert validator reviewing extracted CFP sections. "
    "Remove noise, find gaps, eliminate duplicates."
)

CFP_VALIDATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_validation_extraction",
    template="""# Validate and Refine Application Sections

## CFP Sources
<rag_sources>${rag_sources}</rag_sources>

## Organization Guidelines
<organization_guidelines>${organization_guidelines}</organization_guidelines>

## Extracted Sections
<sections>${sections}</sections>

## Task

Review and improve the extracted sections.

**IMPORTANT**: If organization guidelines are provided (non-empty), they are the PRIMARY source for application structure.

### Validation Steps

1. **Remove noise**: Eliminate any sections that are actually:
   - Form fields (award type, PI name, institution, etc.)
   - Administrative requirements (IRB approval, letters of support, biosketches, etc.)
   - Submission process (Title Page, Validate, Submit, etc.)
   - Eligibility criteria (PI eligibility, geographic requirements, etc.)

2. **Deduplicate**: Merge semantically similar sections:
   - "Background" + "Project Background" → Keep "Background"
   - "Specific Aims" + "Aims and Hypotheses" → Keep "Specific Aims"
   - Preserve parent-child relationships when merging

3. **Fill gaps**: Add missing content sections found in CFP

4. **Verify structure**: Flat list with parent_id relationships, 8-15 parent sections

### Output
Return refined flat sections array (id, title, parent_id) with only content applicants write.
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
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "parent_id": {"type": "string", "nullable": True},
                },
                "required": ["id", "title", "parent_id"],
            },
        },
    },
    "required": ["sections"],
}


class CFPContentResult(TypedDict):
    sections: list[CFPSection]


def validate_cfp_content(response: CFPContentResult) -> None:
    if not response.get("sections"):
        raise ValidationError("No content sections extracted from CFP")

    section_map = {s["id"]: s for s in response["sections"]}

    for section in response["sections"]:
        if not section.get("id"):
            raise ValidationError("All sections must have an id")
        if not section.get("title"):
            raise ValidationError("All sections must have a title")

        # Validate max 2-level depth (parent + children only)
        if parent_id := section.get("parent_id"):
            parent = section_map.get(parent_id)
            if parent and parent.get("parent_id") is not None:
                raise ValidationError(
                    f"Section '{section['id']}' is a grandchild (3+ levels deep). Max depth is 2 (H2 parent + H3 children).",
                    context={
                        "section_id": section["id"],
                        "parent_id": parent_id,
                        "grandparent_id": parent.get("parent_id"),
                    }
                )


async def extract_cfp_structure(
    formatted_sources: str,
    organization_guidelines: str,
    *,
    trace_id: str,
) -> CFPContentResult:
    messages = CFP_CONTENT_EXTRACTION_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        organization_guidelines=organization_guidelines,
    )

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
    organization_guidelines: str,
    existing_sections: list[CFPSection],
    *,
    trace_id: str,
) -> CFPContentResult:
    messages = CFP_VALIDATION_USER_PROMPT.to_string(
        rag_sources=formatted_sources,
        organization_guidelines=organization_guidelines,
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
