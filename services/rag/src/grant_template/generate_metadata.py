import asyncio
from functools import partial
from typing import TYPE_CHECKING, Final, NotRequired, TypedDict, TypeGuard, cast

from packages.db.src.json_objects import GrantElement, GrantLongFormSection, OrganizationNamespace
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.dto import ExtractedSectionDTO, SectionMetadata
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_template.utils import detect_cycle
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.shared_prompts import ORGANIZATION_GUIDELINES_FRAGMENT

if TYPE_CHECKING:
    from services.rag.src.grant_template.dto import SectionExtractionStageDTO
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)

GENERATE_GRANT_TEMPLATE_SYSTEM_PROMPT: Final[str] = """
You generate structured metadata for grant application sections.
Focus on word counts, keywords, search queries, and dependencies.
Be concise and specific.
"""

GENERATE_GRANT_TEMPLATE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="grant_template_generation",
    template=r"""
Generate metadata for grant application sections.

${organization_guidelines}

<cfp_content>${cfp_content}</cfp_content>
<sections>${long_form_sections}</sections>

## Required Fields

For each section provide:

1. **Word Count**: Use 415 words/page (TNR 11pt) or defaults (Project Summary: 300, Research Plan: 2000). Reduce by 12.5% for figures.
2. **Keywords**: 5-15 specific domain terms
3. **Topics**: 3-8 key areas to address
4. **Generation Instructions**: 100-500 words (purpose, content, style, pitfalls)
5. **Search Queries**: 3-10 queries for evidence retrieval
6. **Dependencies**: Section IDs this depends on

## Requirements

- Match all input section IDs exactly
- Word counts sum to total minus figure allocation
- Instructions must be actionable and specific

## Example

Input sections:
```
- project_summary: Project Summary
- research_plan_background: Background and Significance (subsection of Research Plan)
```

Output:
```json
{
  "sections": [
    {
      "id": "project_summary",
      "keywords": ["research objectives", "innovation", "broader impacts", "methodology overview", "significance"],
      "topics": ["Research goals and hypotheses", "Scientific approach", "Expected outcomes", "Broader impacts on field"],
      "generation_instructions": "Write a concise overview that captures the essence of the research. Begin with the problem statement, followed by research objectives, approach, and expected impact. Emphasize innovation and broader impacts. Use accessible language for interdisciplinary reviewers. Avoid technical jargon in this summary section.",
      "depends_on": [],
      "max_words": 300,
      "search_queries": [
        "research proposal project summary best practices",
        "grant application overview writing guidelines",
        "broader impacts statement examples"
      ]
    },
    {
      "id": "research_plan_background",
      "keywords": ["literature review", "knowledge gap", "preliminary work", "theoretical framework", "state of the art"],
      "topics": ["Current state of knowledge", "Identified gaps", "Preliminary findings", "Theoretical foundation"],
      "generation_instructions": "Provide comprehensive background establishing the scientific foundation. Review current state of knowledge, identify gaps your research will fill, and reference preliminary work. Build logical argument for why this research is needed. Include key citations and demonstrate familiarity with field. Connect background directly to proposed research objectives.",
      "depends_on": ["project_summary"],
      "max_words": 600,
      "search_queries": [
        "literature review research background",
        "preliminary data research proposal",
        "theoretical framework scientific writing",
        "knowledge gaps identification methodology"
      ]
    }
  ]
}
```

Return metadata for all input sections following this pattern.
    """,
)

