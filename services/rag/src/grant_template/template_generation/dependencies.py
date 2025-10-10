from functools import partial
from typing import Final, TypedDict

from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.grant_template.template_generation.section_classification import SectionClassification
from services.rag.src.grant_template.utils import detect_cycle
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

DEPENDENCIES_SYSTEM_PROMPT: Final[str] = "You determine logical dependencies between grant application sections."

DEPENDENCIES_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_dependencies",
    template="""# Generate Section Dependencies

## Enriched Sections

${sections}

## Task

For each section, determine which other sections must be written first.

### Dependencies

List section IDs that this section logically depends on (must be written first):
- Project Summary depends on: [] (written first)
- Background depends on: ["project_summary"]
- Methodology depends on: ["background", "specific_aims"]
- Budget Justification depends on: ["methodology"]

Rules:
- NO circular dependencies (A→B→A)
- NO self-dependencies (section depends on itself)
- Use actual section IDs from input
- Empty array if no dependencies

### Output

Return all sections with depends_on arrays.
""",
)

dependencies_schema: Final = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "depends_on": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                },
                "required": ["id", "depends_on"],
            },
        },
    },
    "required": ["sections"],
}


class EnrichedSection(TypedDict):
    id: str
    title: str
    long_form: bool
    is_plan: bool
    clinical: bool
    needs_writing: bool


class SectionDependency(TypedDict):
    id: str
    depends_on: list[str]


class SectionDependencyResult(TypedDict):
    sections: list[SectionDependency]


def validate_section_dependencies(
    response: SectionDependencyResult,
    *,
    input_sections: list[EnrichedSection],
) -> None:
    if not response.get("sections"):
        raise ValidationError("No sections in dependency result")

    input_ids = {s["id"] for s in input_sections}
    output_ids = {s["id"] for s in response["sections"]}

    if input_ids != output_ids:
        added = output_ids - input_ids
        removed = input_ids - output_ids
        raise ValidationError(
            "Section ID mismatch in dependencies",
            context={
                "added_sections": list(added) if added else None,
                "removed_sections": list(removed) if removed else None,
                "expected_ids": sorted(input_ids),
                "actual_ids": sorted(output_ids),
                "recovery_instruction": "Match input section IDs exactly",
            },
        )

    for section in response["sections"]:
        for dep in section["depends_on"]:
            if dep not in input_ids:
                raise ValidationError(
                    "Invalid dependency reference",
                    context={
                        "section_id": section["id"],
                        "invalid_dependency": dep,
                        "valid_ids": sorted(input_ids),
                        "recovery_instruction": "Only use section IDs that exist in input",
                    },
                )

        if section["id"] in section["depends_on"]:
            raise ValidationError(
                "Self-dependency detected",
                context={
                    "section_id": section["id"],
                    "recovery_instruction": "Remove self from depends_on list",
                },
            )

    dependency_graph = {s["id"]: s["depends_on"] for s in response["sections"]}

    for section_id in dependency_graph:
        if cycle_nodes := detect_cycle(dependency_graph, section_id):
            cycle_list = list(cycle_nodes)
            raise ValidationError(
                "Circular dependency detected",
                context={
                    "cycle_nodes": cycle_list,
                    "cycle_path": " → ".join([*cycle_list, cycle_list[0]]),
                    "recovery_instruction": f"Break cycle by removing one dependency from: {' → '.join(cycle_list)}",
                },
            )


async def generate_section_dependencies(
    *,
    classification: list[SectionClassification],
    trace_id: str,
) -> SectionDependencyResult:
    enriched: list[EnrichedSection] = []
    for cls in classification:
        enriched.append(
            EnrichedSection(
                id=cls["id"],
                title="",
                long_form=cls["long_form"],
                is_plan=cls["is_plan"],
                clinical=cls["clinical"],
                needs_writing=cls["needs_writing"],
            )
        )

    messages = DEPENDENCIES_USER_PROMPT.to_string(
        sections=enriched,
    )

    return await handle_completions_request(
        prompt_identifier="section_dependencies",
        response_type=SectionDependencyResult,
        response_schema=dependencies_schema,
        validator=partial(validate_section_dependencies, input_sections=enriched),
        messages=messages,
        system_prompt=DEPENDENCIES_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
