from collections import defaultdict
from re import Pattern
from re import compile as compile_regex
from typing import TYPE_CHECKING, Final, Literal, TypedDict

from jsonschema import ValidationError as JSONSchemaValidationError
from jsonschema.validators import validate

from src.db.json_objects import GrantSection
from src.dto import GrantTemplateDTO
from src.exceptions import ValidationError
from src.rag.llm_evaluation import with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
from src.rag.utils import handle_completions_request
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate
from src.utils.sync import batched_gather

if TYPE_CHECKING:
    from src.rag.dto import DocumentDTO

logger = get_logger(__name__)


MARKDOWN_HEADING_PATTERN: Final[Pattern[str]] = compile_regex(r"^#{1,6}\s+[\w\s.:-]+$")
SECTION_HEADING_PATTERN: Final[Pattern[str]] = compile_regex(r"^#{1,6}\s+\{\{([a-zA-Z0-9_]+)\.title\}\}$")
SECTION_CONTENT_PATTERN: Final[Pattern[str]] = compile_regex(r"^\{\{([a-zA-Z0-9_]+)\.content\}\}$")


SECTION_TOPICS = [
    "Background Context",
    "Research Feasibility",
    "Hypothesis",
    "Impact",
    "Milestones And Timeline",
    "Novelty And Innovation",
    "Risks And Mitigations",
    "Preliminary Data",
    "Rationale",
    "Scientific Infrastructure",
    "Team Excellence",
    "Methodology",
    "Budget And Resources",
    "Expected Outcomes",
    "Knowledge Translation",
    "Broader Impacts",
    "Data Management Plan",
    "Ethical Considerations",
    "Stakeholder Engagement",
    "Sustainability Plan",
    "Policy Implications",
    "Research Environment",
    "Training And Development",
    "Evaluation Framework",
    "Collaboration Strategy",
]

GRANT_TEMPLATE_GENERATION_SYSTEM_PROMPT: Final[str] = (
    """You are an AI assistant specialized in creating structured templates for grant applications based on Call for Proposals (CFP) requirements. Your primary objective is to create a template that reflects the exact structure and organization of the CFP, ensuring a one-to-one correspondence between sections."""
)
GRANT_TEMPLATE_GENERATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="grant_template_generation",
    template="""
You are an AI assistant specialized in creating structured templates for grant applications based on Call for Proposals (CFP) requirements.
Your task is to analyze the provided CFP content, organization guidelines, and available topics to generate a comprehensive template for a grant application.

Here is the CFP content:
    <cfp_content>
    ${cfp_content}
    </cfp_content>

Here are the organization guidelines:
    <rag_results>
    ${rag_results}
    </rag_results>

These are the available topics for section classification:
    <topics>
    ${topics}
    </topics>

Before generating the final output, please conduct a thorough analysis of the provided information. Conduct your analysis inside <cfp_breakdown> tags, including:

1. Section Identification:
   - List all sections and subsections found in the CFP, numbering each one.
   - Identify and exclude sections of the following types:
        - Administrative processes
        - Budgeting and financial information
        - Eligibility criteria
        - Forms
        - Keywords, ToC and other metadata
        - Letters of support
        - Post-award requirements
        - References and bibliography
        - Review criteria
        - Submission guidelines
        - Third party document sections
   - Map the remaining sections and identify the hierarchy and relationships between them.
   - Extract and quote explicit requirements and constraints, including any word limits.
   - Identify and list sequential dependencies between sections.
   - Extract and list domain-specific terminology found in the CFP.
   - Determine optimal research plan placement, noting reasons for your choice.

2. Content Organization:
   - Break down composite sections into atomic units, listing each one.
   - Map dependencies between sections, creating a dependency graph.
   - Consider and note how to balance granularity vs coherence in the template.
   - For each section, list relevant topics from the provided list.
   - Identify potential integration points for the research plan.

3. Research Plan Integration:
   - Determine where to place the ::research_plan:: tag in the template, providing reasoning.
   - List which sections depend on the research plan.

4. Keyword Selection:
   - For each section, extract and list relevant entities pertinent to its scope.
   - Filter the entities to the most relevant, aiming for 3-10 per section.
   - Ensure selected keywords are specific and derived from CFP terminology.
   - List the final selected keywords for each section.

After your analysis, generate the output in the following JSON format:

{
   "name": "Grant application name",
   "template": "# Regular Markdown Header\n\n## {{some_section.title}}\n\n{{some_section.content}}\n\n:research_plan:\n\n...",
   "sections": [
       {
           "depends_on": ["other_section_id"],
           "instructions": "Detailed content generation instructions",
           "keywords": ["keyword1", "keyword2"],
           "max_words": null,
           "min_words": null,
           "name": "section_id",
           "title": "Section Heading",
           "topics": ["Topic1", "Topic2"],
       }
   ],
}

Output Requirements:
1. Template Format:
   - The template string must be composed only of markdown headings and variable placeholders
   - Use {{section_name.title}} and {{section_name.content}} for all the sections defined in the sections array
   - Use regular headings for non-dynamic sections
   - Ensure that for each section there is a corresponding both {{section_name.title}} and {{section_name.content}} in the template
   - Follow markdown heading hierarchy (# for top level, ## for subsections)
   - Include exactly one ::research_plan:: tag where detailed methodology belongs
   - Do not use variable placeholders for section headings not defined in the sections array
   - Place the sections in the correct order according to the sources
   - For non dynamic sections (i.e. headings), use regular text with markdown headings. Example:
        - This is valid: `"# Project Summary\n## {{background_and_specific_aims.title}}\n{{background_and_specific_aims.content}}"`
        - This is invalid because the dynamic section title is set as static text: `"# Project Summary\n## Background and Specific Aims\n{{background_and_specific_aims.content}}"`
        - This is invalid because the dynamic section content is set as static text: `"# Project Summary\n## {{background_and_specific_aims.title}}\nBackground and Specific Aims"`
        - This is invalid because "# Project Summary" should be a heading here and not a variable: `"{{project_summary}}\n## {{background_and_specific_aims.title}}\n{{background_and_specific_aims.content}}"`
        - This is invalid because "# Project Summary" should be a heading here and not a variable: `"{{project_summary.title}}\n## {{background_and_specific_aims.title}}\n{{background_and_specific_aims.content}}"`

2. Section Structure:
   - Use unique identifiers matching template variables
   - Provide clear generation instructions using domain terminology
   - Include 3-10 specific keywords derived from CFP
   - Select 2+ relevant topics from the provided list
   - List section dependencies in the depends_on field
   - Specify word limits only if explicit in CFP

3. Content Instructions:
   - Be detailed and specific about required content
   - Use correct domain terminology
   - Cover all relevant topics exhaustively
   - Consider research plan context
   - Do not include the 'research_plan' section in the sections array - this is always generated by the system separately.

4. Dependencies and Integration:
    - Ensure all sections defined in the sections array are included in the template
    - Ensure all dependencies refer to dependencies defined in the dependencies array or the "research_plan" value

Output Validation:
    - Ensure the template structure and format are correct
    - Check that the template string does not have redundant titles
    - Verify dependencies between sections are logical and consistent
    - If both max_words and min_words are set for a section, ensure max_words is greater to or equal min_words
    - If max_words is set, ensure it is greater than 0
    - If min_words is set, ensure it is greater than or equal to 0
""",
)


