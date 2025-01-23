from typing import Final, TypedDict

from src.rag.completion import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


EXTRACT_CFP_DATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_cfp_data",
    template="""
Extract grant requirements from CFP content.

Source data:
<cfp_content>
${cfp_content}
</cfp_content>

Organization mapping:
<organization_mapping>
${organization_mapping}
</organization_mapping>

<planning>
1. Document Structure
   - Identify main sections and headers
   - Map hierarchical relationships
   - Note key requirement markers

2. Requirements Extraction
   - Required narrative sections and subsections
   - Format specifications and limits
   - Content requirements and topics
   - Special requirements and statements

3. Entity Recognition
   - Organizations and departments
   - Research areas and fields
   - Technical terminology
   - Required methodologies
</planning>

Requirements by Category:
1. Required Sections
   - Narrative section names and hierarchy
   - Section-specific requirements
   - Required components

2. Format Requirements
   - Page/word limits
   - Required headers
   - Formatting rules
   - Organization rules

3. Content Specifications
   - Required topics
   - Required analyses
   - Planning elements
   - Methods requirements

4. Special Requirements
   - Mandatory statements
   - Required analyses
   - Required documentation
   - Required approaches

Exclusions:
- Submission process
- URLs/contact information
- Budget details
- Registration/eligibility
- Review process
- Post-award details
- Background/goals

Output format:
{
    "organization_id": "UUID from mapping or null",
    "content": ["verbatim quote 1", "verbatim quote 2"],
    "entities": ["unique entity 1", "unique entity 2"]
}

Guidelines:
- Extract exact quotes
- Preserve original order
- Include all specifications
- Keep numerical requirements exact
""",
)


class ToolResponse(TypedDict):
    """The response from the tool call."""

    organization_id: str | None
    """Organization identifier."""
    content: list[str]
    """Array of extracted content strings."""
    entities: list[str]
    """List of entities."""


response_schema = {
    "type": "object",
    "properties": {
        "organization_id": {
            "type": "string",
            "nullable": True,
        },
        "entities": {
            "type": "array",
            "items": {"type": "string"},
        },
        "content": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["organization_id", "entities", "content"],
}


async def extract_cfp_data(*, cfp_content: str, organization_mapping: dict[str, dict[str, str]]) -> ToolResponse:
    """Extract the data from a CFP text."""
    result = await handle_completions_request(
        prompt_identifier="extract_cfp_data",
        messages=EXTRACT_CFP_DATA_USER_PROMPT.to_string(
            cfp_content=cfp_content, organization_mapping=organization_mapping
        ),
        response_type=ToolResponse,
        response_schema=response_schema,
    )
    logger.debug("Extracted CFP data", result=result)

    return result
