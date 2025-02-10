from typing import Final, Literal, NotRequired, TypedDict

from src.db.tables import FundingOrganization
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

EXTRACT_GRANT_APPLICATION_SECTIONS_QUERIES = [
    "technical abstract methodology results scientific premise evidence rationale",
    "project summary objectives goals research strategy experimental design",
    "technical background state of art literature integration findings review",
    "innovation approach novel methods preliminary results experimental data",
    "research timeline milestones tasks procedures protocols deliverables",
    "expected outcomes anticipated results impact advancement knowledge",
    "scientific methodology experimental design data analysis findings implementation",
]


EXTRACT_GRANT_APPLICATION_SECTIONS_SYSTEM_PROMPT: Final[str] = """"
You are a specialized system designed to analyze grant application requirements and generate structured specifications.
"""

EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_grant_application_sections",
    template="""
    # Grant Application Section Analyzer

    You are tasked with determining the correct format for a grant application given the provided sources.

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

    As a first stage, begin by determining which of the sources contains concrete information about the expected structure of the grant application document or text.
    It is not always the case this information is available. Flag all other input that is impertinent to this, as irrelevant and proceed.

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
      - Project Narrative
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
    1. Begin by determining which of the sources - if any of them - contains concrete information about the expected structure of the grant application document or text.
        - Flag all other input that is impertinent to this, as irrelevant and proceed.
        - It is not always the case this information is available, if it is not available, or only partially available, try to identify the organization offering the funding opportunity and extrapolate from this the expected grant structure.
    2. Begin by analyzing the source to determine the structure of a grant application targeting the CFP and in accordance with any guidelines.
        - Determine- is it composed of multiple distinct parts (think of this as top top-level headings)?
        - If so, list these parts in the "parts" field.
        - The values in parts should be part titles, e.g. "Project Summary", "Research Strategy", etc. derived from the input sources.
    3. Identify the grant applications sections.
        - If the information is too scarce, try to complement it with reasonable assumptions based on conventions for the organization - if known.
        - If this is not possible, return an empty list of sections, and write an explanation in the "error" key.
    4. If the parts list is non-empty, assign each section to a part based on the provided information.
        - Sections should have a null value for part if they are not part of a specific part.
    5. Assign a "type" to each section based on the provided categories.
        - For the `core_research_narrative` category, include in it only sections you have above 85% certainty belong to it.
        - If the you have low certainty about where a section belongs, assign it to the "Other" category.
    6. Respond with a JSON object containing the sections and their metadata.

    ## Output

    Respond with a JSON object adhering to the following format:

    ```json
    {
        "parts": [
            "string"                          // List of parts, e.g. "Project Summary", can be empty if no parts are identified
        ],
        "sections": [{                        // List of sections, empty if insufficient information
            "type": "string",                 // Section category (e.g., "core_research_narrative")
            "title": "string",                // Section title as appears in source
            "id": "string",                   // Unique snake_case identifier, e.g. 'abstract'
            "part": "string",                 // The part of the grant application this section belongs to, nullable, if specified, must correlate with a part in the "parts" list
            "parent_id": "string",            // ID of parent section, nullable
        }],
        "error": "string"                     // Error message if applicable, null if no error
    }
    ```
    """,
)

ORGANIZATION_GUIDELINES_FRAGMENT: Final[PromptTemplate] = PromptTemplate(
    name="organization_fragment",
    template="""
The grant application is for a funding opportunity offer by the ${organization_full_name} (${organization_abbreviation}):

These are retrieval results for the organization application writing guidelines from our database:

### Organization Guidelines
    <rag_results>
    ${rag_results}
    </rag_results>

If these are available (non empty JSON array), regard them as the primary source, and use the announcement content for additional context.
Otherwise, use the CFP as the source for guidelines as well.
""",
)

section_extraction_json_schema = {
    "type": "object",
    "required": ["sections", "parts"],
    "properties": {
        "parts": {"type": "array", "items": {"type": "string", "minLength": 1, "maxLength": 255}},
        "error": {"type": "string", "nullable": True},
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
        },
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

    parts: list[str]
    """List of parts, e.g. "Project Summary", can be empty if no parts are identified."""
    sections: list[ExtractedSectionDTO]
    """List of sections, empty if insufficient information."""
    error: NotRequired[str | None]
    """Error message if applicable, null if no error."""


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
        temperature=1.3,
        top_p=0.97,
        candidate_count=3,
    )


async def handle_extract_sections(
    cfp_content: str, cfp_subject: str, organization: FundingOrganization | None = None
) -> ExtractedSections:
    """Extract and classify sections from grant application materials.

    Args:
        cfp_content: Content of the call for proposals
        cfp_subject: Subject of the call for proposals
        organization: The funding organization

    Returns:
        Classified sections with their relationships and metadata
    """
    prompt = EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT.substitute(
        section_tags=SECTION_CATEGORIES,
        cfp_subject=cfp_subject,
        cfp_content=cfp_content,
    )

    organization_guidelines = (
        ORGANIZATION_GUIDELINES_FRAGMENT.to_string(
            rag_results=await retrieve_documents(
                organization_id=str(organization.id),
                task_description=EXTRACT_GRANT_APPLICATION_SECTIONS_USER_PROMPT,
                search_queries=EXTRACT_GRANT_APPLICATION_SECTIONS_QUERIES,
            ),
            organization_full_name=organization.full_name,
            organization_abbreviation=organization.abbreviation,
        )
        if organization
        else ""
    )
    criteria = [
        EvaluationCriterion(
            name="Correctness",
            evaluation_instructions="Evaluate the correctness of the result in relation to the sources.",
        ),
        EvaluationCriterion(
            name="Titles",
            evaluation_instructions="Evaluate if the sections have descriptive, conventional titles.",
        ),
        EvaluationCriterion(
            name="Classifications",
            evaluation_instructions="Evaluate if the sections have accurate classifications.",
        ),
        EvaluationCriterion(
            name="Part Specification",
            evaluation_instructions="Evaluate if the sections have the correct part specified, if applicable.",
        ),
        EvaluationCriterion(
            name="Parent-Child Relationships",
            evaluation_instructions="Evaluate if the sections have accurate parent-child relationships.",
            weight=0.75,
        ),
    ]

    if organization:
        criteria.append(
            EvaluationCriterion(
                name="Organization Guidelines Fit",
                evaluation_instructions="Evaluate if the result derives from the organization guidelines correctly.",
            )
        )

    return await with_prompt_evaluation(
        prompt_identifier="extract_sections",
        prompt_handler=extract_sections,
        prompt=prompt.to_string(organization_guidelines=organization_guidelines),
        criteria=criteria,
        passing_score=90,
        increment=10,
        retries=5,
    )
