from typing import Any, Final, NotRequired, TypedDict

from src.constants import REASONING_MODEL
from src.exceptions import InsufficientContextError, ValidationError
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


class Content(TypedDict):
    title: str
    subtitles: list[str]


class ExtractedCFPData(TypedDict):
    organization_id: str | None
    error: NotRequired[str | None]
    cfp_subject: str
    content: list[Content]


TEMPERATURE: Final[float] = 0.2

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
       - Present these as clear, concise, grouped statements

    5. **CFP Subject Identification**
       - Generate a comprehensive summary that captures:
         - The type of funding opportunity
         - The target audience/researchers
         - The key objectives and expected outcomes
         - The scope and scale of the project
         - Any specific focus areas or themes
       - Ensure the summary is rich in domain-specific details

    6. **Administrative Details Filtering**
       - Aggressively remove any content that does not directly impact submission format or requirements
       - Retain only **application-related** details that impact **submission format**.
       - **Exclude** general grant submission instructions (e.g., Grants.gov steps, eRA Commons login).
       - URLS and external references.
       - Forms, addresses, bureaucratic details etc.

    ## Output Format:
    ```jsonc
    {
        "organization_id": "UUID from mapping", // null if not found
        "content": [
            {"title": "Formatting requirement", "content": ["requirement 1", "requirement 2"]},
            {"title": "Section title", "content": ["Subsection 1", "Subsection 2"]},
            {"Explicit requirement": "Section title", "content": ["requirement 1", "requirement 2"]},
            {"Supporting documentation requirement": "Section title", "content": ["requirement 1", "requirement 2"]},
        ],
        "cfp_subject": "...", // can be empty if error
        "error": null // or error message if extraction fails
    }
    ```

    ## Guidelines - Do NOT skip any step:
    - Preserve the exact hierarchical structure of the CFP
    - Include, summarize, and **group** all explicit requirements and constraints while representing each requirement as a separate, clear statement
    - Maintain section relationships and dependencies
    - For each section title add "- Title only" if it is a main section
    - Keep section and subsection names unchanged
    - Section are not to be divided into multiple sections
    - **Important**: For each section extract subsections and present each in a single, clear statement
    - Ensure the extracted content is machine-processable while maintaining readability
    - **Important**: Remove only truly administrative details (URL, reference)
    - The core meaning MUST be maintained and no other information should be added or removed
    - Skip repeated escape sequences in your output (such as \n or \r)
    - If there is content in a language other than English, make sure to translate it to English before processing the input
    """,
)

cfp_extraction_schema = {
    "type": "object",
    "properties": {
        "organization_id": {"type": "string", "nullable": True},
        "cfp_subject": {"type": "string"},
        "content": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "nullable": False},
                    "subtitles": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                },
                "required": ["title", "subtitles"],
            },
        },
        "error": {"type": "string", "nullable": True},
    },
    "required": ["organization_id", "cfp_subject", "content"],
}


def validate_cfp_extraction(response: ExtractedCFPData) -> None:
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
    return await handle_completions_request(
        prompt_identifier="extract_cfp_data",
        response_type=ExtractedCFPData,
        response_schema=cfp_extraction_schema,
        validator=validate_cfp_extraction,
        messages=task_description,
        system_prompt=EXTRACT_CFP_DATA_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=REASONING_MODEL,
        top_p=0.95,
    )


async def handle_extract_cfp_data(
    *, cfp_content: str, organization_mapping: dict[str, dict[str, str]]
) -> ExtractedCFPData:
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
