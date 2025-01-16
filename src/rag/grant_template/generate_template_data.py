from typing import TYPE_CHECKING, Final, cast

from jsonschema import validate
from jsonschema.exceptions import ValidationError

from src.db.enums import ContentTopicEnum, GrantSectionEnum
from src.dto import GrantTemplateDTO
from src.patterns import TEMPLATE_VARIABLE_PATTERN
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.validators import validate_markdown_template

if TYPE_CHECKING:
    from src.rag.dto import DocumentDTO


logger = get_logger(__name__)

GENERATE_GRANT_TEMPLATE_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="grant_template_generation",
    template="""
Generate structured grant template from CFP data.

Input data:
<cfp_content>
${cfp_content}
</cfp_content>

Available sections:
<grant_section_types>
${grant_section_types}
</grant_section_types>

Available topics:
<research_topic_types>
${research_topic_types}
</research_topic_types>

RAG context:
<rag_results>
${rag_results}
</rag_results>

<planning>
1. CFP Analysis
   - Extract section requirements
   - Map to available section types
   - Identify content requirements
   - Note formatting rules

2. Template Structure
   - Define section hierarchy
   - Set section ordering
   - Map variable placeholders
   - Validate section coverage

3. Section Requirements
   - Map content topics
   - Set word limits
   - Define search queries
   - Validate completeness

4. Topic Weighting
   - Primary (0.7-1.0): Core focus
   - Supporting (0.4-0.6): Required elements
   - Minor (0.1-0.3): Context elements
   - Validate coverage
</planning>

Output Requirements:

Template:
- Valid markdown format
- Logical section flow
- Clear hierarchy
- Use available types

Sections:
- 3-10 search queries per section
- Valid word limits
- Min 2 topics per section
- Unique section topics
- Valid topic weights (0-1)
- Use available types

Output format:
{
    "name": "template name",
    "template": "markdown with {{SECTION}} vars",
    "sections": [{
        "type": "SECTION_TYPE",
        "search_queries": ["query1", "query2"],
        "min_words": 200,
        "max_words": 500,
        "topics": [{
            "type": "TOPIC_TYPE",
            "weight": 0.9
        }]
    }]
}
""",
)
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
    user_prompt = GENERATE_GRANT_TEMPLATE_USER_PROMPT.substitute(
        grant_section_types=[e.value for e in GrantSectionEnum],
        research_topic_types=[e.value for e in ContentTopicEnum],
        cfp_content=cfp_content,
    )
    rag_results: list[DocumentDTO] = (
        await retrieve_documents(organization_id=organization_id, user_prompt=user_prompt) if organization_id else []
    )
    result = await handle_completions_request(
        prompt_identifier="generate_grant_template",
        messages=user_prompt.to_string(rag_results=rag_results),
        response_type=GrantTemplateDTO,
        response_schema=response_schema,
        validator=validator,
    )
    logger.debug("Generated grant template", result=result)
    return result
