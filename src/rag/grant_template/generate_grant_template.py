from collections import defaultdict
from functools import partial
from typing import Final, NotRequired, TypedDict, cast

from src.db.json_objects import GrantSection
from src.exceptions import InsufficientContextError, ValidationError
from src.rag.completion import handle_completions_request
from src.rag.grant_template.extract_sections import ExtractedSectionDTO
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
       - Identify total application length limits from sources, or complement with sensible defaults based on the organization (if known) or similar documents.
       - Convert all measurements to word counts:
         * Page count: 415 words/page (TNR 11pt), adjust for font type, font size and line spacing
         * Characters: divide by 7
       - Reduce by 12.5% to account for figures
       - Research plan: Estimate roughly 60% of remaining words unless a different ratio is explicitly specified
       - Distribute remaining words across sections based on guidelines or content importance

    2. Writing Guidance Integration:
       - Assign keywords to ground content and define LLM scope
       - Assign topics that capture the required content areas
       - Write specific, actionable generation instructions for the LLM
       Example:
       ```
       {
           "keywords": ["methodology", "experimental_design", "controls", "statistical_analysis"],
           "topics": ["research_methodology", "experimental_approach", "data_analysis"],
           "generation_instructions": "Write a detailed methodology section that:
               1. Opens with an overview of the experimental approach
               2. Describes each experimental protocol step-by-step
               3. Details control experiments and their rationale
               4. Explains statistical methods for data analysis
               5. Addresses potential technical challenges"
       }
       ```

    3. Search Query Generation:
       - Create 3-10 focused search queries for RAG
       - Target specific content areas
       - Use section-specific terminology

    4. Research Plan:
       - Set one section to `is_research_plan: true`:
            - This section is the core research plan, which is usually between 50-66% of the total word count (unless otherwise specified)
            - Identify this section, or if multiple are present, choose the most likely candidate
            - If no section can be identified as the research plan, return an error and an empty list of sections

    5. Dependencies
       - Consider that sections are grouped based on their dependencies and then generated. The generated text is injected as input to any dependent sections.
       - Assign the dependencies based on the topics and content flow:
              * If a section depends on another, ensure the dependent section is generated first and the dependency is listed in the `depends_on` field.
              * If a section is independent, leave the `depends_on` field empty.
       - A section can depend on multiple sections, but all dependencies must be generated before the dependent section.

    6. Ordering
        - Consider that the "order" value determines the order in which the sections appear on the page, and thus the relationships between titles and content.
        - Consider that order should make sense together with parent_id, which also determined the structure of the document.
        - Assign a unique positive value - starting from 1 (appearance at top of document) and incrementing by 1 for each subsequent section.

    ## Output Schema

    ```json
    {
        "sections": [{                        // List of sections, if error, return empty list
            "id": "string",                   // Must match input section ID exactly
            "title": "string",                // Display title
            "is_research_plan": boolean,      // True for research plan only
            "parent_id": "string",            // Parent or null
            "part": "string",                 // Must match input part exactly
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
                    "is_research_plan",
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
                    "is_research_plan": {"type": "boolean"},
                    "parent_id": {"type": "string", "minLength": 1},
                    "part": {"type": "string", "nullable": True},
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

    sections: list[GrantSection]
    """List of generated grant template sections."""
    error: NotRequired[str | None]
    """Error message if any."""


def detect_cycle(graph: dict[str, list[str]], start: str, visited: set[str], path: set[str]) -> bool:
    """Detect cycles in a directed graph using DFS.

    Args:
        graph: Adjacency list representation of graph
        start: Current node being visited
        visited: Set of all visited nodes
        path: Set of nodes in current DFS path

    Returns:
        bool: True if cycle detected, False otherwise
    """
    visited.add(start)
    path.add(start)

    for neighbor in graph.get(start, []):
        if neighbor in path or (neighbor not in visited and detect_cycle(graph, neighbor, visited, path)):
            return True

    path.remove(start)
    return False


def validate_template_sections(
    response: TemplateSectionsResponse, *, input_sections: list[ExtractedSectionDTO]
) -> None:
    """Validate the generated grant template sections.

    Args:
        response: The generated template sections
        input_sections: The original input sections that should be preserved

    Raises:
        ValidationError: If the response is invalid
        InsufficientContextError: If the response is missing sections
    """
    if not response["sections"]:
        if error := response.get("error"):
            raise InsufficientContextError(error)
        raise ValidationError("No sections generated. Please provide an error message.", context=response)

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

    for section in response["sections"]:
        input_section = next(s for s in input_sections if s["id"] == section["id"])
        if input_section["part"] != section["part"]:
            raise ValidationError(
                "Part assignment mismatch",
                context={
                    "section_id": section["id"],
                    "expected_part": input_section["part"],
                    "found_part": section["part"],
                },
            )

    research_plan_sections = [s for s in response["sections"] if s["is_research_plan"]]
    if len(research_plan_sections) != 1:
        raise ValidationError(
            f"Must have exactly one research plan section. Found {len(research_plan_sections)}. Fix the issue by assigning a single section as 'is_research_plan'=true",
            context={"research_plan_sections": research_plan_sections},
        )

    all_orders = [section["order"] for section in response["sections"]]
    if len(set(all_orders)) != len(all_orders):
        raise ValidationError("Duplicate order values found")

    dependency_graph = defaultdict[str, list[str]](list)
    for section in response["sections"]:
        dependency_graph[section["id"]].extend(section["depends_on"])

    for section_id in dependency_graph:
        if detect_cycle(dependency_graph, section_id, set(), set()):
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
    )


async def handle_generate_grant_template(
    *, cfp_content: str, organization_id: str | None, core_narrative_sections: list[ExtractedSectionDTO]
) -> list[GrantSection]:
    """Generate a complete grant template including format and section configurations.

    Args:
        cfp_content: The extracted content of a grant CFP.
        organization_id: The funding organization to use for the grant template.
        core_narrative_sections: The extracted sections from the CFP content.

    Returns:
        Complete grant template configuration including format and sections
    """
    prompt = GENERATE_GRANT_TEMPLATE_USER_PROMPT.substitute(
        cfp_content=cfp_content,
        core_narrative_sections=core_narrative_sections,
    )
    result: TemplateSectionsResponse = await with_prompt_evaluation(
        prompt_handler=partial(generate_grant_template, input_sections=core_narrative_sections),
        prompt=prompt.to_string(
            organization_guidelines=(
                await retrieve_documents(organization_id=organization_id, task_description=prompt)
                if organization_id
                else []
            )
        ),
        passing_score=90,
        increment=5,
        retries=5,
        criteria=[
            EvaluationCriterion(
                name="Content Generation Guidance",
                evaluation_instructions="""
            Assess quality and coherence of content guidance:
            1. All sections have generation instructions
            2. Generation instructions are specific and actionable
            3. The keywords ground the scope effectively
            4. The topics comprehensively cover required content
            5. Instructions, keywords, and topics form coherent guidance
            """,
            ),
            EvaluationCriterion(
                name="Structural Organization",
                evaluation_instructions="""
            Evaluate the organizational structure:
            1. Sections properly arranged
            2. Dependencies correctly identified
            3. Research plan properly positioned
            4. Sequential ordering appropriate
            """,
            ),
            EvaluationCriterion(
                name="Word Count Distribution",
                evaluation_instructions="""
            Assess word count allocation:
            1. Research plan within 50-66% range unless specified otherwise in context
            2. Section limits appropriate to content
            3. Total within application maximum
            4. Figure space properly reserved
            5. Distribution logical across sections
            """,
            ),
            EvaluationCriterion(
                name="Search Query Quality",
                evaluation_instructions="""
            Evaluate search queries for each section:
            1. Queries target specific content areas
            2. Use appropriate technical terminology
            3. Align with section keywords and topics
            4. Cover full scope of section content
            5. Are effective RAG queries
            """,
            ),
        ],
    )

    sorted_sections = cast(list[GrantSection], sorted(result["sections"], key=lambda x: x["order"]))
    for i, section in enumerate(sorted_sections):
        section["order"] = i + 1

    return sorted_sections
