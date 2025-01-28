from typing import Final, Literal, NotRequired, TypedDict

from src.exceptions import InsufficientContextError, ValidationError
from src.patterns import SNAKE_CASE_PATTERN
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.utils.prompt_template import PromptTemplate

SECTION_CATEGORY = Literal[
    "core_research_narrative",
    "career_and_training_development",
    "administrative_documentation",
    "compliance_and_policy",
    "external_validation",
    "document_structure",
    "research_resources",
    "institutional_authorization",
    "supplementary_technical_components",
    "other",
]
SECTION_CATEGORIES: Final[list[SECTION_CATEGORY]] = [
    "core_research_narrative",
    "career_and_training_development",
    "administrative_documentation",
    "compliance_and_policy",
    "external_validation",
    "document_structure",
    "research_resources",
    "institutional_authorization",
    "supplementary_technical_components",
    "other",
]


EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT: Final[str] = """"
You are a specialized system designed to analyze grant application requirements and generate structured specifications.
"""

EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_grant_application_sections",
    template="""
     # Grant Application Section Analyzer

    You are tasked with analyzing grant application requirements to identify and classify all sections.
    Pay particular attention to core research narrative components, as these will be the focus of further refinement.

    ## Sources

    ### Call for Proposals
    <cfp_content>
    ${cfp_content}
    </cfp_content>

    ### Organization Guidelines
    <organization_guidelines>
    ${organization_guidelines}
    </organization_guidelines>

    ## Section Tags
    Use the following section categories:

    <section_tags>
    ${section_tags}
    </section_tags>

    The section tags are broad categories that encompass the various components of a grant application. Your task is to identify and classify sections based on these tags:

    ### Core Research Narrative
    - **Scientific Content**
      - Technical Abstract
      - Project Summary
      - Research Strategy/Plan
      - Technical Background
      - Scientific Premise
      - Innovation & Approach
      - Preliminary Results
      - Expected Outcomes
      - Technical Timeline
      - Research Tasks
      - Integration with Existing Literature
    - **Technical Impact**
      - Scientific Impact
      - Technical Feasibility
      - Risk Mitigation
      - Technology Transfer
      - Research Products
      - Reproducibility Plan
      - Broader Impacts on STEM Fields
    - **Research Team**
      - Technical Expertise
      - Prior Contributions
      - Team Complementarity
      - Technical Management
      - Research Track Record
      - Diversity and Inclusion in Team Composition
      - Technical Resources Command

    ### Career & Training Development
    - **STEM Career Development**
      - Scientific Career Goals
      - Technical Skill Development
      - Research Independence Path
    - **Technical Training**
      - Methods Training
      - Laboratory Skills
      - Computational Training
      - Machine Learning & AI Skills
    - **Research Education**
      - Scientific Coursework
      - Technical Certifications
      - Specialized Training
      - Workshops on Ethical Research Practices

    ### Administrative Documentation
    - **Application Processing**
      - Contact Information
      - Cover Sheets
      - Submission Forms
    - **Institutional Information**
      - Department Details
      - Laboratory/Center Data
      - Current/Pending Support
    - **Project Management**
      - Research Timeline
      - Milestone Tracking
      - Quality Control
      - Funding Justification Statements
      - Previous Grant Performance

    ### Compliance & Policy
    - **Research Protection**
      - Human Subjects/IRB
      - Laboratory Safety
      - Biosafety Protocol
      - Radiation Safety
    - **Research Policies**
      - Data Management
      - Code Sharing
      - Materials Sharing
      - Research Integrity
      - Open Science Compliance Plan
    - **Technical Standards**
      - Safety Protocols
      - Quality Assurance
      - Standard Operating Procedures
      - Environmental Impact Assessment

    ### External Validation
    - **Technical Support**
      - Collaboration Agreements
      - Equipment Access
      - Facility Use Agreements
      - Letters from Industry Partners
    - **Research Credentials**
      - Scientific CVs
      - Publication Records
      - Patent Records
    - **Technical Review**
      - Expert Reviews
      - Advisory Input
      - Technical Feedback
      - Independent Validation of Preliminary Results

    ### Document Structure
    - **Navigation Elements**
      - Table of Contents
      - Figure Index
      - Table Index
    - **Research References**
      - Scientific Bibliography
      - Technical Citations
      - Method References
      - Dataset Provenance Documentation
    - **Technical Supplements**
      - Technical Appendices
      - Data Supplements
      - Method Details
      - Algorithms & Code Repositories

    ### Research Resources
    - **Technical Infrastructure**
      - Equipment List
      - Laboratory Space
      - Computing Resources
      - Technical Facilities
      - High-Performance Computing Resources
    - **Research Budget**
      - Equipment Costs
      - Material Expenses
      - Technical Staff
      - Computing Costs
      - Breakdown of Subcontracted Work Costs
    - **Personnel & Training**
      - Research Staff
      - Technical Training
      - Conference Travel

    ### Institutional Authorization
    - **Research Certifications**
      - Safety Certifications
      - Technical Approvals
      - Protocol Clearances
    - **Laboratory Approvals**
      - Facility Access
      - Equipment Usage
      - Space Allocation
    - **Other Authorizations**
      - Data Use Agreements
      - Ethical Use of AI Authorization

    ### Supplementary Technical Components
    - **Technical History**
      - Previous Findings
      - Pilot Data
      - Method Development
    - **Technical Documentation**
      - Equipment Specs
      - Software Documentation
      - Protocol Details
      - Computational Pipelines and Workflows
    - **Additional Materials**
      - Raw Data
      - Analysis Scripts
      - Technical Notes
      - Interactive Visualizations or Datasets

    ### Other
    - **Interdisciplinary Collaboration**
      - Partnerships with Non-STEM Fields
    - **Societal Relevance**
      - Broader Societal Impacts of Research

    ## Instructions

    1. Identify the grant applications sections mentioned in the input sources.
        - If the information is too scarce, try to complement it with reasonable assumptions based on conventions for the organization - if known.
        - If this is not possible, return an empty list of sections, and write an explanation in the "error" key.
    2. Assign a "type" to each section based on the provided categories.
        - For the `core_research_narrative` category, include in it only sections you have above 85% certainty belong to it.
        - If the you have low certainty about where a section belongs, assign it to the "Other" category.
    3. Respond with a JSON object containing the sections and their metadata.

    ## Output

    Respond with a JSON object adhering to the following format:

    ```json
    {
        "sections": [{                        // List of sections, empty if insufficient information
            "type": "string",                 // Section category (e.g., "core_research_narrative")
            "title": "string",                // Section title as appears in source
            "id": "string",                   // Unique snake_case identifier, e.g. 'abstract'
            "part": "string",                 // The title of the part, e.g. "Project Summary", nullable
            "parent_id": "string",            // ID of parent section, nullable
        }],
        "error": "string"                     // Error message if applicable, null if no error
    }
    ```
    """,
)

