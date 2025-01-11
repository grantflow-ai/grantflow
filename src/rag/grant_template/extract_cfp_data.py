from typing import Final, TypedDict

from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.template import Template

logger = get_logger(__name__)


EXTRACT_CFP_DATA_USER_PROMPT: Final[Template] = Template("""
Extract requirements for grant application narrative and research plan sections.

First, here are the valid funding organizations and their IDs:

<organization_mapping>
${organization_mapping}
</organization_mapping>

Here is the CFP to analyze:

<cfp_content>
${cfp_content}
</cfp_content>

Extract verbatim text for:

1. REQUIRED SECTIONS
   - Names and hierarchy of required narrative sections
   - Section-specific content requirements
   - Required subsections or components

2. FORMAT REQUIREMENTS
   - Page or word limits
   - Required headings
   - Specific formatting rules
   - Organization requirements

3. CONTENT SPECIFICATIONS
   - Required topics to address
   - Required analysis or data
   - Required planning elements
   - Required methodological components

4. SPECIAL REQUIREMENTS
   - Mandatory statements
   - Required analyses
   - Required documentation
   - Required approaches

Extraction Rules:
    - Extract complete, verbatim quotes about narrative requirements
    - Maintain document order
    - Include all formatting and content specifications
    - Keep exact numerical requirements

Do not include:
    - Submission process
    - URLs and hyperlinks
    - Contact information
    - Budget information
    - Registration requirements
    - Eligibility criteria
    - Review process details
    - Post-award requirements
    - Background information
    - Program goals/context
""")


EXTRACT_CFP_DATA_OUTPUT_INSTRUCTIONS: Final[str] = """
Respond with a JSON object following this structure:

```jsonc
{
    "organization_id": string | null,  // UUID from mapping or null
    "content": string[]                // Array of narrative/research plan requirements in document order
}
```

The content array must contain complete, verbatim quotes that specify what must be included in the grant narrative and research plan, how it must be formatted, and any specific content requirements.
"""


class ToolResponse(TypedDict):
    """The response from the tool call."""

    organization_id: str | None
    """Organization identifier."""
    content: list[str]
    """Array of extracted content strings."""


response_schema = {
    "type": "object",
    "properties": {
        "organization_id": {
            "type": "string",
            "nullable": True,
        },
        "content": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["organization_id", "content"],
}


async def extract_cfp_data(*, cfp_content: str, organization_mapping: dict[str, dict[str, str]]) -> ToolResponse:
    """Extract the data from a CFP text."""
    result = await handle_completions_request(
        prompt_identifier="extract_cfp_data",
        user_prompt=EXTRACT_CFP_DATA_USER_PROMPT.substitute(
            cfp_content=cfp_content, organization_mapping=organization_mapping
        ),
        response_type=ToolResponse,
        response_schema=response_schema,
        output_instructions=EXTRACT_CFP_DATA_OUTPUT_INSTRUCTIONS,
    )
    logger.debug("Extracted CFP data", result=result)

    return result
