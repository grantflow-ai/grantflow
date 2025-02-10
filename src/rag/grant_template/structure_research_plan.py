from typing import Final, NotRequired, TypedDict

from src.db.tables import FundingOrganization
from src.exceptions import InsufficientContextError, ValidationError
from src.rag.completion import handle_completions_request
from src.rag.grant_template.extract_sections import ExtractedSectionDTO
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.prompt_template import PromptTemplate

STRUCTURE_RESEARCH_PLAN_SYSTEM_PROMPT: Final[str] = """
You are a specialized system designed to analyze and structure research plans in grant applications.
"""

STRUCTURE_RESEARCH_PLAN_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_plan_structuring",
    template="""
    # Research Plan Structure Analysis

    Your task is to refine a list of grant sections that have been previously extracted from the sources and identify the research-plan section.

    These are the sources from which the information has been extracted:

    ## Sources
    ### Call for Proposals
        <cfp_content>
        ${cfp_content}
        </cfp_content>

    ### Organization Guidelines
        <organization_guidelines>
        ${organization_guidelines}
        </organization_guidelines>

    And this is the list of sections:

    ### Sections
        <core_narrative_sections>
        ${core_narrative_sections}
        </core_narrative_sections>

    ## Instructions
    1. Identify from the provided sections which section is the research-plan section.
        -
        -
        -

    ## Examples

    <one_shot_examples>
    Example 1 - Split Required:
    Input sections:
    {
        "parts": ["Research Plan"],
        "sections": [
            {
                "title": "Research Plan",
                "id": "research_plan",
                "parent_id": null,
                "part": "Research Plan"
            }
        ]
    }

    Output - Split into standard components:
    {
        "sections": [
            {
                "id": "research_plan",
                "title": "Research Plan",
                "is_research_plan": true,
                "parent_id": null,
                "part": "Research Plan"
            },
            {
                "id": "specific_aims",
                "title": "Specific Aims",
                "is_research_plan": false,
                "parent_id": "research_plan",
                "part": "Research Plan"
            },
            {
                "id": "significance",
                "title": "Significance",
                "is_research_plan": false,
                "parent_id": "research_plan",
                "part": "Research Plan"
            },
            {
                "id": "innovation",
                "title": "Innovation",
                "is_research_plan": false,
                "parent_id": "research_plan",
                "part": "Research Plan"
            },
            {
                "id": "approach",
                "title": "Approach",
                "is_research_plan": false,
                "parent_id": "research_plan",
                "part": "Research Plan"
            }
        ],
        "error": null
    }

    Example 2 - Already Split:
    Input sections:
    {
        "parts": ["Research Strategy"],
        "sections": [
            {
                "title": "Research Strategy",
                "id": "research_strategy",
                "parent_id": null,
                "part": "Research Strategy"
            },
            {
                "title": "Specific Aims",
                "id": "specific_aims",
                "parent_id": "research_strategy",
                "part": "Research Strategy"
            },
            {
                "title": "Methods",
                "id": "methods",
                "parent_id": "research_strategy",
                "part": "Research Strategy"
            }
        ]
    }

    Output - Keep existing structure:
    {
        "sections": [
            {
                "id": "research_strategy",
                "title": "Research Strategy",
                "is_research_plan": true,
                "parent_id": null,
                "part": "Research Strategy"
            },
            {
                "id": "specific_aims",
                "title": "Specific Aims",
                "is_research_plan": false,
                "parent_id": "research_strategy",
                "part": "Research Strategy"
            },
            {
                "id": "methods",
                "title": "Methods",
                "is_research_plan": false,
                "parent_id": "research_strategy",
                "part": "Research Strategy"
            }
        ],
        "error": null
    }

    Example 3 - Error Case:
    Input sections with no clear research plan:
    {
        "parts": ["Project Overview"],
        "sections": [
            {
                "title": "Project Summary",
                "id": "project_summary",
                "parent_id": null,
                "part": "Project Overview"
            }
        ]
    }

    Output - Error due to missing research plan:
    {
        "sections": [],
        "error": "No research plan section identified in the input sections."
    }
    </one_shot_examples>

    ## Output Schema
    ```json
    {
        "sections": [{
            "id": "string",                   // Snake case identifier
            "title": "string",                // Display title
            "is_research_plan": boolean,      // True if this is a main research plan section
            "parent_id": "string | null",     // Parent section ID or null
            "part": "string | null",          // Original part name
        }],
        "error": "string | null"             // Error message if any
    }
    ```
    """,
)


