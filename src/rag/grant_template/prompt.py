from string import Template
from typing import Final, NotRequired, TypedDict, cast

from jsonschema import validate
from jsonschema.exceptions import ValidationError

from src.constants import TEMPLATE_VARIABLE_PATTERN
from src.db.enums import ContentTopicEnum, GrantSectionEnum
from src.db.utils import validate_markdown_template
from src.rag.grant_template.shared_prompts import GRANT_FORMAT_SYSTEM_PROMPT
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import handle_create_search_queries
from src.rag.utils import handle_completions_request
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)


GENERATE_UNIFIED_GRANT_TEMPLATE_USER_PROMPT: Final[Template] = Template("""
## Context
Our system models the format and guidelines for generating grant application through several interconnected components:

1. Funding Organizations define the overall grant structure
2. Grant Templates provide the standardized format for applications
3. Grant Sections break down the template into logical components
4. Section Topics define the content focus and requirements of each section

Each level builds on the previous to create a comprehensive grant application structure.

## Section Types
Our system standardizes grant applications into these core sections:

<grant_section_types>
${grant_section_types}
</grant_section_types>

## Textual Topics
Each section incorporates specific topics that determine its textual content:

<research_topic_types>
${research_topic_types}
</research_topic_types>

These topics are weighted to indicate their relative importance within each section.

## Task
Analyze the provided sources to:
1. Create an appropriate grant template structure
2. Define the required sections and their configurations
3. Specify the weighted research topics for each section

## Sources
These are the contents of the call for applications:
    <cfp_content>
    ${cfp_content}
    </cfp_content>

And these are retrieval results as a JSON array:
    <rag_results>
    ${rag_results}
    </rag_results>
""")

GENERATE_UNIFIED_OUTPUT_INSTRUCTIONS = """
## Output Format
Respond with a JSON object containing:
- "name": Descriptive name for the grant format
- "template": Markdown template defining the document structure
- "sections": Array of section configurations with topics and requirements

Example structure:

```jsonc
{
    "name": "Comprehensive Research Grant Format",
    "template": "# Executive Summary\\n\\n{{EXECUTIVE_SUMMARY}}\\n\\n## Research Significance\\n\\n{{RESEARCH_SIGNIFICANCE}}\\n\\n## Research Innovation\\n\\n{{RESEARCH_INNOVATION}}",
    "sections": [
        {
            "type": "EXECUTIVE_SUMMARY",
            "search_terms": ["project overview", "key objectives", "expected impact"],
            "min_words": 200, // can be null if no minimum
            "max_words": null, // can be null if no limit
            "topics": [
                {
                    "type": "IMPACT",
                    "weight": 0.9
                },
                {
                    "type": "RATIONALE",
                    "weight": 0.7
                },
                {
                    "type": "NOVELTY_AND_INNOVATION",
                    "weight": 0.4
                }
                // further topics
            ]
        }
        // Additional sections...
    ]
}
```

### Template Guidelines
1. Structure:
   - Use markdown headers for section organization
   - Enclose section variables in double curly brackets
   - Maintain consistent heading hierarchy
   - Include at least two sections

2. Section Configuration:
   - Each section must define its content requirements through topics
   - Word limits should reflect typical grant expectations
   - Search Terms should enable effective content retrieval

3. Topic Weighting System:
   Primary topics (0.7-1.0):
   - Core focus of the section
   - Essential elements that must be addressed

   Supporting topics (0.4-0.6):
   - Important complementary elements
   - Required but not dominant content

   Minor topics (0.1-0.3):
   - Contextual or supplementary content
   - Helpful but not critical elements

### Validation Requirements
Template:
- Valid markdown format
- Logical section flow
- Clear hierarchical structure

Sections:
- 3-10 specific, relevant search_terms per section
- Valid word limits (max_words ≥ min_words if both provided)
- Minimum 2 topics per section
- Topics should be unique per section
- Topic weights are float values between 0 and 1
- Appropriate topic types for each section's purpose

Search Terms:
- Specific and retrievable terms
- Relevant to section content
- Effective for RAG queries
"""

