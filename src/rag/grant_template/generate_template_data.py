from collections import defaultdict
from re import Pattern
from re import compile as compile_regex
from typing import TYPE_CHECKING, Final, Literal, TypedDict

from jsonschema import ValidationError as JSONSchemaValidationError
from jsonschema.validators import validate

from src.db.json_objects import GrantSection
from src.dto import GrantTemplateDTO
from src.exceptions import ValidationError
from src.rag.completion import handle_completions_request
from src.rag.llm_evaluation import with_prompt_evaluation
from src.rag.retrieval import retrieve_documents
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
    You are an AI assistant specializing in creating structured grant application templates based on Call for Proposals (CFP) requirements.
    Your task is to analyze the provided CFP content, organization guidelines, and available topics to generate a comprehensive grant application template.

    ## Sources

    Use these sources for template generation:
    Here is the CFP content:
        <cfp_content>
        ${cfp_content}
        </cfp_content>

    Here are the organization's guidelines:
        <rag_results>
        ${rag_results}
        </rag_results>

    ## Topics

    Use these topics for section classification

        <topics>
        ${topics}
        </topics>

    ## Generation Instructions

    Before beginning generation, follow these steps:

    1. Section Identification:
       - List all sections and subsections found in the sources (CFP content + organization guidelines), numbering each.
       - Identify and exclude sections of the following types:
         - Administrative processes
         - Budgeting and financial information
         - Eligibility criteria
         - Forms
         - Keywords, ToC, and other metadata
         - Data management plan
         - Letters of support
         - Post-award requirements
         - References and bibliography
         - Review criteria
         - Submission guidelines
         - Third-party document sections
       - Identify which sections correlate with the research plan:
         - The research plan is the part of the application that discusses the research objectives, methodology, concrete research tasks, risks, and mitigations.
         - The research plan should account for 50-66% of the total length of the grant application text.
       - Record the title the research plan section should have (see output), and then remove any section that correlates to it from the list of sections.
       - Map the remaining sections and identify the hierarchy and relationships between them.
       - Identify and list sequential dependencies between sections.
       - Identify which sections depend on the research plan.

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
       - Ensure selected keywords are specific and derived from sources' terminology.
       - List the final selected keywords for each section.

    5. Limit Analysis:
       - Identify and list all text length limits defined in the sources (max characters, words and/or pages).
       - Convert all limits to words by using the following conversion rate:
         - Page-to-word conversion when format unspecified:
             - Use Times New Roman 11pt baseline: 415 words/page
             - Add 10% if single-spaced: 456 words/page
             - Subtract 12% if double-spaced: 365 words/page
             - Subtract 5% for Arial vs. TNR: 394 words/page
             - Subtract 10% for 12pt vs 11pt: 373 words/page
         - Character limits to words:
             - Divide character count by 7
             - Round down to the nearest whole number. Example: 5000 chars = 714 words
       - Determine the maximum number of words for the total grant application (convert as required) - including the sections you identified prior and the research plan.
       - Adjust the maximum to allow space for user-inserted figures by subtracting 12.5% of the total words.
       - Define the total minimum number of words as 85% of the total maximum number of words.
       - Determine the minimum and maximum number of words for the research plan section; if the maximum is not specified, assume the maximum is 60% and derive the minimum as 85% of this number.
       - Determine the minimum and maximum number of words for non-research-plan sections by subtracting the research plan minimum and maximum from the total minimum and maximum.  from the tota maximum.
       - For each section, if the section does not have explicit limits specified in the sources, assign a default base on the following, which should be adjusted to fit the available words limits:
         - Background section: 400-500 words
         - Technical section: 500-1000 words
         - Impact section: 200-500 words
         - Timeline section: 200-300 words
         - Resource section: 200-300 words
       - Adjust the limits for each section to ensure the total does not exceed the maximum number of words allowed.

    After your analysis, generate the output in the following JSON format:

        ```jsonc
            {
            "name": "Grant application name",
            "template": "# Regular Markdown Header\n\n## {{some_section.title}}\n\n{{some_section.content}}\n\n::research_plan::\n\n..."
            "sections": [
                {
                    "depends_on": ["other_section_id"],
                    "instructions": "Detailed content generation instructions",
                    "keywords": ["keyword1", "keyword2"],
                    "min_words": 300,
                    "max_words": 500,
                    "name": "section_id",
                    "title": "Section Heading",
                    "topics": ["Topic1", "Topic2"],
                    "search_queries": ["query1", "query2"]
                }
            ],
            "research_plan": {
                    "title": "Research Plan",
                    "min_words": 2000,
                    "max_words": 4000
            }
            }
        ```

    ## Output Requirements

    1. Template Format:
       - The template string must be composed only of markdown headings and variable placeholders
       - Use {{section_name.title}} and {{section_name.content}} for all the sections defined in the sections array
       - Use regular headings for nondynamic sections
       - Ensure that for each section, there is a corresponding both {{section_name.title}} and {{section_name.content}} in the template
       - Follow markdown heading hierarchy (# for top level, ## for subsections)
       - Include exactly one ::research_plan:: tag where detailed methodology belongs
       - Do not use variable placeholders for section headings not defined in the sections array
       - Place the sections in the correct order according to the sources
       - For nondynamic sections (i.e., headings), use regular text with markdown headings. Example:
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
       - Be detailed and specific about the required content
       - Use correct domain terminology
       - Cover all relevant topics exhaustively
       - Consider the research plan context
       - Do not include the 'research_plan' section in the sections array - this is always generated by the system separately.

    4. Dependencies and Integration:
       - Ensure all sections defined in the sections array are included in the template
       - Ensure all dependencies refer to dependencies defined in the dependencies array or the "research_plan" value

    5. Word Limits:
       - If sources specify limits, these take priority
       - If no limits are provided, use defaults
       - If CFP specifies some but not all limits, apply the limit + sensible defaults

    ## Validation

    - Ensure the template structure and format are correct
    - Check that the template string does not have redundant titles
    - Verify dependencies between sections are logical and consistent
    - Max words must be greater than min words and min words >= 0
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
                    "min_words": {"type": "integer", "minimum": 0},
                    "max_words": {"type": "integer", "minimum": 0},
                    "name": {"type": "string", "pattern": "^[a-z][a-z0-9_]*$"},
                    "title": {"type": "string"},
                    "topics": {"type": "array", "items": {"type": "string", "enum": SECTION_TOPICS}, "minItems": 1},
                    "search_queries": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 10},
                },
                "required": [
                    "depends_on",
                    "instructions",
                    "keywords",
                    "min_words",
                    "max_words",
                    "name",
                    "title",
                    "topics",
                    "search_queries",
                ],
            },
        },
        "research_plan": {
            "type": "object",
            "properties": {
                "min_words": {"type": "integer", "minimum": 0},
                "max_words": {"type": "integer", "minimum": 0},
                "title": {"type": "string"},
            },
            "required": ["min_words", "max_words", "title"],
        },
    },
    "required": ["name", "template", "sections", "research_plan"],
}


