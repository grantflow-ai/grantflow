from typing import Final, TypedDict

from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompttemplate import PromptTemplate

logger = get_logger(__name__)


EXTRACT_CFP_DATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate("""
You are an AI assistant specialized in analyzing Call for Proposals (CFPs) for grant applications. Your task is to extract specific requirements from a given CFP and present them in a structured format. 

Here is the CFP content you need to analyze:

<cfp_content>
${cfp_content}
</cfp_content>

Now, here is a mapping of funding organizations and their IDs:

<organization_mapping>
${organization_mapping}
</organization_mapping>

Your objective is to carefully read through the CFP and extract verbatim quotes that fall into the following categories:

1. Required Sections
2. Format Requirements
3. Content Specifications
4. Special Requirements

For each category, follow these specific instructions:

1. Required Sections:
   - Extract names and hierarchy of required narrative sections
   - Identify section-specific content requirements
   - Note any required subsections or components

2. Format Requirements:
   - Identify page or word limits
   - List required headings
   - Note specific formatting rules
   - Capture organization requirements

3. Content Specifications:
   - List required topics to address
   - Identify required analysis or data
   - Note required planning elements
   - Capture required methodological components

4. Special Requirements:
   - Identify mandatory statements
   - List required analyses
   - Note required documentation
   - Capture required approaches

Important Guidelines:
- Extract complete, verbatim quotes about narrative requirements
- Maintain the order as presented in the document
- Include all formatting and content specifications
- Preserve exact numerical requirements

Do NOT include information about:
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

Before providing your final output, wrap your analysis in <cfp_breakdown> tags. In this section:

1. List out all the main sections you've identified in the CFP document.
2. For each main category (Required Sections, Format Requirements, Content Specifications, Special Requirements), write down key phrases or words to look for.
3. Go through the document section by section, noting relevant quotes for each category.

This will help ensure a thorough interpretation of the CFP.

After your analysis, compile your findings into a JSON object with the following structure:

```json
{
    "organization_id": "UUID string from mapping or null",
    "content": [
        "Verbatim quote 1",
        "Verbatim quote 2",
        ...
    ],
    "entities": [
        "Unique entity 1",
        "Unique entity 2",
        ...
    ]
}
```

The "content" array must contain complete, verbatim quotes that specify what must be included in the grant narrative and research plan, how it must be formatted, and any specific content requirements. The "entities" array should list unique entities extracted from the content.

Please proceed with your analysis and JSON output.""")


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
        messages=EXTRACT_CFP_DATA_USER_PROMPT.substitute(
            cfp_content=cfp_content, organization_mapping=organization_mapping
        ),
        response_type=ToolResponse,
        response_schema=response_schema,
    )
    logger.debug("Extracted CFP data", result=result)

    return result