grant_template_generation_json_schema: Final = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "sections": {
            "type": "array",
            "description": "Array of section metadata objects for grant template generation",
            "items": {
                "type": "object",
                "required": [
                    "id",
                    "keywords",
                    "topics",
                    "generation_instructions",
                    "depends_on",
                    "max_words",
                    "search_queries",
                ],
                "properties": {
                    "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "description": "Section ID from input that must match exactly",
                    },
                    "keywords": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 2, "maxLength": 50},
                        "minItems": 3,
                        "maxItems": 20,
                        "description": "5-15 relevant scientific/technical terms for this section",
                    },
                    "topics": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 3, "maxLength": 100},
                        "minItems": 2,
                        "maxItems": 10,
                        "description": "3-8 core topics the section must address",
                    },
                    "generation_instructions": {
                        "type": "string",
                        "minLength": 50,
                        "maxLength": 2000,
                        "description": "Detailed guidance for content generation specific to this section",
                    },
                    "depends_on": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 1},
                        "description": "Section IDs this section depends on, empty array if none",
                    },
                    "max_words": {
                        "type": "integer",
                        "minimum": 50,
                        "maximum": 10000,
                        "description": "Recommended word limit based on content depth and page limits",
                    },
                    "search_queries": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 5, "maxLength": 200},
                        "minItems": 3,
                        "maxItems": 10,
                        "description": "3-10 queries to retrieve relevant information for this section",
                    },
                },
            },
        },
        "error": {
            "type": "string",
            "nullable": True,
            "description": "Error message if processing fails, null otherwise",
        },
    },
}



dependencies_word_counts_schema: Final = {
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
                    "max_words": {"type": "integer", "minimum": 50},
                },
                "required": ["id", "depends_on", "max_words"],
            },
        },
    },
    "required": ["sections"],
}

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
                        "items": {"type": "string"},
                        "minItems": 3,
                        "maxItems": 20,
                    },
                    "topics": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 2,
                        "maxItems": 10,
                    },
                    "generation_instructions": {
                        "type": "string",
                        "minLength": 50,
                    },
                    "search_queries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 3,
                        "maxItems": 10,
                    },
                },
                "required": ["id", "keywords", "topics", "generation_instructions", "search_queries"],
            },
        },
    },
    "required": ["sections"],
}


class DependenciesWordCountsSection(TypedDict):
    id: str
    depends_on: list[str]
    max_words: int


class DependenciesWordCountsResult(TypedDict):
    sections: list[DependenciesWordCountsSection]


class ContentMetadataSection(TypedDict):
    id: str
    keywords: list[str]
    topics: list[str]
    generation_instructions: str
    search_queries: list[str]


class ContentMetadataResult(TypedDict):
    sections: list[ContentMetadataSection]


class TemplateSectionsResponse(TypedDict):
    sections: list[SectionMetadata]
    error: NotRequired[str | None]




def is_long_form_section(section: GrantElement | GrantLongFormSection) -> TypeGuard[GrantLongFormSection]:
    return "max_words" in section




def validate_dependencies_word_counts(
    response: DependenciesWordCountsResult, *, input_sections: list[ExtractedSectionDTO]
) -> None:
    if not response.get("sections"):
        raise ValidationError("No section dependencies/word counts extracted")

    input_section_ids = {section["id"] for section in input_sections}
    output_section_ids = {section["id"] for section in response["sections"]}

    if input_section_ids != output_section_ids:
        added = output_section_ids - input_section_ids
        removed = input_section_ids - output_section_ids
        raise ValidationError(
            "Section mismatch in dependencies extraction",
            context={
                "added_sections": list(added) if added else None,
                "removed_sections": list(removed) if removed else None,
                "expected_section_ids": list(input_section_ids),
                "actual_section_ids": list(output_section_ids),
                "recovery_instruction": "Match input section IDs exactly",
            },
        )

    for section in response["sections"]:
        for dependency in section["depends_on"]:
            if dependency not in input_section_ids:
                raise ValidationError(
                    "Invalid section dependency",
                    context={
                        "section_id": section["id"],
                        "invalid_dependency": dependency,
                        "valid_dependencies": list(input_section_ids),
                        "recovery_instruction": "Use only valid section IDs for dependencies",
                    },
                )

        if section["id"] in section["depends_on"]:
            raise ValidationError(
                "Section cannot depend on itself",
                context={
                    "section_id": section["id"],
                    "recovery_instruction": "Remove self-reference from dependencies",
                },
            )

    dependency_graph = {section["id"]: section["depends_on"] for section in response["sections"]}

    for section_id in dependency_graph:
        if cycle_nodes := detect_cycle(dependency_graph, section_id):
            cycle_list = list(cycle_nodes)
            raise ValidationError(
                "Dependency cycle detected in section dependencies",
                context={
                    "cycle_nodes": cycle_list,
                    "cycle_path": " → ".join([*cycle_list, cycle_list[0]]),
                    "recovery_instruction": f"Break the dependency cycle by removing one dependency from the path: {' → '.join(cycle_list)}",
                },
            )

    for section in response["sections"]:
        if section["max_words"] <= 0:
            raise ValidationError(
                "Invalid word count",
                context={
                    "section_id": section["id"],
                    "max_words": section["max_words"],
                    "recovery_instruction": "Provide positive word count (at least 50)",
                },
            )

    total_words = sum(section["max_words"] for section in response["sections"])
    min_total_words = 500
    max_total_words = 50000

    if total_words < min_total_words:
        raise ValidationError(
            "Total word count too low for grant application",
            context={
                "total_words": total_words,
                "min_required": min_total_words,
                "section_count": len(response["sections"]),
                "recovery_instruction": f"Increase word counts to reach at least {min_total_words} total words across all sections",
            },
        )

    if total_words > max_total_words:
        raise ValidationError(
            "Total word count exceeds reasonable grant application length",
            context={
                "total_words": total_words,
                "max_allowed": max_total_words,
                "section_count": len(response["sections"]),
                "recovery_instruction": f"Reduce word counts to stay under {max_total_words} total words",
            },
        )


