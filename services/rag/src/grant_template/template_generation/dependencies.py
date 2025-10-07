from functools import partial
from typing import Final, TypedDict

from packages.shared_utils.src.ai import DEFAULT_THINKING_BUDGET, GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.grant_template.template_generation.length_extraction import LengthConstraint
from services.rag.src.grant_template.template_generation.section_classification import SectionClassification
from services.rag.src.grant_template.utils import detect_cycle
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

DEPENDENCIES_SYSTEM_PROMPT: Final[str] = (
    "You determine section dependencies and word count allocations for grant applications. "
    "CRITICAL: You must strictly respect CFP length constraints - never allocate more words than the length_limit allows. "
    "Be logical and realistic within the given constraints."
)

DEPENDENCIES_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="dependencies_word_counts",
    template="""# Generate Section Dependencies and Word Counts

    ## Enriched Sections
    ${sections}

    ## Task

    For each section, determine dependencies and allocate word counts.

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

    ### Word Counts

    **CRITICAL CONSTRAINTS:**

    1. **Individual limits**: If a section has `length_limit`, allocate max_words ≤ length_limit
    2. **Shared limits**: Sections with identical length_source text share a TOTAL budget
       - Example: 4 sections all say "Shared budget... (6 pages maximum)" = 2490 words TOTAL for all 4 combined
       - You must split the budget among siblings, ensuring: sum(sibling max_words) ≤ shared length_limit

    **Allocation Strategy:**

    1. **Group sections by constraint**:
       - Check if multiple sections have similar length_source (e.g., "Shared budget with 3 sibling(s)...")
       - These sections SHARE the length_limit - split it among them

    2. **For shared constraints**:
       - Identify all sections in the group
       - Allocate proportionally by importance
       - Verify total: sum(max_words for all in group) ≤ length_limit

    3. **For individual constraints**:
       - Allocate max_words ≤ length_limit

    4. **Default allocations** (only if no length_limit):
       - Project Summary: 300 words
       - Research Plan (is_plan=true): 2000-5000 words
       - Background/Significance: 800-1200 words
       - Methodology: 1000-2000 words
       - Budget Justification: 500-800 words
       - Other sections: 300-600 words

    **Pre-return Validation:**
    - Check each section: max_words ≤ length_limit
    - Check shared groups: sum(group max_words) ≤ shared length_limit

    ### Output

    Return all sections with depends_on and max_words.
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
                    "max_words": {
                        "type": "integer",
                        "minimum": 50,
                        "maximum": 50000,
                    },
                },
                "required": ["id", "depends_on", "max_words"],
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
    length_limit: int | None


class DependencyWordCount(TypedDict):
    id: str
    depends_on: list[str]
    max_words: int


class DependencyWordCountResult(TypedDict):
    sections: list[DependencyWordCount]


def validate_dependencies_word_counts(
    response: DependencyWordCountResult,
    *,
    input_sections: list[EnrichedSection],
) -> None:
    if not response.get("sections"):
        raise ValidationError("No sections in dependency/word count result")

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

    total_words = sum(s["max_words"] for s in response["sections"])
    if total_words < 500:
        raise ValidationError(
            "Total word count too low",
            context={
                "total_words": total_words,
                "min_required": 500,
                "recovery_instruction": "Increase word allocations to reach at least 500 words total",
            },
        )

    if total_words > 50000:
        raise ValidationError(
            "Total word count exceeds reasonable limit",
            context={
                "total_words": total_words,
                "max_allowed": 50000,
                "recovery_instruction": "Reduce word allocations to stay under 50000 words",
            },
        )


async def generate_dependencies_word_counts(
    *,
    classification: list[SectionClassification],
    length_constraints: list[LengthConstraint],
    trace_id: str,
) -> DependencyWordCountResult:
    length_by_id = {lc["id"]: lc for lc in length_constraints}

    enriched: list[EnrichedSection] = []
    for cls in classification:
        length = length_by_id.get(cls["id"])
        enriched.append(
            EnrichedSection(
                id=cls["id"],
                title="",
                long_form=cls["long_form"],
                is_plan=cls["is_plan"],
                clinical=cls["clinical"],
                needs_writing=cls["needs_writing"],
                length_limit=length["length_limit"] if length else None,
            )
        )

    messages = DEPENDENCIES_USER_PROMPT.to_string(
        sections=serialize(enriched).decode("utf-8"),
    )

    return await handle_completions_request(
        prompt_identifier="dependencies_word_counts",
        response_type=DependencyWordCountResult,
        response_schema=dependencies_schema,
        validator=partial(validate_dependencies_word_counts, input_sections=enriched),
        messages=messages,
        system_prompt=DEPENDENCIES_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        thinking_budget=DEFAULT_THINKING_BUDGET,
        trace_id=trace_id,
    )