section_extraction_json_schema = {
    "type": "object",
    "required": ["sections"],
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["type", "title", "id", "parent_id"],
                "properties": {
                    "type": {"type": "string", "enum": SECTION_CATEGORIES},
                    "title": {"type": "string", "minLength": 1, "maxLength": 255},
                    "id": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                    },
                    "parent_id": {"type": "string", "nullable": True},
                    "part": {"type": "string", "nullable": True, "minLength": 1, "maxLength": 255},
                },
            },
        }
    },
}


class ExtractedSectionDTO(TypedDict):
    """Represents a single section in the grant application."""

    type: SECTION_CATEGORY
    """The category of the section."""
    title: str
    """The title of the section."""
    id: str
    """The unique identifier of the section."""
    parent_id: NotRequired[str | None]
    """The parent section ID if this section is a sub-section."""
    part: str | None
    """The part of the grant application this section belongs to."""


class ExtractedSections(TypedDict):
    """Container for all extracted sections."""

    sections: list[ExtractedSectionDTO]
    error: NotRequired[str | None]


def validate_section_extraction(response: ExtractedSections) -> None:
    """Validate the extracted sections structure.

    Args:
        response: The extracted sections to validate.

    Raises:
        ValidationError: If the response is invalid.
        InsufficientContextError: If no sections were extracted.
    """
    if not response["sections"]:
        if error := response.get("error"):
            raise InsufficientContextError(error)
        raise ValidationError("No sections extracted. Please provide an error message.", context=response)

    for section in response["sections"]:
        if not SNAKE_CASE_PATTERN.match(section["id"]):
            raise ValidationError(
                "Invalid section ID format", context={"section_id": section["id"], "expected_format": "snake_case"}
            )
        if section["parent_id"] == section["id"]:
            raise ValidationError(
                "Circular dependency detected. A section cannot be its own parent.",
                context={"section_id": section["id"]},
            )

    section_ids = [section["id"] for section in response["sections"]]
    if len(section_ids) != len(set(section_ids)):
        raise ValidationError(
            "Duplicate section IDs found. Section IDs must be unique.", context={"section_ids": section_ids}
        )

    valid_ids = set(section_ids)
    for section in response["sections"]:
        if section["parent_id"] and section["parent_id"] not in valid_ids:
            raise ValidationError(
                f"Invalid parent section reference. The section {section['id']} defines a parent section {section['parent_id']} that does not exist in the sections list.",
            )


