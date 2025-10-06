from functools import partial
from typing import Final, TypedDict

from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.serialization import serialize

from services.rag.src.grant_template.cfp_analysis.constants import TEMPERATURE
from services.rag.src.grant_template.template_generation.section_classification import SectionClassification
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate

CONTENT_METADATA_SYSTEM_PROMPT: Final[str] = (
    "You generate content metadata for grant application sections. "
    "Focus on keywords, topics, instructions, and search queries. Be specific and actionable."
)

CONTENT_METADATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="content_metadata",
    template="""# Generate Content Metadata

## Organization Guidelines
${organization_guidelines}

## Enriched Sections
${sections}

## Task

For each section requiring writing (needs_writing=true), generate content metadata.

### Fields

1. **keywords**: 5-15 specific domain terms
   - Research plan sections: 10-15 keywords
   - Other sections: 5-10 keywords
   - Be specific: "preliminary data analysis" not "data"

2. **topics**: 3-8 key areas to address
   - Research plan sections: 5-8 topics
   - Other sections: 3-5 topics
   - Focus on what content must cover

3. **generation_instructions**: 100-500 words
   - Purpose of this section
   - Key content to include
   - Writing style and tone
   - Common pitfalls to avoid
   - Be specific and actionable

4. **search_queries**: 3-10 queries for RAG retrieval
   - Research plan sections: 7-10 queries
   - Other sections: 3-5 queries
   - Diverse queries covering different aspects
   - Specific to section's focus

### Guidelines

- For sections with needs_writing=false, provide minimal metadata (empty keywords/topics, basic instructions)
- Use section guidelines and definition to inform metadata
- Research plan (is_plan=true) gets most detailed metadata
- Clinical sections focus on trial-specific terms

### Output

Return all sections with content metadata.
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
    sections: list[SectionClassification],
    organization_guidelines: str,
    *,
    trace_id: str,
) -> ContentMetadataResult:
    messages = CONTENT_METADATA_USER_PROMPT.to_string(
        organization_guidelines=organization_guidelines or "No organization guidelines provided.",
        sections=serialize(sections).decode("utf-8"),
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
