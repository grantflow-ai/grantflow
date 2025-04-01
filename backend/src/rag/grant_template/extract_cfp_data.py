from typing import Any, Final, NotRequired, TypedDict

from src.exceptions import InsufficientContextError, ValidationError
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


class ExtractedCFPDataBase(TypedDict):
    """Represents extracted CFP data for organization and subject."""

    organization_id: str | None
    """Organization identifier."""
    error: NotRequired[str | None]
    """Error message if applicable."""
    cfp_subject: str
    """CFP subject."""


class ExtractedCFPData(ExtractedCFPDataBase):
    """Adds content to parent class"""

    content: list[str]
    """Array of extracted content strings."""


CFP_WORD_COUNT_THRESHOLD: Final[int] = 500

EXTRACT_CFP_DATA_SYSTEM_PROMPT: Final[str] = """
You are a specialized system designed to analyze and extract information from STEM funding opportunity announcements (CFPs).
Your primary goal is to maintain the structural integrity of the CFP while extracting all relevant requirements and guidelines.
Focus on preserving the hierarchical organization and explicit requirements of the document.
"""

EXTRACT_CFP_DATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_cfp_data",
    template="""
    # CFP Data Extraction

    Your task is to analyze and extract the most relevant application guidelines and requirements from the following funding opportunity announcement while maintaining its structural integrity:

    ## Sources

    ### CFP Content

    <cfp_content>
    ${cfp_content}
    </cfp_content>

    ### Organization Mapping
    The following JSON object maps organization IDs (in our database) to their names and abbreviations:

    <organization_mapping>
    ${organization_mapping}
    </organization_mapping>

    ## Extraction Steps:

    1. **Determine Organization**
       - Identify which organization, if any, from the provided **organization mapping** the CFP announcement belongs to.
       - If an explicit mention is found, return the corresponding organization ID.
       - If no match is found, return `null` for `organization_id`.

    2. **Formatting Requirements**
       - Extract all explicit formatting requirements including:
         - Font specifications (type, size)
         - Margin requirements
         - Line spacing rules
         - Page limits and exclusions
       - Present these as separate, clear statements

    3. **Structural Analysis**
       - Identify and preserve the hierarchical structure of the CFP
       - For each section:
         - Include the full section title with page limits (if specified)
         - Add "- Title only" for main sections
         - Include subsection titles without "- Title only"
         - Subsection: Do not include description of the section, only the title summarized to highlight the main topic of the section
       - Maintain the exact numbering scheme (e.g., "1a.i", "1b.ii")
       - Preserve the original section order

    4. **Requirements Extraction**
       - Extract all explicit requirements including:
         - Character limits (e.g., for abstracts)
         - Language requirements
         - Content restrictions
         - Supporting documentation needs
       - Present these as clear, concise statements

    5. **CFP Subject Identification**
       - Generate a comprehensive summary that captures:
         - The type of funding opportunity
         - The target audience/researchers
         - The key objectives and expected outcomes
         - The scope and scale of the project
         - Any specific focus areas or themes
       - Ensure the summary is rich in domain-specific details
    6. **Administrative Details Filtering**
       - Retain only **application-related** details that impact **submission format**.
       - **Exclude** general grant submission instructions (e.g., Grants.gov steps, eRA Commons login).
       - URLS and external references.
       - Forms, addresses, beuracratic details etc.

    ## Output Format:
    ```jsonc
    {
        "organization_id": "UUID from mapping", // null if not found
        "content": [
            "Formatting requirement 1",
            "Formatting requirement 2",
            "Section title with page limit - Title only",
            "Subsection title",
            "Explicit requirement",
            "Supporting documentation requirement"
        ],
        "cfp_subject": {"type": "string"}, // can be empty if error
        "error": null // or error message if extraction fails
    }
    ```

    ## Guidelines:
    - Preserve the exact hierarchical structure of the CFP
    - Include all explicit requirements and constraints
    - Maintain section relationships and dependencies
    - Present each requirement as a separate, clear statement
    - Use "- Title only" for main sections but not subsections
    - Ensure the extracted content is machine-processable while maintaining readability
    - Remove only truly administrative details (URL, reference)
    - Rephrase and/or summarize as required while preserving the core meaning and any explicit requirements
    """,
)

EXTRACT_CFP_DATA_SHORT_CONTENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_cfp_data_short_content",
    template="""
    # CFP Data Short Content Extraction

    Your task is to identify the organization the CFP belongs to from the following funding opportunity announcement:

    ## Sources

    ### Organization Mapping
    The following JSON object maps organization IDs (in our database) to their names and abbreviations:

    <organization_mapping>
    ${organization_mapping}
    </organization_mapping>

    ## Extraction Steps:

    1. **Determine Organization**
       - Identify which organization, if any, from the provided **organization mapping** the CFP announcement belongs to.
       - If an explicit mention is found, return the corresponding organization ID.
       - If no match is found, return `null` for `organization_id`.
    2. **CFP Subject Identification**
       - Generate a comprehensive summary that captures:
         - The type of funding opportunity
         - The target audience/researchers
         - The key objectives and expected outcomes
         - The scope and scale of the project
         - Any specific focus areas or themes
       - Ensure the summary is rich in domain-specific details

    ## Output Format:
    ```jsonc
    {
        "organization_id": "UUID from mapping", // null if not found
        "cfp_subject": {"type": "string"}, // can be empty if error
        "error": null // or error message if extraction fails
    }
    ```

    ## Guidelines:
    - Preserve the exact hierarchical structure of the CFP
    - Ensure the extracted content is machine-processable while maintaining readability
    - Remove only truly administrative details (URL, reference)
    - Rephrase and/or summarize as required while preserving the core meaning and any explicit requirements
    """,
)