grant_template_response_schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "template": {"type": "string"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "depends_on": {"type": "array", "items": {"type": "string"}},
                    "instructions": {"type": "string"},
                    "keywords": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                    "max_words": {"type": "integer", "minimum": 1},
                    "min_words": {"type": "integer", "minimum": 0},
                    "name": {"type": "string"},
                    "title": {"type": "string"},
                    "topics": {"type": "array", "items": {"type": "string", "enum": SECTION_TOPICS}, "minItems": 2},
                },
                "required": ["depends_on", "instructions", "keywords", "name", "title", "topics"],
            },
        },
    },
    "required": ["name", "template", "sections"],
}


def grant_template_validator(tool_response: GrantTemplateDTO) -> None:  # noqa: C901, PLR0912, PLR0915
    """Validate the tool response.

    Args:
        tool_response: The tool response to validate.

    Raises:
        ValidationError: If the response is invalid.
    """
    # TODO: refactor this function to reduce complexity
    errors: list[str] = []
    try:
        validate(
            schema={
                **grant_template_response_schema,
                "$schema": "http://json-schema.org/draft-07/schema#",
            },
            instance=tool_response,
        )
    except JSONSchemaValidationError as e:
        raise ValidationError(e.message) from e

    if tool_response["template"].count("::research_plan::") != 1:
        errors.append("Template must contain exactly one ::research_plan:: tag")

    mapped_sections = {section["name"]: section for section in tool_response["sections"]}
    section_names = set(mapped_sections)
    found_sections: defaultdict[str, set[Literal["title", "content"]]] = defaultdict(set)

    for line in tool_response["template"].splitlines():
        if line := line.strip():
            if "::research_plan::" in line:
                continue
            if heading_match := SECTION_HEADING_PATTERN.match(line):
                section_name = heading_match.group(1)
                if section_name not in section_names:
                    errors.append(f"Invalid section name '{section_name}' in heading")
                    continue
                found_sections.setdefault(section_name, set()).add("title")
            elif content_match := SECTION_CONTENT_PATTERN.match(line):
                section_name = content_match.group(1)
                if section_name not in section_names:
                    errors.append(f"Invalid section name '{section_name}' in content")
                    continue
                found_sections.setdefault(section_name, set()).add("content")
            elif not (MARKDOWN_HEADING_PATTERN.match(line)):
                errors.append(f"Lines must be either headings with '.title' variables or regular headings, got {line}")

    for section in tool_response["sections"]:
        if section["name"] not in found_sections:
            errors.append(f"Template is missing required section '{section['name']}'")
            continue
        if found_sections[section["name"]] != {"title", "content"}:
            errors.append(f"Section '{section['name']}' is missing required parts")

        for dependency in section["depends_on"]:
            if dependency in {"research_plan", "::research_plan::"}:
                continue

            if dependency not in section_names:
                errors.append(
                    f"Section '{section['name']}' depends on '{dependency}', which is not defined in the sections array"
                )
            if dependency == section["name"]:
                errors.append(f"Section '{section['name']}' cannot depend on itself")

        min_words = section.get("min_words")
        max_words = section.get("max_words")
        if min_words is not None and max_words is not None and min_words > max_words:
            errors.append(f"Section '{section['name']}' has a minimum word count greater than the maximum word count")

        if min_words is not None and min_words < 0:
            errors.append(f"Section '{section['name']}' has a negative minimum word count")

        if max_words is not None and max_words <= 0:
            errors.append(f"Section '{section['name']}' has a negative or zero maximum word count")

        if len(section["topics"]) < 2:
            errors.append(f"Section '{section['name']}' must have at least 2 topics")

        if len(section["keywords"]) < 3 or len(section["keywords"]) > 10:
            errors.append(f"Section '{section['name']}' must have between 3 and 10 keywords")

    if unrelated_variables := set(found_sections) - section_names:
        errors.append(
            f"Template has variables for dynamic sections not defined in the sections array: {','.join(list(unrelated_variables))}"
        )

    if errors:
        raise ValidationError("\n".join(errors))