structured_plan_schema: Final = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "title", "is_research_plan", "part"],
                "properties": {
                    "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                    },
                    "title": {"type": "string", "minLength": 1, "maxLength": 255},
                    "is_research_plan": {"type": "boolean"},
                    "parent_id": {"type": "string", "nullable": True, "minLength": 1, "maxLength": 100},
                    "part": {"type": "string", "nullable": True, "minLength": 1, "maxLength": 255},
                },
            },
            "minItems": 1,
        },
        "error": {"type": "string", "nullable": True},
    },
}


class RestructuredSection(TypedDict):
    """Represents a section in the structured research plan."""

    id: str
    """Unique identifier for the section."""
    title: str
    """Display title for the section."""
    is_research_plan: bool
    """Indicates if this is the main research plan section."""
    parent_id: NotRequired[str | None]
    """ID of parent section if any."""
    part: str | None
    """Name of the part this section belongs to."""


class RestructureSectionsResponse(TypedDict):
    """Response containing structured research plan sections."""

    sections: list[RestructuredSection]
    """List of structured sections."""
    error: NotRequired[str | None]
    """Error message if any."""


def validate_structure(response: RestructureSectionsResponse) -> None:
    """Validates the structured research plan response.

    Args:
        response: The response to validate.

    Raises:
        ValidationError: If structure is invalid.
        InsufficientContextError: If insufficient information provided.
    """
    if not response["sections"]:
        if error := response.get("error"):
            raise InsufficientContextError(error)
        raise ValidationError("No sections provided in structure")

    research_plans = [s for s in response["sections"] if s["is_research_plan"]]
    if len(research_plans) != 1:
        raise ValidationError(f"Expected exactly one research plan section, found {len(research_plans)}")

    section_ids = {s["id"] for s in response["sections"]}
    for section in response["sections"]:
        if (parent := section.get("parent_id")) and parent not in section_ids:
            raise ValidationError(f"Invalid parent ID {parent}")


async def restructure_sections(task_description: str) -> RestructureSectionsResponse:
    """Structures a research plan section into logical components.

    Args:
        task_description: The prompt task description.

    Returns:
        The structured research plan sections.
    """
    return await handle_completions_request(
        prompt_identifier="research_plan_structure",
        messages=task_description,
        response_schema=structured_plan_schema,
        response_type=RestructureSectionsResponse,
        validator=validate_structure,
        system_prompt=STRUCTURE_RESEARCH_PLAN_SYSTEM_PROMPT,
        temperature=0.2,
        top_p=0.7,
    )


async def handle_restructure_sections(
    *, cfp_content: str, organization: FundingOrganization | None, core_narrative_sections: list[ExtractedSectionDTO]
) -> list[RestructuredSection]:
    """Analyzes a research plan section and structures it into logical components.

    Args:
        cfp_content: The content of the grant CFP.
        organization: The funding organization if known.
        core_narrative_sections: The core narrative sections to structure.

    Returns:
        List of structured grant sections.
    """
    prompt = STRUCTURE_RESEARCH_PLAN_USER_PROMPT.substitute(
        cfp_content=cfp_content, core_narrative_sections=core_narrative_sections
    )

    organization_guidelines = (
        await retrieve_documents(
            organization_id=str(organization.id),
            task_description=STRUCTURE_RESEARCH_PLAN_USER_PROMPT,
        )
        if organization
        else ""
    )

    result = await with_prompt_evaluation(
        prompt_identifier="structure_research_plan",
        prompt_handler=restructure_sections,
        prompt=prompt.to_string(organization_guidelines=organization_guidelines),
        passing_score=90,
        increment=10,
        retries=5,
        criteria=[
            EvaluationCriterion(
                name="Research Plan Identification",
                evaluation_instructions="""
                Evaluate if:
                - Correctly identified the research plan section
                - Only one section marked as research plan
                - The selected section is appropriate as the research plan
                - It correctly includes only the detailed research objectives and specific planned steps
                """,
            ),
            EvaluationCriterion(
                name="Section Splitting",
                evaluation_instructions="""
                Evaluate if:
                - Appropriate decision made about splitting sections
                - Split sections follow information from the sources and/or conventional components (Specific Aims, Significance, etc.)
                - Split aligned with sources and/or conventions
                - Parent-child relationships are logical after split
                """,
            ),
            EvaluationCriterion(
                name="Structural Integrity",
                evaluation_instructions="""
                Evaluate if:
                - Parent-child relationships are logical
                - Original part assignments maintained
                - All sections properly connected in hierarchy
                - No orphaned or misplaced sections
                """,
            ),
        ],
    )

    return result["sections"]