GENERATE_UNIFIED_TASK_DESCRIPTION: Final[str] = """
## Context
Our system models the format and guidelines for generating grant application through several interconnected components:

1. Funding Organizations define the overall grant structure
2. Grant Templates provide the standardized format for applications
3. Grant Sections break down the template into logical components
4. Section Topics define the content focus and requirements of each section

## Task
Analyze the provided sources to:
1. Create an appropriate grant template structure
2. Define the required sections and their configurations
3. Specify the weighted research topics for each section
"""


class SectionTopicDTO(TypedDict):
    """An topic of a section."""

    type: ContentTopicEnum
    """The type of the topic."""
    weight: float
    """The weight of the topic."""


class SectionDTO(TypedDict):
    """A grant section."""

    topics: list[SectionTopicDTO]
    """The topics of the section."""
    search_terms: list[str]
    """Search Terms that describe this section."""
    max_words: NotRequired[int | None]
    """The maximum number of words in the section."""
    min_words: NotRequired[int | None]
    """The minimum number of words in the section."""
    type: GrantSectionEnum
    """The type of the section."""


class ToolResponse(TypedDict):
    """The response from the tool call."""

    name: str
    """The name of the grant format."""
    template: str
    """The markdown template for the grant."""
    sections: list[SectionDTO]
    """The sections of the grant."""


response_schema = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
        },
        "template": {
            "type": "string",
        },
        "sections": {
            "type": "array",
            "minItems": 2,
            "items": {
                "type": "object",
                "properties": {
                    "topics": {
                        "type": "array",
                        "minItems": 2,
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string", "enum": [e.value for e in ContentTopicEnum]},
                                "weight": {"type": "number", "minimum": 0, "maximum": 1},
                            },
                            "required": ["type", "weight"],
                        },
                    },
                    "search_terms": {"type": "array", "minItems": 3, "maxItems": 10, "items": {"type": "string"}},
                    "max_words": {"type": "number", "nullable": True},
                    "min_words": {"type": "number", "nullable": True},
                    "type": {"type": "string", "enum": [e.value for e in GrantSectionEnum]},
                },
                "required": ["topics", "search_terms", "type"],
            },
        },
    },
    "required": ["name", "template", "sections"],
}


def validator(tool_reponse: ToolResponse) -> bool:
    """Validate the tool response.

    Args:
        tool_reponse: The tool response to validate.

    Returns:
        True if the response is valid, False otherwise.
    """
    try:
        validate_markdown_template(tool_reponse["template"])
        validate(response_schema, tool_reponse)
    except (ValidationError, ValueError):
        return False

    return set(cast(list[GrantSectionEnum], TEMPLATE_VARIABLE_PATTERN.findall(tool_reponse["template"]))) == {
        section["type"] for section in tool_reponse["sections"]
    }


async def generate_grant_template(*, cfp_content: str, organization_id: str) -> ToolResponse:
    """Generate a complete grant template including format and section configurations.

    Args:
        cfp_content: The extracted content of a grant CFP.
        organization_id: The organization ID to generate the grant template for.

    Returns:
        Complete grant template configuration including format and sections
    """
    queries_result = await handle_create_search_queries(
        task_description=GENERATE_UNIFIED_TASK_DESCRIPTION,
        grant_section_types=serialize([e.value for e in GrantSectionEnum]),
        research_topic_types=serialize([e.value for e in ContentTopicEnum]),
        cfp_content=cfp_content,
    )

    search_results = await retrieve_documents(organization_id=organization_id, search_queries=queries_result.queries)

    result = await handle_completions_request(
        prompt_identifier="grant_template",
        system_prompt=GRANT_FORMAT_SYSTEM_PROMPT,
        user_prompt=GENERATE_UNIFIED_GRANT_TEMPLATE_USER_PROMPT.substitute(
            grant_section_types=serialize([e.value for e in GrantSectionEnum]),
            research_topic_types=serialize([e.value for e in ContentTopicEnum]),
            rag_results=serialize(search_results),
            cfp_content=cfp_content,
        ),
        response_type=ToolResponse,
        response_schema=response_schema,
        output_instructions=GENERATE_UNIFIED_OUTPUT_INSTRUCTIONS,
        validator=validator,
    )
    logger.info("Generated grant template", response=result.response)

    return result.response