def grant_template_validator(tool_response: GrantTemplateDTO) -> None:  # noqa: C901, PLR0912
    """Validate grant template response."""
    # TODO: refactor to reduce complexity
    errors: list[str] = []

    try:
        validate(
            instance=tool_response,
            schema={
                **grant_template_response_schema,
                "$schema": "http://json-schema.org/draft-07/schema#",
            },
        )
    except JSONSchemaValidationError as e:
        raise ValidationError(e.message) from e

    # Validate research plan tag
    if tool_response["template"].count("::research_plan::") != 1:
        errors.append("Template must contain exactly one ::research_plan:: tag")

    # Map sections and validate template structure
    sections = {s["name"]: s for s in tool_response["sections"]}
    found_sections: defaultdict[str, set[Literal["title", "content"]]] = defaultdict(set)

    # Updated pattern matching
    patterns = {
        "heading": compile_regex(r"^#{1,6}\s+[A-Za-z0-9\s.:-]+$"),
        "section_title": compile_regex(r"^#{1,6}\s+\{\{([a-z][a-z0-9_]*)\.title\}\}$"),
        "section_content": compile_regex(r"^\{\{([a-z][a-z0-9_]*)\.content\}\}$"),
    }

    for line in tool_response["template"].splitlines():
        if not (line := line.strip()):
            continue

        if "::research_plan::" in line:
            continue

        # Match patterns
        if m := patterns["section_title"].match(line):
            section = m.group(1)
            if section not in sections:
                errors.append(f"Invalid section '{section}' in title")
            found_sections[section].add("title")
        elif m := patterns["section_content"].match(line):
            section = m.group(1)
            if section not in sections:
                errors.append(f"Invalid section '{section}' in content")
            found_sections[section].add("content")
        elif not patterns["heading"].match(line):
            errors.append(f"Invalid line format: {line}")

    # Validate section completeness and dependencies
    for name, section in sections.items():
        if found_sections[name] != {"title", "content"}:
            errors.append(f"Section '{name}' missing title or content")

        for dep in section["depends_on"]:
            if dep == "research_plan":
                continue
            if dep not in sections:
                errors.append(f"Section '{name}' has invalid dependency '{dep}'")
            if dep == name:
                errors.append(f"Section '{name}' cannot depend on itself")

        # Word count validation
        if section["min_words"] > section["max_words"]:
            errors.append(f"Section '{name}' min_words exceeds max_words")

        # Query validation
        if not 3 <= len(section["search_queries"]) <= 10:
            errors.append(f"Section '{name}' must have 3-10 search queries")

    if errors:
        raise ValidationError("\n".join(errors))


async def generate_grant_template(task_description: str) -> GrantTemplateDTO:
    """Generate a complete grant template including format and section configurations.

    Args:
        task_description: The user prompt to send to the model.

    Returns:
        Complete grant template configuration including format and sections
    """
    result = await handle_completions_request(
        prompt_identifier="generate_grant_template",
        messages=task_description,
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
        await retrieve_documents(organization_id=organization_id, task_description=user_prompt)
        if organization_id
        else []
    )
    prompt_template_response = await with_prompt_evaluation(
        prompt_handler=generate_grant_template,
        prompt=user_prompt.to_string(rag_results=rag_results),
    )
    search_queries = await batched_gather(
        *[generate_section_search_queries(GrantSection(**section)) for section in prompt_template_response["sections"]],
        batch_size=3,
    )
    for section, queries in zip(prompt_template_response["sections"], search_queries, strict=True):
        section["search_queries"] = queries

    return prompt_template_response