async def extract_sections(task_description: str) -> ExtractedSections:
    """Extract and classify sections from grant application materials.

    Args:
        task_description: Description of the task to be performed

    Returns:
        Classified sections with their relationships and metadata
    """
    return await handle_completions_request(
        prompt_identifier="section_extraction",
        messages=task_description,
        system_prompt=EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT,
        response_schema=section_extraction_json_schema,
        response_type=ExtractedSections,
        validator=validate_section_extraction,
    )


async def handle_extract_sections(cfp_content: str, organization_id: str | None = None) -> ExtractedSections:
    """Extract and classify sections from grant application materials.

    Args:
        cfp_content: Content of the call for proposals
        organization_id: Optional organization ID for retrieving additional guidelines

    Returns:
        Classified sections with their relationships and metadata
    """
    prompt = EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT.to_string(
        section_tags=SECTION_CATEGORIES,
        cfp_content=cfp_content,
        organization_guidelines=(
            await retrieve_documents(
                organization_id=organization_id,
                task_description=EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT.to_string(),
            )
            if organization_id
            else []
        ),
    )

    return await with_prompt_evaluation(
        prompt_handler=extract_sections,
        prompt=prompt,
        increment=10,
        retries=5,
        passing_score=90,
        criteria=[
            EvaluationCriterion(
                name="Core Research Narrative Sections Completeness - Identification",
                evaluation_instructions="Evaluate if all core research sections are identified and assigned reasonably.",
            ),
            EvaluationCriterion(
                name="Core Research Narrative Sections Completeness - Titles",
                evaluation_instructions="Evaluate if all core research sections have descriptive titles.",
            ),
            EvaluationCriterion(
                name="Core Research Narrative Sections Completeness - Classifications",
                evaluation_instructions="Evaluate if all core research sections have accurate classifications.",
            ),
            EvaluationCriterion(
                name="Core Research Narrative Sections Completeness - Part Specification",
                evaluation_instructions="Evaluate if all core research sections have the correct part specified, if applicable.",
            ),
            EvaluationCriterion(
                name="Core Research Narrative Sections Completeness - Parent-Child Relationships",
                evaluation_instructions="Evaluate if all core research sections have accurate parent-child relationships.",
            ),
        ],
    )
