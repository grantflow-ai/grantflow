from typing import TYPE_CHECKING, Final, cast

from jsonschema import validate
from jsonschema.exceptions import ValidationError

from src.constants import TEMPLATE_VARIABLE_PATTERN
from src.db.enums import ContentTopicEnum, GrantSectionEnum
from src.dto import GrantTemplateDTO
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.validators import validate_markdown_template

if TYPE_CHECKING:
    from src.rag.dto import DocumentDTO


logger = get_logger(__name__)

GENERATE_GRANT_TEMPLATE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate("""
You are an expert grant application specialist tasked with creating a structured grant template based on a call for applications.
Your goal is to analyze the provided information and generate a JSON object that defines the grant template structure, sections, and research topics.

First, let's review the key information provided:

Here is the content of the call for applications:
    <cfp_content>
    ${cfp_content}
    </cfp_content>

These are the available section types:
    <grant_section_types>
    ${grant_section_types}
    </grant_section_types>

These are the available research topic types:
    <research_topic_types>
    ${research_topic_types}
    </research_topic_types>

These are RAG results from the official funding guidelines for the organization:
    <rag_results>
    ${rag_results}
    </rag_results>

Now, please follow these steps to create the grant template:

1. Analyze the call for applications content, available section types, and available research topic types.

2. Map the call for applications content to the appropriate grant template structure:
   - Use markdown headers for section organization
   - Translate the requirements of the CFP content into sections from the available types - and only from the available types
   - Enclose section variables in double curly brackets
   - Maintain consistent heading hierarchy
   - Include at least two sections

3. Define the required sections and their configurations:
   - Each section must define its content requirements through topics
   - Set appropriate word limits that reflect typical grant expectations
   - Create 3-10 specific, relevant search queries for each section to enable effective content retrieval
   - Use topics only from the available research topic types

4. Specify the weighted research topics for each section:
   - Primary topics (weight 0.7-1.0): Core focus of the section, essential elements
   - Supporting topics (weight 0.4-0.6): Important complementary elements, required but not dominant
   - Minor topics (weight 0.1-0.3): Contextual or supplementary content, helpful but not critical
   - Ensure a minimum of 2 topics per section
   - Topics should be unique within each section

5. Generate a JSON object with the following structure:
   - "name": Descriptive name for the grant format
   - "template": Markdown template defining the document structure
   - "sections": Array of section configurations with topics and requirements

Before generating the final JSON output, wrap your planning process inside <grant_template_planning> tags. This should include:

a. Summarize key points from the call for applications
b. List potential sections based on the content and available section types
c. Outline research topics for each section, considering their relevance and importance
d. Plan the template structure with a hierarchical outline
e. Consider word limits and search queries for each section

After your planning, provide the final JSON output. Ensure that your output meets these validation requirements:

- Template:
  - Valid markdown format
  - Logical section flow
  - Clear hierarchical structure
  - Uses available section types only

- Sections:
  - 3-10 specific, relevant search_queries per section
  - Valid word limits (max_words ≥ min_words if both provided)
  - Minimum 2 topics per section
  - Topics are unique per section
  - Topic weights are float values between 0 and 1
  - Appropriate topic types for each section's purpose
  - Uses available research topic types only

Here's an example of the expected JSON structure:

```jsonc
{
    "name": "Comprehensive Research Grant Format",
    "template": "# Executive Summary\n\n{{EXECUTIVE_SUMMARY}}\n\n## Research Significance\n\n{{RESEARCH_SIGNIFICANCE}}\n\n## Research Innovation\n\n{{RESEARCH_INNOVATION}}",
    "sections": [
        {
            "type": "EXECUTIVE_SUMMARY", // must be one of the available section types
            "search_queries": ["..."], // 3-10 distinct RAG retrieval queries
            "min_words": 200, // can be omitted if no minimum
            "max_words": 500,  // can be omitted if no maximum
            "topics": [
                {
                    "type": "BACKGROUND_CONTEXT", // must be one of the available research topic types
                    "weight": 0.9
                },
                {
                    "type": "RATIONALE", // must be one of the available research topic types
                    "weight": 0.7,
                    "search_queries": ["research justification", "unmet need"]
                }
            ]
        }
    ]
}
```
""")

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


async def generate_grant_template(*, cfp_content: str, organization_id: str | None) -> GrantTemplateDTO:
    """Generate a complete grant template including format and section configurations.

    Args:
        cfp_content: The extracted content of a grant CFP.
        organization_id: The funding organization to use for the grant template.

    Returns:
        Complete grant template configuration including format and sections
    """
    user_prompt = GENERATE_GRANT_TEMPLATE_USER_PROMPT.substitute_partial(
        grant_section_types=[e.value for e in GrantSectionEnum],
        research_topic_types=[e.value for e in ContentTopicEnum],
        cfp_content=cfp_content,
    )
    rag_results: list[DocumentDTO] = (
        await retrieve_documents(organization_id=organization_id, user_prompt=user_prompt) if organization_id else []
    )
    result = await handle_completions_request(
        prompt_identifier="generate_grant_template",
        messages=user_prompt.substitute(rag_results=rag_results),
        response_type=GrantTemplateDTO,
        response_schema=response_schema,
        validator=validator,
    )
    logger.debug("Generated grant template", result=result)
    return result
