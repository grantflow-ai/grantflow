from collections import defaultdict
from functools import partial
from typing import Final, NotRequired, TypedDict, cast

from src.db.json_objects import GrantLongFormSection
from src.db.tables import FundingOrganization
from src.exceptions import InsufficientContextError, ValidationError
from src.rag.completion import handle_completions_request
from src.rag.grant_template.extract_sections import ExtractedSectionDTO
from src.rag.grant_template.validation_utils import detect_cycle
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

GENERATE_GRANT_TEMPLATE_SYSTEM_PROMPT: Final[str] = """"
You are a specialized system designed to analyze grant application requirements and generate structured specifications.
"""

GENERATE_GRANT_TEMPLATE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="grant_template_generation",
    template=r"""
    # Grant Template Generation System

    Your task is to enhance the provided grant sections.

    ## Input Data

    ### Core Narrative Sections
    These are the core narrative sections object you will enhance:
        <core_narrative_sections>
        ${core_narrative_sections}
        </core_narrative_sections>

    ### Sources
    #### Call for Proposals
        <cfp_content>
        ${cfp_content}
        </cfp_content>

    #### Organization Guidelines
        <organization_guidelines>
        ${organization_guidelines}
        </organization_guidelines>

## Instructions
    1. Length Analysis and Word Count Allocation:
       - Identify total application length limits from sources
       - Convert all measurements to word counts:
         * Page count: 415 words/page (TNR 11pt), adjust for font type
         * Characters: divide by 7
       - Reduce by 12.5% to account for figures
       - Distribute words across sections based on research plan allocation
       - Research plan should be 50-66% of total words unless specified otherwise

    2. Writing Guidance Integration:
       - Assign keywords to ground content
       - Assign topics that capture required content areas
       - Write specific, actionable generation instructions

    3. Search Query Generation:
       - Create 3-10 focused search queries for RAG
       - Target specific content areas
       - Use section-specific terminology

    4. Dependencies and Order:
       - Maintain existing parent-child relationships
       - Add content dependencies between sections
       - Order sections logically within hierarchy

    ## Output Schema

    ```json
    {
        "sections": [{                        // List of sections, if error, return empty list
            "id": "string",                   // Must match input section ID exactly
            "title": "string",                // Display title
            "is_detailed_workplan": boolean,      // True for research plan only
            "parent_id": "string",            // Parent or null
            "is_title_only": "boolean",       // Must match input part exactly
            "keywords": ["string"],           // Grounding keywords
            "topics": ["string"],             // Textual topics
            "generation_instructions": "string", // Section generation instruction
            "depends_on": ["string"],         // Dependencies, if any
            "max_words": integer,             // Word limit
            "search_queries": ["string"],     // 3-10 queries
            "order": integer                  // Sequence number
        }],
        error: "string"                      // Error message if any, otherwise null
    }
    ```
    """,
)

grant_template_generation_json_schema: Final = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "id",
                    "title",
                    "is_detailed_workplan",
                    "parent_id",
                    "keywords",
                    "topics",
                    "generation_instructions",
                    "depends_on",
                    "max_words",
                    "search_queries",
                    "order",
                ],
                "properties": {
                    "id": {"type": "string", "minLength": 1, "maxLength": 100},
                    "title": {"type": "string", "minLength": 1, "maxLength": 255},
                    "is_detailed_workplan": {"type": "boolean"},
                    "parent_id": {"type": "string", "nullable": True, "minLength": 1},
                    "is_title_only": {"type": "boolean", "nullable": True},
                    "keywords": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 2, "maxLength": 50},
                        "minItems": 3,
                        "maxItems": 20,
                    },
                    "topics": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 3, "maxLength": 100},
                        "minItems": 2,
                        "maxItems": 10,
                    },
                    "generation_instructions": {"type": "string", "minLength": 50, "maxLength": 2000},
                    "depends_on": {"type": "array", "items": {"type": "string", "minLength": 1}},
                    "max_words": {"type": "integer", "minimum": 1, "maximum": 10000},
                    "search_queries": {
                        "type": "array",
                        "items": {"type": "string", "minLength": 5, "maxLength": 200},
                        "minItems": 3,
                        "maxItems": 10,
                    },
                    "order": {"type": "integer", "minimum": 1},
                },
            },
        },
    },
}


class TemplateSectionsResponse(TypedDict):
    """Response from the tool for generating grant template sections."""

    sections: list[GrantLongFormSection]
    """List of generated grant template sections."""
    error: NotRequired[str | None]
    """Error message if any."""