def validate_content_metadata(
    response: ContentMetadataResult, *, input_sections: list[ExtractedSectionDTO]
) -> None:
    if not response.get("sections"):
        raise ValidationError("No content metadata extracted")

    input_section_ids = {section["id"] for section in input_sections}
    output_section_ids = {section["id"] for section in response["sections"]}

    if input_section_ids != output_section_ids:
        added = output_section_ids - input_section_ids
        removed = input_section_ids - output_section_ids
        raise ValidationError(
            "Section mismatch in content metadata extraction",
            context={
                "added_sections": list(added) if added else None,
                "removed_sections": list(removed) if removed else None,
                "expected_section_ids": list(input_section_ids),
                "actual_section_ids": list(output_section_ids),
                "recovery_instruction": "Match input section IDs exactly",
            },
        )

    for section in response["sections"]:
        if len(section["keywords"]) < 3:
            raise ValidationError(
                "Insufficient keywords",
                context={
                    "section_id": section["id"],
                    "keyword_count": len(section["keywords"]),
                    "recovery_instruction": "Provide at least 3 relevant keywords",
                },
            )

        if len(section["topics"]) < 2:
            raise ValidationError(
                "Insufficient topics",
                context={
                    "section_id": section["id"],
                    "topic_count": len(section["topics"]),
                    "recovery_instruction": "Provide at least 2 relevant topics",
                },
            )

        if len(section["generation_instructions"]) < 50:
            raise ValidationError(
                "Generation instructions too short",
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
                    "recovery_instruction": "Provide at least 3 diverse search queries",
                },
            )


def validate_template_sections(
    response: TemplateSectionsResponse, *, input_sections: list[ExtractedSectionDTO]
) -> None:
    if error := response.get("error"):  # occasionally, the model suffers a stroke and returns "null" as a string ~keep
        raise InsufficientContextError(
            error,
            context={
                "input_section_count": len(input_sections),
                "input_section_ids": [s["id"] for s in input_sections],
                "recovery_instruction": "Ensure you fully understand the input sections before generating metadata",
            },
        )

    if not response["sections"]:
        raise ValidationError(
            "No sections generated",
            context={
                "input_section_count": len(input_sections),
                "input_section_ids": [s["id"] for s in input_sections],
                "recovery_instruction": "Generate metadata for all input sections",
            },
        )

    input_section_ids = {section["id"] for section in input_sections}
    output_section_ids = {section["id"] for section in response["sections"]}

    if input_section_ids != output_section_ids:
        added = output_section_ids - input_section_ids
        removed = input_section_ids - output_section_ids
        raise ValidationError(
            "Section mismatch detected",
            context={
                "added_sections": list(added) if added else None,
                "removed_sections": list(removed) if removed else None,
                "expected_section_ids": list(input_section_ids),
                "actual_section_ids": list(output_section_ids),
                "recovery_instruction": (
                    "Remove any sections that weren't in the input and add back all missing sections. "
                    "Section IDs must match the input exactly."
                ),
            },
        )

    for section in response["sections"]:
        if len(section["keywords"]) < 3:
            raise ValidationError(
                "Insufficient keywords provided",
                context={
                    "section_id": section["id"],
                    "section_title": next((s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"),
                    "keyword_count": len(section["keywords"]),
                    "min_required": 3,
                    "provided_keywords": section["keywords"],
                    "recovery_instruction": f"Provide at least 3 relevant keywords for section '{section['id']}'",
                },
            )

        if len(section["topics"]) < 2:
            raise ValidationError(
                "Insufficient topics provided",
                context={
                    "section_id": section["id"],
                    "section_title": next((s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"),
                    "topic_count": len(section["topics"]),
                    "min_required": 2,
                    "provided_topics": section["topics"],
                    "recovery_instruction": f"Provide at least 2 relevant topics for section '{section['id']}'",
                },
            )

        if len(section["generation_instructions"]) < 50:
            raise ValidationError(
                "Generation instructions too short",
                context={
                    "section_id": section["id"],
                    "section_title": next((s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"),
                    "instruction_length": len(section["generation_instructions"]),
                    "min_required": 50,
                    "actual_instructions": section["generation_instructions"],
                    "recovery_instruction": f"Provide more detailed generation instructions (at least 50 characters) for section '{section['id']}'",
                },
            )

        instructions = section["generation_instructions"]
        sentence_count = instructions.count(".") + instructions.count("!") + instructions.count("?")
        word_count = len(instructions.split())

        quality_issues = []
        if sentence_count < 2:
            quality_issues.append("Contains fewer than 2 sentences")
        if word_count < 10:
            quality_issues.append(f"Contains only {word_count} words (minimum 10)")

        directive_patterns = [
            "write", "provide", "describe", "explain", "discuss", "include", "address",
            "focus", "emphasize", "outline", "detail", "analyze", "present", "develop"
        ]
        has_directive = any(pattern in instructions.lower() for pattern in directive_patterns)
        if not has_directive:
            quality_issues.append("Missing directive language (write, provide, describe, etc.)")

        if quality_issues:
            raise ValidationError(
                "Generation instructions lack sufficient detail or directive guidance",
                context={
                    "section_id": section["id"],
                    "section_title": next((s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"),
                    "quality_issues": quality_issues,
                    "sentence_count": sentence_count,
                    "word_count": word_count,
                    "has_directive_language": has_directive,
                    "actual_instructions": instructions,
                    "recovery_instruction": f"Provide detailed, actionable generation instructions with multiple sentences and directive language for section '{section['id']}'",
                },
            )

        if len(section["search_queries"]) < 3:
            raise ValidationError(
                "Insufficient search queries provided",
                context={
                    "section_id": section["id"],
                    "section_title": next((s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"),
                    "query_count": len(section["search_queries"]),
                    "min_required": 3,
                    "provided_queries": section["search_queries"],
                    "recovery_instruction": f"Provide at least 3 diverse search queries for section '{section['id']}'",
                },
            )

        section_data = next((s for s in input_sections if s["id"] == section["id"]), None)
        is_research_plan = section_data.get("is_plan") if section_data else False
        min_query_length = 10 if is_research_plan else 5

        invalid_queries = []
        for idx, query in enumerate(section["search_queries"]):
            query_stripped = query.strip()
            if not query_stripped:
                invalid_queries.append(f"Query {idx + 1}: empty or whitespace only")
            elif len(query_stripped) < min_query_length:
                invalid_queries.append(f"Query {idx + 1}: too short ({len(query_stripped)} chars, min {min_query_length})")
            elif len(query_stripped.split()) < 2:
                invalid_queries.append(f"Query {idx + 1}: single word query '{query_stripped}'")

        if invalid_queries:
            raise ValidationError(
                "Search queries contain trivial or low-quality entries",
                context={
                    "section_id": section["id"],
                    "section_title": next((s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"),
                    "is_research_plan": is_research_plan,
                    "invalid_queries": invalid_queries,
                    "min_query_length": min_query_length,
                    "recovery_instruction": f"Provide meaningful search queries with at least {min_query_length} characters and multiple words for section '{section['id']}'",
                },
            )

        for dependency in section["depends_on"]:
            if dependency not in input_section_ids:
                raise ValidationError(
                    "Invalid section dependency",
                    context={
                        "section_id": section["id"],
                        "section_title": next(
                            (s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"
                        ),
                        "invalid_dependency": dependency,
                        "valid_dependencies": list(input_section_ids),
                        "recovery_instruction": f"Section '{section['id']}' depends on '{dependency}' which doesn't exist. Use only valid section IDs from the input.",
                    },
                )

        if section["max_words"] <= 0:
            raise ValidationError(
                "Invalid word count",
                context={
                    "section_id": section["id"],
                    "section_title": next((s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"),
                    "max_words": section["max_words"],
                    "recommended_minimum": 50,
                    "recovery_instruction": f"Provide a positive word count (at least 50) for section '{section['id']}'",
                },
            )

        if section["id"] in section["depends_on"]:
            raise ValidationError(
                "Section cannot depend on itself",
                context={
                    "section_id": section["id"],
                    "section_title": next((s["title"] for s in input_sections if s["id"] == section["id"]), "Unknown"),
                    "dependencies": section["depends_on"],
                    "recovery_instruction": f"Remove self-reference from the dependencies of section '{section['id']}'",
                },
            )

    input_sections_by_id = {s["id"]: s for s in input_sections}
    inconsistencies = []

    for section in response["sections"]:
        input_section = input_sections_by_id.get(section["id"])
        if not input_section:
            continue

        if input_section.get("is_plan"):
            if len(section["keywords"]) < 5:
                inconsistencies.append(f"Research plan section '{section['id']}' has only {len(section['keywords'])} keywords (expected 5+)")
            if len(section["topics"]) < 3:
                inconsistencies.append(f"Research plan section '{section['id']}' has only {len(section['topics'])} topics (expected 3+)")
            if section["max_words"] < 500:
                inconsistencies.append(f"Research plan section '{section['id']}' has only {section['max_words']} words (expected 500+)")

        if input_section.get("long_form") and section["max_words"] < 100:
            inconsistencies.append(f"Long-form section '{section['id']}' has only {section['max_words']} words (expected 100+)")

    if inconsistencies:
        raise ValidationError(
            "Metadata inconsistent with input section properties",
            context={
                "inconsistencies": inconsistencies,
                "inconsistency_count": len(inconsistencies),
                "recovery_instruction": "Ensure metadata (keywords, topics, word counts) aligns with section type (research_plan, long_form)",
            },
        )

    total_words = sum(section["max_words"] for section in response["sections"])
    if total_words < 50:
        raise ValidationError(
            "Total word count allocation is unreasonably low",
            context={
                "total_words": total_words,
                "min_expected": 50,
                "section_word_counts": {s["id"]: s["max_words"] for s in response["sections"]},
                "recovery_instruction": "Increase word counts across sections to reach a reasonable total (at least 1000 words recommended)",
            },
        )

    research_plan_sections = [s for s in input_sections if s.get("is_plan")]
    if research_plan_sections:
        research_plan_id = research_plan_sections[0]["id"]
        research_plan_metadata = next((s for s in response["sections"] if s["id"] == research_plan_id), None)

        if research_plan_metadata and research_plan_metadata["max_words"] < 100:
            raise ValidationError(
                "Research Plan section requires more substantial word count",
                context={
                    "section_id": research_plan_id,
                    "section_title": research_plan_sections[0].get("title", "Research Plan"),
                    "max_words": research_plan_metadata["max_words"],
                    "min_expected": 100,
                    "recovery_instruction": f"Increase the word count for the research_plan section '{research_plan_id}' to at least 100 words",
                },
            )




async def extract_dependencies_word_counts(
    task_description: str,
    input_sections: list[ExtractedSectionDTO],
    *,
    trace_id: str,
) -> DependenciesWordCountsResult:
    return await handle_completions_request(
        prompt_identifier="dependencies_word_counts",
        response_type=DependenciesWordCountsResult,
        response_schema=dependencies_word_counts_schema,
        validator=partial(validate_dependencies_word_counts, input_sections=input_sections),
        messages=task_description,
        system_prompt=(
            "Extract section dependencies and word count allocations for grant application sections. "
            "Dependencies: Sections that must be written before this one. "
            "Word counts: Use 415 words/page (TNR 11pt) or CFP defaults. "
            "Allocate proportionally based on section importance and CFP requirements. "
            "Return valid JSON only."
        ),
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


async def extract_content_metadata(
    task_description: str,
    input_sections: list[ExtractedSectionDTO],
    *,
    trace_id: str,
) -> ContentMetadataResult:
    return await handle_completions_request(
        prompt_identifier="content_metadata",
        response_type=ContentMetadataResult,
        response_schema=content_metadata_schema,
        validator=partial(validate_content_metadata, input_sections=input_sections),
        messages=task_description,
        system_prompt=(
            "Generate content metadata for grant application sections. "
            "Keywords: 5-15 specific domain terms for this section. "
            "Topics: 3-8 key areas the section must address. "
            "Instructions: 100-500 words with purpose, content, style, pitfalls. "
            "Search queries: 3-10 queries to retrieve relevant evidence. "
            "Be specific and actionable. Return valid JSON only."
        ),
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )



async def generate_grant_template(
    task_description: str, *, trace_id: str, input_sections: list[ExtractedSectionDTO]
) -> TemplateSectionsResponse:
    return cast(
        "TemplateSectionsResponse",
        await handle_completions_request(
            prompt_identifier="grant_template_extraction",
            messages=task_description,
            response_schema=grant_template_generation_json_schema,
            response_type=TemplateSectionsResponse,
            validator=partial(validate_template_sections, input_sections=input_sections),
            system_prompt=GENERATE_GRANT_TEMPLATE_SYSTEM_PROMPT,
            temperature=0.1,
            top_p=0.9,
            trace_id=trace_id,
        ),
    )


def merge_section_with_metadata(
    section: ExtractedSectionDTO, metadata: SectionMetadata
) -> GrantLongFormSection | GrantElement:
    is_long_form = section.get("long_form", False)

    if not is_long_form:
        return GrantElement(
            id=section["id"],
            order=section["order"],
            title=section["title"],
            evidence="",
            parent_id=section.get("parent"),
            needs_applicant_writing=bool(section.get("needs_writing", False)),
        )

    result = GrantLongFormSection(
        id=metadata["id"],
        order=section["order"],
        title=section["title"],
        evidence="",
        parent_id=section.get("parent"),
        needs_applicant_writing=bool(section.get("needs_writing", True)),
        depends_on=metadata["depends_on"],
        generation_instructions=metadata["generation_instructions"],
        keywords=metadata["keywords"],
        max_words=metadata["max_words"],
        search_queries=metadata["search_queries"],
        topics=metadata["topics"],
        is_clinical_trial=section.get("clinical"),
        is_detailed_research_plan=section.get("is_plan"),
    )

    if section.get("guidelines"):
        result["guidelines"] = section["guidelines"]

    if section.get("length_limit"):
        result["length_limit"] = section["length_limit"]

    if "length_source" in section:
        result["length_source"] = section["length_source"]

    if "other_limits" in section:
        result["other_limits"] = section["other_limits"]

    if "definition" in section:
        result["definition"] = section["definition"]

    llm_words = metadata["max_words"]
    cfp_limit = section.get("length_limit")
    if cfp_limit is not None and (cfp_limit < llm_words * 0.7 or cfp_limit > llm_words * 1.5):
        logger.warning(
            "Length constraint mismatch between LLM and CFP",
            section_id=section["id"],
            section_title=section["title"],
            llm_recommendation=llm_words,
            cfp_constraint=cfp_limit,
            difference_pct=int(abs(cfp_limit - llm_words) / llm_words * 100),
        )

    return result


async def handle_generate_grant_template_metadata(
    *,
    cfp_content: str,
    organization: OrganizationNamespace | None,
    long_form_sections: list[ExtractedSectionDTO],
    trace_id: str,
    job_manager: "JobManager[SectionExtractionStageDTO]",
) -> list[GrantLongFormSection | GrantElement]:
    prompt = GENERATE_GRANT_TEMPLATE_USER_PROMPT.substitute(
        cfp_content=cfp_content,
        long_form_sections="\n".join(
            [
                f"- {section['id']}: {section['title']}"
                + (" (Detailed Research Plan)" if section.get("is_plan") else "")
                + (" (Clinical Trial)" if section.get("clinical") else "")
                + (" (Title Only)" if section.get("title_only") else "")
                for section in long_form_sections
            ],
        ),
    )

    rag_results = []
    if organization:
        rag_results = await retrieve_documents(
            organization_id=str(organization["id"]),
            task_description=str(prompt),
            trace_id=trace_id,
        )

        compressed_rag_results = compress_prompt_text("\n".join(rag_results), aggressive=True)

        logger.debug(
            "Prepared and compressed RAG results for organization guidelines",
            original_rag_chars=len("\n".join(rag_results)),
            compressed_rag_chars=len(compressed_rag_results),
            trace_id=trace_id,
        )

        organization_guidelines = ORGANIZATION_GUIDELINES_FRAGMENT.to_string(
            rag_results=compressed_rag_results,
            organization_full_name=organization["full_name"],
            organization_abbreviation=organization["abbreviation"],
        )
    else:
        organization_guidelines = ""

    full_prompt = prompt.to_string(
        organization_guidelines=organization_guidelines,
    )

    logger.info("Starting parallel metadata extraction", trace_id=trace_id)

    dependencies_result, content_result = await asyncio.gather(
        extract_dependencies_word_counts(full_prompt, long_form_sections, trace_id=trace_id),
        extract_content_metadata(full_prompt, long_form_sections, trace_id=trace_id),
    )

    logger.info(
        "Parallel metadata extractions completed",
        dependencies_sections=len(dependencies_result["sections"]),
        content_sections=len(content_result["sections"]),
        trace_id=trace_id,
    )

    metadata_by_id: dict[str, SectionMetadata] = {}

    for dep_data in dependencies_result["sections"]:
        base_metadata: SectionMetadata = {
            "id": dep_data["id"],
            "depends_on": dep_data["depends_on"],
            "max_words": dep_data["max_words"],
            "keywords": [],
            "topics": [],
            "generation_instructions": "",
            "search_queries": [],
        }
        metadata_by_id[dep_data["id"]] = base_metadata

    for content_data in content_result["sections"]:
        section_id = content_data["id"]
        if section_id in metadata_by_id:
            metadata_by_id[section_id]["keywords"] = content_data["keywords"]
            metadata_by_id[section_id]["topics"] = content_data["topics"]
            metadata_by_id[section_id]["generation_instructions"] = content_data["generation_instructions"]
            metadata_by_id[section_id]["search_queries"] = content_data["search_queries"]
        else:
            logger.warning(
                "Content metadata for unknown section ID",
                section_id=section_id,
                trace_id=trace_id,
            )

    logger.info(
        "Merged parallel metadata results",
        total_metadata_sections=len(metadata_by_id),
        trace_id=trace_id,
    )

    merged_sections = [
        merge_section_with_metadata(section, metadata_by_id[section["id"]])
        for section in long_form_sections
        if section["id"] in metadata_by_id
    ]

    merged_long_form_sections = [s for s in merged_sections if is_long_form_section(s)]
    sections_with_constraints = sum(1 for s in merged_long_form_sections if s.get("length_source"))
    avg_word_count = (
        sum(s["max_words"] for s in merged_long_form_sections) // len(merged_long_form_sections)
        if merged_long_form_sections
        else 0
    )

    logger.info(
        "Merged sections with metadata",
        sections_count=len(merged_sections),
        long_form_sections_count=len(merged_long_form_sections),
        sections_with_constraints=sections_with_constraints,
        avg_word_count=avg_word_count,
        trace_id=trace_id,
    )

    return merged_sections
