from typing import TYPE_CHECKING, Final

from jsonschema.validators import validate

from src.dto import GrantTemplateDTO
from src.exceptions import ValidationError
from src.patterns import TEMPLATE_VARIABLE_PATTERN
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.validators import validate_grant_template

if TYPE_CHECKING:
    from src.rag.dto import DocumentDTO


logger = get_logger(__name__)


GRANT_TEMPLATE_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="grant_template_generation",
    template="""
Generate grant application template from CFP requirements.

Source data:
<cfp_content>
${cfp_content}
</cfp_content>

Organization guidelines:
<rag_results>
${rag_results}
</rag_results>

<planning>
1. Document Analysis
   - Map section hierarchy and relationships
   - Extract explicit requirements and constraints
   - Identify sequential dependencies
   - Extract domain-specific terminology

2. Content Requirements
   - Break down composite sections that:
     * Contain multiple distinct topics
     * Have separate technical requirements
     * Require different inputs
   - Identify atomic units of content
   - Map linear dependencies between sections
   - Balance granularity vs coherence

3. Keyword Selection
   Keywords must be:
   - Specific to section scope
   - Non-redundant across categories
   - Technical rather than generic
   - Derived from CFP terminology

4. Template Format
  - Ensure consistent markdown formatting
  - Always include both the `.title` and `.content` variables for sections
  - Include fixed section headers from CFP where required
  - Only use {{variables}} for sections that need content generation
  - Maintain proper markdown heading hierarchy (# for top level, ## for subsections)
</planning>

Output Format:
{
    "name": "Grant application name",
    "template": "# Some Title\n{{unique_section_id}}\n...",
    "sections": [
        {
            "name": "unique_section_id",
            "title": "Section Heading",
            "instructions": "Detailed content generation instructions",
            "keywords": ["technical_term", "specific_methodology"],
            "depends_on": ["section_id1", "section_id2"],
            "min_words": null,  // Optional
            "max_words": null   // Optional
        }
    ]
}

Requirements:
- Section Structure
  - Use unique identifiers
  - Provide clear generation instructions
  - Include domain-specific keywords
  - Specify word limits only if explicit in CFP
  - List linear dependencies in depends_on field

- Content Organization
  - Break down composite sections into atomic units
  - Maintain logical content grouping
  - Map linear section dependencies
  - Preserve sequence relationships

- Template string must:
  - Include required CFP section headers as fixed text
  - Use {{section_name.title}} and {{section_name.content}} only for sections defined in the sections array
  - Follow document hierarchy with proper markdown heading levels

Exclude:
- Administrative processes
- Submission guidelines
- Eligibility criteria
- Review criteria
- Post-award requirements

Example output:
```jsonc
{
    "name": "In Vivo High-Resolution Inner Ear Imaging Grant",
    // Template combines fixed CFP headers with dynamic section placeholders
    "template": "# {{specific_aims.title}}\n{{specific_aims.content}}\n\n# Research Strategy\n## {{significance.title}}\n{{significance.content}}\n\n## {{innovation.title}}\n{{innovation.content}}\n\n## {{approach.title}}\n{{approach.content}}\n\n# {{data_sharing.title}}\n{{data_sharing.content}}\n\n# {{human_subjects.title}}\n{{human_subjects.content}}",
    // Each section referenced by {{variables}} must be defined here
    "sections": [
        {
            // Maps to {{specific_aims.title}} and {{specific_aims.content}}
            "name": "specific_aims",
            "title": "Specific Aims",
            "instructions": "Define the key objectives...",
            "keywords": ["imaging_resolution", "visualization_targets", "clinical_translation"],
            "depends_on": [],
            "max_words": 500
        },
        {
            // Maps to {{significance.title}} and {{significance.content}}
            "name": "significance",
            "title": "Significance",
            "instructions": "Explain how the proposed imaging improvements...",
            "keywords": ["diagnostic_impact", "clinical_application"],
            "depends_on": ["specific_aims"],
            "max_words": 1000
        }
        // Additional sections follow same pattern
    ]
}
```
""",
)


response_schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "template": {"type": "string"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "title": {"type": "string"},
                    "instructions": {"type": "string"},
                    "keywords": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 3,
                        "maxItems": 10,
                    },
                    "depends_on": {"type": "array", "items": {"type": "string"}},
                    "min_words": {"type": "integer"},
                    "max_words": {"type": "integer"},
                },
                "required": ["name", "title", "instructions", "keywords", "depends_on"],
            },
        },
    },
    "required": ["name", "template", "sections"],
}


def validator(tool_response: GrantTemplateDTO) -> None:
    """Validate the tool response.

    Args:
        tool_response: The tool response to validate.

    Raises:
        ValidationError: If the response is invalid.
    """
    try:
        validate(response_schema, tool_response)
    except ValueError as e:
        raise ValidationError(str(e)) from e

    validate_grant_template(text=tool_response["template"], sections=tool_response["sections"])

    section_names = {section["name"] for section in tool_response["sections"]}
    template_variables = {
        v.replace(".content", "").replace(".title", "")
        for v in TEMPLATE_VARIABLE_PATTERN.findall(tool_response["template"])
    }

    if section_names != template_variables:
        raise ValidationError(
            f"Template variables do not match section names: {','.join(section_names)} vs {','.join(template_variables)}"
        )


async def generate_grant_template(*, cfp_content: str, organization_id: str | None) -> GrantTemplateDTO:
    """Generate a complete grant template including format and section configurations.

    Args:
        cfp_content: The extracted content of a grant CFP.
        organization_id: The funding organization to use for the grant template.

    Returns:
        Complete grant template configuration including format and sections
    """
    user_prompt = GRANT_TEMPLATE_GENERATION_USER_PROMPT.substitute(
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
