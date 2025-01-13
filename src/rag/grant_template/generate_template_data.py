from typing import TYPE_CHECKING, Final, cast

from jsonschema import validate
from jsonschema.exceptions import ValidationError

from src.constants import TEMPLATE_VARIABLE_PATTERN
from src.db.enums import ContentTopicEnum, GrantSectionEnum
from src.dto import GrantTemplateDTO
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.template import Template
from src.utils.validators import validate_markdown_template

if TYPE_CHECKING:
    from src.rag.dto import DocumentDTO


logger = get_logger(__name__)

GUIDELINES_FRAGMENT: Final[Template] = Template("""
These are retrieval results from the official funding guidelines for the ${organization_name}:

    <rag_results>
    ${rag_results}
    </rag_results>

Use these to refine and enhance the generated data.
""")

GENERATE_GRANT_TEMPLATE_USER_PROMPT: Final[Template] = Template("""

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

These are the available section types:

    <grant_section_types>
    ${grant_section_types}
    </grant_section_types>

These are the available topics:

    <research_topic_types>
    ${research_topic_types}
    </research_topic_types>

${guidelines}
""")

GENERATE_GRANT_TEMPLATE_OUTPUT_INSTRUCTIONS: Final[str] = """
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
            "search_queries": ["..."], // 3-10 distinct RAG retrieval queries
            "min_words": 200, // can be omitted if no minimum
            "max_words: 500,  // can be omitted if no maximum
            "topics": [
                {
                    "type": "BACKGROUND_CONTEXT",
                    "weight": 0.9
                },
                {
                    "type": "RATIONALE",
                    "weight": 0.7,
                    "search_queries": ["research justification", "unmet need"]
                }
            ]
        }
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
   - Search Queries should enable effective content retrieval (see below)

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

4. Search Queries:
    - Will be executed to retrieve documents from a vector store for the section
    - The queries should balance specificity with breadth to capture a range of relevant materials.
    - Identity and extract distinct

### Validation Requirements
Template:
    - Valid markdown format
    - Logical section flow
    - Clear hierarchical structure

Sections:
    - 3-10 specific, relevant search_queries per section
    - Valid word limits (max_words ≥ min_words if both provided)
    - Minimum 2 topics per section
    - Topics should be unique per section
    - Topic weights are float values between 0 and 1
    - Appropriate topic types for each section's purpose
"""

GENERATE_GRANT_TEMPLATE_TASK_DESCRIPTION: Final[str] = """
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
                    "search_queries": {"type": "array", "minItems": 3, "maxItems": 10, "items": {"type": "string"}},
                    "max_words": {"type": "number"},
                    "min_words": {"type": "number"},
                    "type": {"type": "string", "enum": [e.value for e in GrantSectionEnum]},
                },
                "required": ["topics", "search_queries", "type"],
            },
        },
    },
    "required": ["name", "template", "sections"],
}


def validator(tool_response: GrantTemplateDTO) -> bool:
    """Validate the tool response.

    Args:
        tool_response: The tool response to validate.

    Returns:
        True if the response is valid, False otherwise.
    """
    try:
        validate_markdown_template(tool_response["template"])
        validate(response_schema, tool_response)
    except (ValidationError, ValueError):
        return False

    return set(cast(list[GrantSectionEnum], TEMPLATE_VARIABLE_PATTERN.findall(tool_response["template"]))) == {
        section["type"] for section in tool_response["sections"]
    }


async def generate_grant_template(
    *, cfp_content: str, organization_id: str | None, organization_name: str | None
) -> GrantTemplateDTO:
    """Generate a complete grant template including format and section configurations.

    Args:
        cfp_content: The extracted content of a grant CFP.
        organization_id: The funding organization to use for the grant template.
        organization_name: The name of the organization to use for the grant template.

    Returns:
        Complete grant template configuration including format and sections
    """
    search_results: list[DocumentDTO] = (
        await retrieve_documents(
            organization_id=organization_id,
            task_description=GENERATE_GRANT_TEMPLATE_TASK_DESCRIPTION,
            grant_section_types=[e.value for e in GrantSectionEnum],
            research_topic_types=[e.value for e in ContentTopicEnum],
            cfp_content=cfp_content,
        )
        if organization_id
        else []
    )

    result = await handle_completions_request(
        prompt_identifier="generate_grant_template",
        user_prompt=GENERATE_GRANT_TEMPLATE_USER_PROMPT.substitute(
            grant_section_types=[e.value for e in GrantSectionEnum],
            research_topic_types=[e.value for e in ContentTopicEnum],
            cfp_content=cfp_content,
            guidelines=GUIDELINES_FRAGMENT.substitute(organization_name=organization_name, rag_results=search_results)
            if search_results and organization_name
            else "",
        ),
        response_type=GrantTemplateDTO,
        response_schema=response_schema,
        output_instructions=GENERATE_GRANT_TEMPLATE_OUTPUT_INSTRUCTIONS,
        validator=validator,
    )
    logger.debug("Generated grant template", result=result)
    return result
