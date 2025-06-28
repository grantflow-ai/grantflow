from functools import partial
from typing import Final, NotRequired, TypedDict

from packages.db.src.tables import FundingOrganization
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.grant_template.determine_application_sections import ExtractedSectionDTO
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.shared_prompts import ORGANIZATION_GUIDELINES_FRAGMENT

logger = get_logger(__name__)

GENERATE_GRANT_TEMPLATE_SYSTEM_PROMPT: Final[str] = """
You are a specialized system designed to analyze grant application requirements and generate structured specifications.
You excel at interpreting funding opportunity documentation and determining appropriate content parameters and constraints
for successful grant applications. Your expertise includes technical, scientific, and academic writing across multiple disciplines.
"""

GENERATE_GRANT_TEMPLATE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="grant_template_generation",
    template=r"""
    # Grant Template Metadata Generation System

    Your task is to add detailed metadata for long-form sections in a grant application. These metadata will guide content
    generation for each section, ensuring compliance with requirements and maximizing quality. Use the sources provided
    to determine appropriate parameters for each section.

    ## Sources

    ${organization_guidelines}

    This is the text extracted from the funding opportunity announcement:

    ### Announcement Content:

    #### The announcement subject is:

    <cfp_subject>
    ${cfp_subject}
    </cfp_subject>

    #### And these are the requirements and guidelines extracted from the announcement:

    <cfp_content>
    ${cfp_content}
    </cfp_content>

    ## Sections to Process

    Based on previous analysis, these are the long-form sections that require metadata:

    <section_data>
    ${long_form_sections}
    </section_data>

    ## Instructions

    1. Length Analysis and Word Count Allocation:
       - Identify total application length limits from sources
       - Convert all measurements to word counts using these guidelines:
         * Page count: 415 words/page (TNR 11pt), 500 words/page (Arial 11pt)
         * Characters: divide by 7 for word count
         * Lines: multiply by 10-12 depending on line spacing
       - Reduce total by 12.5% to account for figures, tables, and diagrams
       - Distribute words across sections based on strategic importance:
         * Research plan or research_plan should receive 50-66% of total words unless specified otherwise
         * Give more words to technically complex sections
         * Give fewer words to standard/boilerplate sections
       - Respect any explicit section word limits found in the guidelines

    2. Writing Guidance Integration:
       - For each section, assign 5-15 specific keywords that ground content in relevant concepts
       - Identify 3-8 topical areas that each section must address
       - Write detailed, actionable generation instructions (100-500 words) that explain:
         * The purpose of the section within the overall application
         * Required content components and their relative importance
         * Stylistic and tone requirements
         * Section-specific formatting needs
         * Common pitfalls to avoid

    3. Search Query Generation:
       - For each section, create 3-10 focused search queries that will retrieve relevant information
       - Craft queries that:
         * Target section-specific evidence needs
         * Use terminology relevant to the scientific domain
         * Are specific enough to retrieve high-quality content
         * Cover diverse aspects of the section topic
         * Would retrieve information that strengthens the application

    4. Section Dependencies:
       - Identify logical dependencies between sections
       - A section depends on another if:
         * It references content that should appear in the other section
         * It builds upon concepts introduced in the other section
         * It provides supporting evidence for claims in the other section

    ## Task Completion

    For EACH section in the provided section list, generate comprehensive metadata following the analysis steps above.

    IMPORTANT:
    - Every section ID in your output MUST exactly match one of the section IDs provided in the input
    - Do not add new sections or modify the structure
    - If you cannot determine appropriate metadata for any section, return an error instead of guessing
    - Make sure the sum of all section word counts equals the total application word count minus the allocation for figures
    - Generation instructions must be specific enough to produce content that satisfies grant reviewers
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
        temperature=0.2,
        top_p=0.7,
        candidate_count=3,
    )


evaluation_criteria = [
    EvaluationCriterion(
        name="Word Count Analysis",
        evaluation_instructions="""
        Evaluate the accuracy and quality of the word count analysis:
            - Word limits are realistically based on source documents
            - Page-to-word conversions are accurate and appropriate for the format
            - Word distributions align with section importance and typical grant structure
            - Adjustments for figures/tables are reasonable (~10-15%)
            - Word allocations are practical and balanced across sections
            - The research_plan has appropriate priority in word allocation
        """,
    ),
    EvaluationCriterion(
        name="Content Guidance Quality",
        evaluation_instructions="""
        Assess the quality and usefulness of content guidance:
            - Keywords are relevant and specific to each section
            - Topics effectively capture required content areas with minimal overlap
            - Generation instructions are clear, specific, and actionable
            - Instructions align with grant writing best practices
            - Context-specific requirements are appropriately incorporated
            - Instructions enable generation of high-quality content
        """,
    ),
    EvaluationCriterion(
        name="Search Query Effectiveness",
        evaluation_instructions="""
        Evaluate the effectiveness of the search queries:
            - Queries are focused and specific to each section
            - Diverse range of queries covers different aspects of the section
            - Terminology is appropriate for the scientific domain
            - Queries target specific evidence needed for the section
            - Queries are well-formed and likely to retrieve relevant content
            - Appropriate number of queries for each section (3-10)
        """,
    ),
    EvaluationCriterion(
        name="Structural Coherence",
        evaluation_instructions="""
        Assess the structural coherence of the template:
            - Section dependencies are logical and correctly identified
            - The overall structure forms a coherent narrative
            - Research Plan is properly integrated with related sections
            - Section relationships support a natural content flow
            - Content allocations follow standard scientific writing patterns
            - Structure supports the specific type of grant application
        """,
    ),
    EvaluationCriterion(
        name="Technical/Scientific Rigor",
        evaluation_instructions="""
        Assess technical and scientific rigor in content requirements:
            - Template emphasizes evidence-based content where appropriate
            - Requirements for methodology sections ensure technical adequacy
            - Appropriate emphasis on data analysis and interpretation
            - Content guidance supports scientifically sound propositions
            - Appropriate standards for the specific scientific domain
            - Balance between innovation and feasibility in content requirements
        """,
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
            Evaluate adherence to organizational guidelines:
                - Template respects specific organizational formatting requirements
                - Section naming conventions match organizational preferences
                - Word count limits align with organizational guidelines
                - Content requirements specific to the organization are addressed
                - Structure follows organization-specific templates where provided
                - Balance between sections matches organizational preferences
            """,
            )
        )

    result: TemplateSectionsResponse = await with_prompt_evaluation(
        prompt_identifier="grant_template_generation",
        prompt_handler=partial(generate_grant_template, input_sections=long_form_sections),
        prompt=prompt.to_string(
            organization_guidelines=organization_guidelines,
        ),
        increment=5,
        retries=5,
        criteria=criteria,
    )
    return result["sections"]
