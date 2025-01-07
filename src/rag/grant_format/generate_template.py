from string import Template
from typing import Final, TypedDict

from src.db.enums import GrantSectionEnum
from src.rag.grant_format.shared_prompts import GRANT_FORMAT_SYSTEM_PROMPT
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import handle_create_search_queries
from src.rag.utils import handle_completions_request
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

GENERATE_GRANT_FORMAT_TEMPLATE_USER_PROMPT: Final[Template] = Template("""
## Task

Our system organizes grant applications into standardized sections:

<grant_section_types>
${grant_section_types}
</grant_section_types>

Your task is to analyze the RAG results below and determine the correct format for grant applications.

## Sources
Use the following retrieval results as the source for generation:
    <rag_results>
    ${rag_results}
    </rag_results>
""")

GENERATE_GRANT_FORMAT_TEMPLATE_OUTPUT_INSTRUCTIONS = """
You must respond by invoking the provided function.

Your response should be a JSON object with two keys - "name" and "template".
The "name" value is the name for the grant format. It should be descriptive and informative.
The "template" is a markdown template string representing the structure of the grant application.
These should be the standard sections of a grant application, with variable names derived from the section name surrounded by double curly brackets.
Use markdown headings to separate sections.

Example output:

```json
{
    "name": "Full Grant Format",
    "template": "## Research Significance\n\n{{SIGNIFICANCE}}\n\n## Research Innovation\n\n{{INNOVATION}}\n\n## Specific Aims\n\n{{SPECIFIC_AIMS}}\n\n## Research Plan\n\n{{WORK_PLAN}}\n{{EXPECTED_OUTCOMES}}"
}
```

Not all formats require or use all the available section types. But all formats use at least some of them.
"""

GENERATE_GRANT_FORMAT_TASK_DESCRIPTION: Final[str] = """
The next task in the RAG pipeline is to determine the correct format for grant applications.
Our system organizes grant applications into standardized sections types.
The task is to determine the correct composition of sections given the application guidelines.
"""


class ToolResponse(TypedDict):
    """The response from the tool call."""

    name: str
    """The name of the grant format."""
    template: str
    """The markdown template for the grant."""


response_schema = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
        },
        "template": {
            "type": "string",
        },
    },
    "required": ["name", "template"],
}


async def generate_format_template(organization_id: str) -> ToolResponse:
    """Generate the sections of the grant format.

    Args:
        organization_id: The organization ID to generate the grant format for.

    Returns:
        The markdown template of the format
    """
    queries_result = await handle_create_search_queries(
        task_description=GENERATE_GRANT_FORMAT_TASK_DESCRIPTION,
        grant_section_types=list(GrantSectionEnum),
    )

    search_results = await retrieve_documents(
        organization_id=organization_id,
        search_queries=queries_result.queries,
    )

    result = await handle_completions_request(
        prompt_identifier="grant_format_structure",
        system_prompt=GRANT_FORMAT_SYSTEM_PROMPT,
        user_prompt=GENERATE_GRANT_FORMAT_TEMPLATE_USER_PROMPT.substitute(
            grant_section_types=serialize([e.value for e in GrantSectionEnum]),
            rag_results=serialize(search_results),
        ),
        response_type=ToolResponse,
        response_schema=response_schema,
        output_instructions=GENERATE_GRANT_FORMAT_TEMPLATE_OUTPUT_INSTRUCTIONS,
    )
    logger.info("Generated grant format template", response=result.response)
    return result.response