async def generate_grant_template(user_prompt: str) -> GrantTemplateDTO:
    """Generate a complete grant template including format and section configurations.

    Args:
        user_prompt: The user prompt to send to the model.

    Returns:
        Complete grant template configuration including format and sections
    """
    result = await handle_completions_request(
        prompt_identifier="generate_grant_template",
        messages=user_prompt,
        response_type=GrantTemplateDTO,
        response_schema=grant_template_response_schema,
        system_prompt=GRANT_TEMPLATE_GENERATION_SYSTEM_PROMPT,
        validator=grant_template_validator,
    )
    logger.debug("Generated grant template", result=result)
    return result


SECTION_SEARCH_QUERIES_SYSTEM_PROMPT: Final[str] = """
You are an AI assistant specialized in generating search queries for retrieving relevant information from a vector database.
Your primary objective is to formulate precise and effective queries that capture the essence of a given grant section.
"""

SECTION_SEARCH_QUERIES_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_search_queries_generation",
    template="""
    Your task is to generate search queries based on the following grant section:

    <grant_section>
    ${grant_section}
    </grant_section>

    Guidelines:
        - Include a minimum of 3 search queries and a maximum of 10.
        - Optimize for vector store retrieval
        - Use domain-specific terminology
        - Focus on technical content

    Respond using the provided tool with a JSON object.

    Example:
        ```jsonc
        {
            "search_queries": [
                    "research methodology experimental design protocols",
                    "data collection analysis statistical methods",
                    // ... as required up to 10
            ]
        }
        ```
    """,
)

section_search_queries_response_schema = {
    "type": "object",
    "properties": {
        "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
    },
    "required": ["search_queries"],
}


class SectionQueriesToolResponse(TypedDict):
    """Response from the tool for generating search queries for a grant section."""

    search_queries: list[str]
    """The generated search queries."""


async def generate_section_search_queries(grant_section: GrantSection) -> list[str]:
    """Generate search queries for a grant section.

    Args:
        grant_section: The grant section to generate search queries for.

    Returns:
        The generated search queries.
    """
    result = await handle_completions_request(
        prompt_identifier="section_search_queries_generation",
        response_type=SectionQueriesToolResponse,
        response_schema=section_search_queries_response_schema,
        system_prompt=SECTION_SEARCH_QUERIES_SYSTEM_PROMPT,
        messages=SECTION_SEARCH_QUERIES_USER_PROMPT.to_string(grant_section=grant_section),
    )
    logger.debug("Generated search queries for grant section", result=result)
    return result["search_queries"]


async def handle_generate_grant_template(*, cfp_content: str, organization_id: str | None) -> GrantTemplateDTO:
    """Generate a complete grant template including format and section configurations.

    Args:
        cfp_content: The extracted content of a grant CFP.
        organization_id: The funding organization to use for the grant template.

    Returns:
        Complete grant template configuration including format and sections
    """
    user_prompt = GRANT_TEMPLATE_GENERATION_USER_PROMPT.substitute(
        cfp_content=cfp_content,
        topics=SECTION_TOPICS,
    )
    rag_results: list[DocumentDTO] = (
        await retrieve_documents(organization_id=organization_id, user_prompt=user_prompt) if organization_id else []
    )
    prompt_template_response = await with_prompt_evaluation(
        prompt_handler=generate_grant_template,
        user_prompt=user_prompt.to_string(rag_results=rag_results),
    )
    search_queries = await batched_gather(
        *[generate_section_search_queries(GrantSection(**section)) for section in prompt_template_response["sections"]],
        batch_size=3,
    )
    for section, queries in zip(prompt_template_response["sections"], search_queries, strict=True):
        section["search_queries"] = queries

    return prompt_template_response
