from typing import Final, NotRequired, TypedDict

from src.exceptions import InsufficientContextError, ValidationError
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


class ExtractedCFPData(TypedDict):
    """Represents extracted CFP data."""

    organization_id: str | None
    """Organization identifier."""
    content: list[str]
    """Array of extracted content strings."""
    cfp_subject: str
    """CFP subject."""
    error: NotRequired[str | None]
    """Error message if applicable."""


EXTRACT_CFP_DATA_SYSTEM_PROMPT: Final[str] = """
You are a specialized system designed to analyze and extract information from STEM funding opportunity announcements (CFPs).
"""

EXTRACT_CFP_DATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_cfp_data",
    template="""
    # CFP Data Extraction

    Your task is the analyze and extract the most relevant application guidelines and requirements from the following funding opportunity announcement:

    ## Sources

    ### CFP Content

    <cfp_content>
    ${cfp_content}
    </cfp_content>

    ### Organization Mapping
    The following JSON object is maps organization IDs (in our database) to their names and abbreviations:

    <organization_mapping>
    ${organization_mapping}
    </organization_mapping>

    ## Extraction Steps:

    1. **Determine Organization**
       - Identify which organization, if any, from the provided **organization mapping** the CFP announcement belongs to.
       - If an explicit mention is found, return the corresponding organization ID.
       - If no match is found, return `null` for `organization_id`.

    2. **Core Requirements Extraction**
       - Identify **explicit grant requirements**, including:
         - Required sections (if stated)
         - Page limits and formatting rules
         - Eligibility criteria
         - Evaluation criteria
         - Required submission components (e.g., budget, research plan)

    3. **Administrative Details Filtering**
       - Retain only **application-related** details that impact **submission format**.
       - **Exclude** general grant submission instructions (e.g., Grants.gov steps, eRA Commons login).
       - URLS and external references.
       - Forms, addresses, beuracratic details etc.

    4. **CFP Subject Identification**
       - Generate a **concise summary** of the CFP's subject matter.
       - Ensure the summary is **rich in domain-specific entities** (e.g., funding areas, research disciplines, technical methodologies, application domains).
       - The summary should capture the **types of projects and researchers the CFP is targeting**.

    ## Output Format:
    ```jsonc
    {
        "organization_id": "UUID from mapping", // null if the organization is not found in the mapping or can't be identified
        "content": ["extracted text", "extracted text"], // can be empty if error
        "cfp_subject": {"type": "string"}, // can be empty if error
        "error": null, // or error message if the information is too scarce or ambiguous
    }
    ```

    ## Guidelines:
    - Extract only explicit instructions related to submission requirements.
    - You can rephrase and summarize as required, but ensure the core meaning and any explicit requirements are preserved.
    - Ensure the extracted content is free from unrelated details such as general program descriptions, funding allocations, or review criteria.
    - Deduplicate the extracted content and reduce unnecessary repetition, you can rephrase, summarize and combine similar points.
    - Remove all links (URLs) from the extracted content and any extracted content that is primarily a reference to another source (e.g. "see x for guidelines")
    - Remove any unnecessary language from the output - assume the output is meant for machine processing.
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


def validate_cfp_extraction(response: ExtractedCFPData) -> None:
    """Validate the extracted CFP data."""
    if not response["content"]:
        if error := response.get("error"):
            raise InsufficientContextError(error)
        raise ValidationError("No content extracted. Please provide an error message.")


async def extract_cfp_data(task_description: str) -> ExtractedCFPData:
    """Extract the data from a CFP text.

    Args:
        task_description: The task description.

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
        temperature=1.3,
        top_p=0.97,
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
    return await with_prompt_evaluation(
        prompt_identifier="extract_cfp_data",
        prompt_handler=extract_cfp_data,
        prompt=EXTRACT_CFP_DATA_USER_PROMPT.to_string(
            cfp_content=cfp_content, organization_mapping=organization_mapping
        ),
        increment=5,
        retries=5,
        passing_score=90,
        criteria=[
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
        ],
    )
