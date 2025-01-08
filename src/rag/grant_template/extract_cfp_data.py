from string import Template
from typing import Final, TypedDict
from uuid import UUID

from src.rag.utils import handle_completions_request
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)


EXTRACT_CFP_DATA_USER_PROMPT: Final[Template] = Template("""
You are an expert system designed to analyze scientific grant Calls for Proposals (CFPs) and transform them into structured data.

First, here are the valid funding organizations and their IDs:

<organization_mapping>
${organization_mapping}
</organization_mapping>

Below is the CFP text to analyze:

<cfp_text>
${cfp_contents}
</cfp_text>

Follow these steps precisely:

1. ORGANIZATION IDENTIFICATION
   - Carefully scan the text for the funding organization's name
   - Check against the provided mapping using exact string matching
   - If found, use the corresponding ID
   - If no exact match is found, set as null
   - Document your reasoning in the analysis

2. CONTENT EXTRACTION
   Focus on extracting these specific components:
   a) Application Structure Requirements
      - Section organization
      - Required components
      - Page/word limits
      - Formatting guidelines

   b) Content Guidelines
      - Required topics to address
      - Evaluation criteria
      - Scope requirements
      - Technical specifications

   c) Writing Instructions
      - Style requirements
      - Language guidelines
      - Special formatting requirements
      - Citation requirements

   Extraction Rules:
   - Maintain original wording
   - Use [...] for omissions
   - Keep essential context
   - Preserve hierarchical relationships
   - Include all relevant subsections

Document your analysis process:

<analysis>
1. Organization Identification
   - Found mentions: [list specific organization names found]
   - Mapping matches: [list exact matches with provided IDs]
   - Selected ID: [final ID or null with reasoning]

2. Content Extraction
   a) Structure Analysis
      [List identified structural requirements]

   b) Content Analysis
      [List identified content guidelines]

   c) Writing Guidelines
      [List identified writing instructions]

3. Validation
   - Completeness check
   - Context preservation check
   - Hierarchy preservation check
</analysis>

Important:
- Maintain exact quotes where possible
- Preserve hierarchical relationships
- Include all relevant subsections
- Keep contextual links between related items
- Use [...] for omissions, not general summaries
- Remove any URLs, references to individuals, contact information etc.
""")

EXTRACT_CFP_DATA_OUTPUT_INSTRUCTIONS: Final[str] = """
Provide your output in this exact JSON format:

{
    "organization_id": string | null,  // UUID string if matched, null if no match
    "content": string                  // Structured content following extraction rules
}

Requirements:
1. organization_id must be:
   - A valid UUID string from the mapping if matched
   - null if no exact organization match found

2. content must:
   - Preserve original text where possible
   - Use [...] for necessary omissions
   - Maintain hierarchical structure
   - Include all relevant guidelines
   - Keep contextual relationships
"""


class ToolResponse(TypedDict):
    """The response from the tool call."""

    organization_id: str | None
    """The name of the grant format."""
    content: str
    """The markdown template for the grant."""


response_schema = {
    "type": "object",
    "properties": {
        "organization_id": {
            "type": "string",
            "nullable": True,
        },
        "content": {
            "type": "string",
        },
    },
    "required": ["organization_id", "content"],
}


async def extract_cfp_data(*, cfp_content: str, organization_mapping: dict[UUID | str, str]) -> ToolResponse:
    """Extract the data from a CFP text."""
    result = await handle_completions_request(
        prompt_identifier="extract_cfp_data",
        user_prompt=EXTRACT_CFP_DATA_USER_PROMPT.substitute(
            cfp_content=cfp_content, organization_mapping=serialize(organization_mapping)
        ),
        response_type=ToolResponse,
        response_schema=response_schema,
        output_instructions=EXTRACT_CFP_DATA_OUTPUT_INSTRUCTIONS,
    )
    logger.debug("Extracted CFP data", result=result)

    return result