def validate_template_sections(
    response: TemplateSectionsResponse, *, input_sections: list[ExtractedSectionDTO]
) -> None:
    """Validate the generated grant template sections.

    Args:
        response: The generated template sections
        input_sections: The pre-structured input sections

    Raises:
        ValidationError: If the response is invalid
        InsufficientContextError: If the response is missing sections
    """
    if not response["sections"]:
        if error := response.get("error"):
            raise InsufficientContextError(error)
        raise ValidationError("No sections generated")

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
            },
        )

    # Check order values
    all_orders = [section["order"] for section in response["sections"]]
    if len(set(all_orders)) != len(all_orders):
        duplicate_orders = [order for order in all_orders if all_orders.count(order) > 1]
        raise ValidationError("Duplicate order values found", context={"duplicate_orders": duplicate_orders})

    if min(all_orders) != 1 or max(all_orders) != len(all_orders):
        raise ValidationError(
            "Order values must start at 1 and be consecutive",
            context={"min_order": min(all_orders), "max_order": max(all_orders), "expected_max": len(all_orders)},
        )

    # Check parent relationships
    for section in response["sections"]:
        input_section = next(s for s in input_sections if s["id"] == section["id"])
        if input_section["parent_id"] != section["parent_id"]:
            raise ValidationError("Parent relationship modified")
        # Skip validation of is_title_only and is_detailed_workplan since they are not part of GrantSection

    # Check dependencies
    dependency_graph = defaultdict[str, list[str]](list)
    for section in response["sections"]:
        if not section["depends_on"]:
            continue

        invalid_deps = set(section["depends_on"]) - output_section_ids
        if invalid_deps:
            raise ValidationError(f"Invalid dependencies found: {invalid_deps}")

        dependency_graph[section["id"]].extend(section["depends_on"])

    # Check for circular dependencies
    for section_id in dependency_graph:
        if detect_cycle(graph=dependency_graph, start=section_id):
            raise ValidationError("Circular dependencies detected", context={"starting_node": section_id})


async def generate_grant_template(
    task_description: str, *, input_sections: list[ExtractedSectionDTO]
) -> TemplateSectionsResponse:
    """Generate a grant template from a given task description.

    Args:
        task_description: The task description.
        input_sections: The extracted sections.

    Returns:
        The extracted sections.
    """
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
        name="Content Generation Guidance",
        evaluation_instructions="""
            Assess quality and coherence of content guidance:
            1. Section-specific keywords ground the scope
            2. Topics match section purpose
            3. Generation instructions are clear and actionable
            4. Instructions capture full content requirements
            5. Content relationships properly reflected
            """,
    ),
    EvaluationCriterion(
        name="Word Count Distribution",
        evaluation_instructions="""
            Assess word count allocation:
            1. Total length matches requirements
            2. Section limits are proportional
            3. Research plan allocation preserved
            4. Space for figures considered
            5. Limits support content needs
            """,
    ),
    EvaluationCriterion(
        name="Dependencies and Flow",
        evaluation_instructions="""
            Evaluate section relationships:
            1. Dependencies reflect content flow
            2. Generation order is logical
            3. Parent-child structure preserved
            4. Section order matches hierarchy
            """,
    ),
    EvaluationCriterion(
        name="Search Query Effectiveness",
        evaluation_instructions="""
            Evaluate search queries:
            1. Target section-specific content
            2. Use precise terminology
            3. Cover full content scope
            4. Support RAG retrieval
            """,
    ),
]


async def handle_generate_grant_template(
    *, cfp_content: str, organization: FundingOrganization | None, core_narrative_sections: list[ExtractedSectionDTO]
) -> list[GrantLongFormSection]:
    """Generate a complete grant template including format and section configurations.

    Args:
        cfp_content: The content of the grant CFP.
        organization: The funding organization.
        core_narrative_sections: The core narrative sections extracted from the CFP.

    Returns:
        Complete grant template configuration including format and sections
    """
    prompt = GENERATE_GRANT_TEMPLATE_USER_PROMPT.substitute(
        cfp_content=cfp_content,
        core_narrative_sections=core_narrative_sections,
    )
    result: TemplateSectionsResponse = await with_prompt_evaluation(
        prompt_identifier="grant_template_generation",
        prompt_handler=partial(generate_grant_template, input_sections=core_narrative_sections),
        prompt=prompt.to_string(
            organization_guidelines=(
                await retrieve_documents(organization_id=str(organization.id), task_description=prompt)
                if organization
                else []
            )
        ),
        increment=5,
        retries=5,
        criteria=evaluation_criteria,
    )

    sorted_sections = cast(list[GrantLongFormSection], sorted(result["sections"], key=lambda x: x["order"]))
    for i, section in enumerate(sorted_sections):
        section["order"] = i + 1

    return sorted_sections