cfp_extraction_schema = {
    "type": "object",
    "properties": {
        "organization_id": {"type": "string", "nullable": True},
        "content": {"type": "array", "items": {"type": "string"}},
        "cfp_subject": {"type": "string"},
        "error": {"type": "string", "nullable": True},
    },
    "required": ["organization_id", "cfp_subject", "content"],
}

cfp_extraction_schema_short_content = {
    "type": "object",
    "properties": {
        "organization_id": {"type": "string", "nullable": True},
        "cfp_subject": {"type": "string"},
        "error": {"type": "string", "nullable": True},
    },
    "required": ["organization_id", "cfp_subject"],
}


def validate_cfp_extraction(response: ExtractedCFPData) -> None:
    """Validate the extracted CFP data."""
    if not response["content"]:
        if error := response.get("error"):
            raise InsufficientContextError(
                error,
                context={
                    "cfp_subject": response.get("cfp_subject", ""),
                    "organization_id": response.get("organization_id", None),
                    "recovery_instruction": "The CFP content appears to be insufficient or unclear. Try extracting more specific guidelines or requirements.",
                },
            )
        raise ValidationError(
            "No content extracted. Please provide an error message.",
            context={
                "cfp_subject": response.get("cfp_subject", ""),
                "organization_id": response.get("organization_id", None),
                "recovery_instruction": "Extract at least 3-5 relevant guidelines or requirements from the CFP content, or provide a specific error message.",
            },
        )


async def extract_cfp_data(task_description: str, **_: Any) -> ExtractedCFPData:
    """Extract the data from a CFP text.

    Args:
        task_description: The task description.
        **_: Additional keyword arguments (unused)

    Returns:
        The extracted CFP data.
    """
    return await handle_completions_request(
        prompt_identifier="extract_cfp_data",
        response_type=ExtractedCFPData,
        response_schema=cfp_extraction_schema,
        validator=validate_cfp_extraction,
        messages=task_description,
        system_prompt=EXTRACT_CFP_DATA_SYSTEM_PROMPT,
        temperature=0.7,
        top_p=0.95,
    )


async def extract_cfp_data_short_content(task_description: str, **_: Any) -> ExtractedCFPDataBase:
    """Extract the data from a short CFP text -- ignores section extraction.

    Args:
        task_description: The task description.
        **_: Additional keyword arguments (unused)

    Returns:
        The extracted CFP data.
    """
    return await handle_completions_request(
        prompt_identifier="extract_cfp_data_short_content",
        response_type=ExtractedCFPDataBase,
        response_schema=cfp_extraction_schema_short_content,
        messages=task_description,
        system_prompt=EXTRACT_CFP_DATA_SYSTEM_PROMPT,
        temperature=0.7,
        top_p=0.95,
    )


async def handle_extract_cfp_data(
    *, cfp_content: str, organization_mapping: dict[str, dict[str, str]]
) -> ExtractedCFPData:
    """Extract the data from a CFP text.

    Args:
        cfp_content: The CFP content.
        organization_mapping: The organization mapping.

    Returns:
        The extracted CFP data.
    """
    short_cfp_no_content_extraction = len(cfp_content.split()) < CFP_WORD_COUNT_THRESHOLD

    if short_cfp_no_content_extraction:
        prompt_identifier = "extract_cfp_data_short_content"
        prompt_handler = extract_cfp_data_short_content
        prompt = EXTRACT_CFP_DATA_SHORT_CONTENT_USER_PROMPT.to_string(organization_mapping=organization_mapping)
        evaluation_criteria = [
            EvaluationCriterion(
                name="Correctness",
                evaluation_instructions="""
                Assess whether the organization id is extracted correctly.
                """,
            ),
        ]
    else:
        prompt_identifier = "extract_cfp_data"
        prompt_handler = extract_cfp_data
        prompt = EXTRACT_CFP_DATA_USER_PROMPT.to_string(
            cfp_content=cfp_content, organization_mapping=organization_mapping
        )
        evaluation_criteria = [
            EvaluationCriterion(
                name="Correctness",
                evaluation_instructions="""
                Assess whether extracted content correctly reflects the explicit grant requirements, avoiding extraneous administrative details.
                """,
            ),
            EvaluationCriterion(
                name="Structural Completeness",
                evaluation_instructions="""
                Ensure extracted content includes necessary structural details such as required sections, page limits, and evaluation criteria.
                """,
            ),
            EvaluationCriterion(
                name="Filtering Accuracy",
                evaluation_instructions="""
                Validate that unnecessary general instructions (e.g., Grants.gov, eRA Commons, URLs) are removed while keeping essential information.
                """,
            ),
        ]
    result = await with_prompt_evaluation(
        prompt_identifier=prompt_identifier,
        prompt_handler=prompt_handler,
        prompt=prompt,
        increment=5,
        retries=5,
        passing_score=90,
        criteria=evaluation_criteria,
    )
    if short_cfp_no_content_extraction:
        return ExtractedCFPData(**result, content=[cfp_content])

    return result  # type: ignore[return-value]
