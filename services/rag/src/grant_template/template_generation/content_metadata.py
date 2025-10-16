from functools import partial
from typing import Final, TypedDict

from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.grant_template.template_generation.section_classification import SectionClassification
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CONTENT_METADATA_SYSTEM_PROMPT: Final[str] = (
    "You are an expert grant-writing strategist embedded in a structured system designed to produce "
    "precise and actionable content metadata for grant applications. "
    "Your task is to generate metadata that supports scientifically grounded, coherent, and funder-aligned writing. "
    "Before producing output, read all available context carefully, identify missing data, reason through relationships "
    "between sections, and only then write the output. "
    "Be specific, measurable, and academically accurate-never fabricate data or generic placeholders."
)

CONTENT_METADATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="content_metadata",
    template="""# Generate Content Metadata

# Generate Content Metadata for Grant Application Sections

## Pipeline Logic

Follow this reasoning sequence before writing:
1. **Read** - Carefully read *all* provided information in `organization_guidelines` and `sections`.
   Identify section purposes, definitions, and contextual hints.
2. **Identify** - Extract the main scientific and structural focus for each section.
   Detect technical areas, repeated terms, references, or themes.
3. **Reason** - Determine how each section connects to others.
   Infer intent, content hierarchy, and emphasis from patterns and guidelines.
   If information is missing, explain briefly what's missing and why it matters before generating.
4. **Write** - Produce metadata that is *specific, measurable, and achievable*.
   Use domain terminology, concrete keywords, and realistic queries.
   Be explicit and evidence-based, reflecting reasoning from prior steps.

---

## Organization Guidelines

${organization_guidelines}

## Enriched Sections

${sections}

## Task

For each section requiring writing (`needs_writing=true`), generate **content metadata** as described below.

### Fields to Generate

1. **keywords** - 5-15 highly specific domain terms.
   - Research plan sections: 10-15 keywords.
   - Other sections: 5-10 keywords.
   - Use field-accurate, contextual terms (e.g., "neural network optimization" not "AI").

2. **topics** - 3-8 core thematic areas or discussion points.
   - Research plan sections: 5-8 topics.
   - Other sections: 3-5 topics.
   - Capture the conceptual and methodological focus.

3. **generation_instructions** - 100-500 words describing:
   - The section's scientific or administrative purpose
   - Required content and data elements
   - Writing tone and narrative style
   - Common pitfalls to avoid
   - Explicit actionable instructions (not abstract advice)

4. **search_queries** - 3-10 distinct queries for RAG retrieval.
   - Research plan sections: 7-10 queries.
   - Other sections: 3-5 queries.
   - Include variety (methods, objectives, datasets, references, names, terminology).
   - Reflect precise knowledge needs based on reasoning.

---

### Guidelines

- For `needs_writing=false`, return minimal metadata:
  empty keywords/topics, one-sentence generation instruction.
- Always align with section definitions and organizational rules.
- For research plan sections (`is_plan=true`), emphasize methodology and data-driven terms.
- Clinical sections must include trial-specific language (e.g., “Phase II design,” “patient cohort,” “regulatory compliance”).
- Prefer terms and phrasing already used in the source data; examples and real entities improve precision.

---

### Output Format

Return all sections with content metadata as a JSON structure matching the defined schema.
Do **not** include reasoning or explanations in the output itself.
""",
)

content_metadata_schema: Final = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "keywords": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 2, "maxLength": 50},
                        "minItems": 0,
                        "maxItems": 20,
                    },
                    "topics": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 3, "maxLength": 100},
                        "minItems": 0,
                        "maxItems": 10,
                    },
                    "generation_instructions": {
                        "type": "string",
                        "minLength": 20,
                        "maxLength": 2000,
                    },
                    "search_queries": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 5, "maxLength": 200},
                        "minItems": 0,
                        "maxItems": 15,
                    },
                },
                "required": ["id", "keywords", "topics", "generation_instructions", "search_queries"],
            },
        },
    },
    "required": ["sections"],
}


class ContentMetadata(TypedDict):
    id: str
    keywords: list[str]
    topics: list[str]
    generation_instructions: str
    search_queries: list[str]


class ContentMetadataResult(TypedDict):
    sections: list[ContentMetadata]


def validate_content_metadata(response: ContentMetadataResult, *, input_sections: list[SectionClassification]) -> None:
    if not response.get("sections"):
        raise ValidationError("No sections in content metadata result")

    input_ids = {s["id"] for s in input_sections}
    output_ids = {s["id"] for s in response["sections"]}

    if input_ids != output_ids:
        added = output_ids - input_ids
        removed = input_ids - output_ids
        raise ValidationError(
            "Section ID mismatch in content metadata",
            context={
                "added_sections": list(added) if added else None,
                "removed_sections": list(removed) if removed else None,
                "expected_ids": sorted(input_ids),
                "actual_ids": sorted(output_ids),
                "recovery_instruction": "Match input section IDs exactly",
            },
        )

    sections_by_id = {s["id"]: s for s in input_sections}

    for section in response["sections"]:
        input_section = sections_by_id.get(section["id"])
        if not input_section:
            continue

        if input_section["needs_writing"]:
            if len(section["keywords"]) < 3:
                raise ValidationError(
                    "Insufficient keywords for writing section",
                    context={
                        "section_id": section["id"],
                        "keyword_count": len(section["keywords"]),
                        "recovery_instruction": "Provide at least 3 keywords for sections requiring writing",
                    },
                )

            if len(section["topics"]) < 2:
                raise ValidationError(
                    "Insufficient topics for writing section",
                    context={
                        "section_id": section["id"],
                        "topic_count": len(section["topics"]),
                        "recovery_instruction": "Provide at least 2 topics for sections requiring writing",
                    },
                )

            if len(section["generation_instructions"]) < 50:
                raise ValidationError(
                    "Generation instructions too brief",
                    context={
                        "section_id": section["id"],
                        "instruction_length": len(section["generation_instructions"]),
                        "recovery_instruction": "Provide detailed instructions (at least 50 characters)",
                    },
                )

            if len(section["search_queries"]) < 3:
                raise ValidationError(
                    "Insufficient search queries",
                    context={
                        "section_id": section["id"],
                        "query_count": len(section["search_queries"]),
                        "recovery_instruction": "Provide at least 3 search queries",
                    },
                )

            if input_section["is_plan"] and len(section["keywords"]) < 5:
                raise ValidationError(
                    "Research plan needs more keywords",
                    context={
                        "section_id": section["id"],
                        "keyword_count": len(section["keywords"]),
                        "recovery_instruction": "Research plan sections need at least 5 keywords",
                    },
                )


async def generate_content_metadata(
    *,
    organization_guidelines: str,
    sections: list[SectionClassification],
    trace_id: str,
) -> ContentMetadataResult:
    messages = CONTENT_METADATA_USER_PROMPT.to_string(
        organization_guidelines=organization_guidelines or "No organization guidelines provided.",
        sections=sections,
    )

    return await handle_completions_request(
        prompt_identifier="content_metadata",
        response_type=ContentMetadataResult,
        response_schema=content_metadata_schema,
        validator=partial(validate_content_metadata, input_sections=sections),
        messages=messages,
        system_prompt=CONTENT_METADATA_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )
