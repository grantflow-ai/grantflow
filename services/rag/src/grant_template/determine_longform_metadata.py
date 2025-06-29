from functools import partial
from typing import Final, NotRequired, TypedDict

from packages.db.src.tables import FundingOrganization
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_template.determine_application_sections import ExtractedSectionDTO
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import EvaluationCriterion, with_prompt_evaluation
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.shared_prompts import ORGANIZATION_GUIDELINES_FRAGMENT

logger = get_logger(__name__)

GENERATE_GRANT_TEMPLATE_SYSTEM_PROMPT: Final[str] = """
You generate structured metadata for grant application sections.
Focus on word counts, keywords, search queries, and dependencies.
Be concise and specific.
"""

GENERATE_GRANT_TEMPLATE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="grant_template_generation",
    template=r"""
    Generate metadata for these grant application sections:

    ${organization_guidelines}

    <cfp_subject>${cfp_subject}</cfp_subject>
    <cfp_content>${cfp_content}</cfp_content>
    <sections>${long_form_sections}</sections>

    For each section, provide:

    1. **Word Count**:
       - If page limits are provided in CFP content: Use 415 words/page TNR 11pt or 500/page Arial 11pt
       - If page limits are NOT provided: Use these defaults:
         * Project Summary: 300 words
         * Background/Significance: 800 words
         * Specific Aims: 500 words
         * Research Plan: 2000 words (50-66% of total)
         * Expected Outcomes: 400 words
         * Timeline/Milestones: 600 words
         * Other sections: 500-800 words based on importance
       - Reduce total by 12.5% for figures

    2. **Keywords**: 5-15 specific domain terms

    3. **Topics**: 3-8 key areas to address

    4. **Generation Instructions**: 100-500 words explaining:
       - Section purpose
       - Required content
       - Writing style
       - Common pitfalls

    5. **Search Queries**: 3-10 specific queries for evidence retrieval

    6. **Dependencies**: List section IDs this depends on

    Requirements:
    - Match all input section IDs exactly
    - Word counts must sum to total minus figure allocation
    - Instructions must be actionable and specific
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


class SectionMetadata(TypedDict):
    id: str
    keywords: list[str]
    topics: list[str]
    generation_instructions: str
    depends_on: list[str]
    max_words: int
    search_queries: list[str]


class TemplateSectionsResponse(TypedDict):
    sections: list[SectionMetadata]
    error: NotRequired[str | None]


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

    research_plan_sections = [s for s in input_sections if s.get("is_detailed_research_plan")]
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


async def generate_grant_template(
    task_description: str, *, input_sections: list[ExtractedSectionDTO]
) -> TemplateSectionsResponse:
    return await handle_completions_request(
        prompt_identifier="grant_template_extraction",
        messages=task_description,
        response_schema=grant_template_generation_json_schema,
        response_type=TemplateSectionsResponse,
        validator=partial(validate_template_sections, input_sections=input_sections),
        system_prompt=GENERATE_GRANT_TEMPLATE_SYSTEM_PROMPT,
        temperature=0.1,
        top_p=0.9,
        candidate_count=2,
    )


evaluation_criteria = [
    EvaluationCriterion(
        name="Word Count Analysis",
        evaluation_instructions="""
        Check word count allocations:
        - If page limits provided: Total should match source page limits
        - If page limits missing: Use reasonable defaults (300-2000 words per section)
        - Research plan gets 50-66% of words when possible
        - Distribution reflects section importance
        - All sections have minimum 50 words, maximum 10000 words
        """,
        weight=0.8,
    ),
    EvaluationCriterion(
        name="Content Guidance Quality",
        evaluation_instructions="""
        Check content guidance:
        - Keywords are specific and relevant
        - Instructions are clear and actionable
        - Search queries retrieve useful evidence
        """,
        weight=0.9,
    ),
    EvaluationCriterion(
        name="Dependencies and Structure",
        evaluation_instructions="""
        Verify dependencies:
        - No circular dependencies
        - Logical content flow
        - All sections properly connected
        """,
        weight=0.7,
    ),
]


async def handle_generate_grant_template(
    *,
    cfp_content: str,
    cfp_subject: str,
    organization: FundingOrganization | None,
    long_form_sections: list[ExtractedSectionDTO],
) -> list[SectionMetadata]:
    prompt = GENERATE_GRANT_TEMPLATE_USER_PROMPT.substitute(
        cfp_content=cfp_content,
        cfp_subject=cfp_subject,
        long_form_sections="\n".join(
            [
                f"- {section['id']}: {section['title']}"
                + (" (Detailed Research Plan)" if section.get("is_detailed_research_plan") else "")
                + (" (Clinical Trial)" if section.get("is_clinical_trial") else "")
                + (" (Title Only)" if section.get("is_title_only") else "")
                for section in long_form_sections
            ],
        ),
    )

    organization_guidelines = (
        ORGANIZATION_GUIDELINES_FRAGMENT.to_string(
            rag_results=await retrieve_documents(
                organization_id=str(organization.id),
                task_description=str(prompt),
            ),
            organization_full_name=organization.full_name,
            organization_abbreviation=organization.abbreviation,
        )
        if organization
        else ""
    )

    criteria = [*evaluation_criteria]

    if organization_guidelines:
        criteria.append(
            EvaluationCriterion(
                name="Organizational Compliance",
                evaluation_instructions="""
                Check org guidelines:
                - Formatting matches requirements
                - Section names follow conventions
                - Word limits align with org specs
                """,
                weight=0.8,
            )
        )

    result: TemplateSectionsResponse = await with_prompt_evaluation(
        prompt_identifier="grant_template_generation",
        prompt_handler=partial(generate_grant_template, input_sections=long_form_sections),
        prompt=prompt.to_string(
            organization_guidelines=organization_guidelines,
        ),
        increment=15,
        retries=3,
        criteria=criteria,
        passing_score=70,
    )
    return result["sections"]
