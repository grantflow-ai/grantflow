from string import Template
from typing import Final, NotRequired, TypedDict

from src.db.enums import ContentTopicEnum, GrantSectionEnum
from src.rag.grant_template.shared_prompts import GRANT_FORMAT_SYSTEM_PROMPT
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import handle_create_search_queries
from src.rag.utils import handle_completions_request
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

GENERATE_GRANT_SECTION_USER_PROMPT: Final[Template] = Template("""
## Task
Our system generalizes grant application formats into a collection of grant sections.
Your task is to generate the data for the ${section_type} section type.

In our data-model, each section has a set of research aspects. Our system defines the following aspect types:
    <research_aspect_types>
    ${research_aspect_types}
    </research_aspect_types>

These aspects determine the text composition of the section using relative weights.

## Sources
Use the following retrieval results as the source for generation:
    <rag_results>
    ${rag_results}
    </rag_results>
""")

GENERATE_GRANT_SECTION_OUTPUT_INSTRUCTIONS = """
## Output
You must respond by invoking the provided function.

Example output:

```jsonc
{
    "type": "SIGNIFICANCE",
    "keywords": ["..."] // list of terms and keywords that define the section in the grant format. These will be used later for queries.
    "min_words": 250, // nullable and optional
    "max_words": 500, // nullable and optional
    "aspects": [
        {
            "aspect_type": "IMPACT",
            "weight": 0.8, // a float between 0 and 1, higher is more important
        },
        {
            "aspect_type": "NOVELTY_AND_INNOVATION",
            "weight": 0.5,
        },
        // more aspects as required ...
    ]
},
```

### Guidelines

Aspects combine with sections through weighted relationships. They are used to determine the composition of text generation and the sources used.
- They do not have to sum to 1.0, rather they are relative to each other
- Higher weights (0.7-1.0) indicate primary aspects
- Medium weights (0.4-0.6) indicate supporting aspects
- Lower weights (0.1-0.3) indicate minor aspects
- A section must have at least two aspects. Otherwise an error will be raised.

When generating keywords, assume that the values will be used for RAG queries. As such, use specific and relevant keywords and concise but information dense sentences.

### Validation Rules
- terminology must include between 3-10 specific, relevant strings
- if max_words is provided, min_words must be less than or equal to max_words, or null
- minimum of 2 aspects are required
"""

GENERATE_GRANT_SECTION_TASK_DESCRIPTION: Final[str] = """
The next task in the RAG pipeline is to generate the data for the ${section_type} section type.
"""


class SectionAspectsDTO(TypedDict):
    """An aspect of a section."""

    type: ContentTopicEnum
    """The type of the aspect."""
    weight: float
    """The weight of the aspect."""


class SectionDTO(TypedDict):
    """A grant section."""

    aspects: list[SectionAspectsDTO]
    """The aspects of the section."""
    keywords: list[str]
    """Keywords that describe this section."""
    max_words: NotRequired[int | None]
    """The maximum number of words in the section."""
    min_words: NotRequired[int | None]
    """The minimum number of words in the section."""
    type: GrantSectionEnum
    """The type of the section."""


response_schema = {
    "type": "object",
    "properties": {
        "aspects": {
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
        "keywords": {"type": "array", "minItems": 3, "maxItems": 10, "items": {"type": "string"}},
        "max_words": {"type": "number", "nullable": True},
        "min_words": {"type": "number", "nullable": True},
        "type": {"type": "string", "enum": [e.value for e in GrantSectionEnum]},
    },
    "required": ["aspects", "keywords", "type"],
}


def validate_section_dto(dto: SectionDTO) -> bool:
    """Validate the section DTO."""
    max_words = dto.get("max_words")
    min_words = dto.get("min_words")

    return max_words is None or min_words is None or (max_words > 0 and 0 <= min_words <= max_words)


async def generate_section(organization_id: str, section_type: GrantSectionEnum) -> SectionDTO:
    """Generate the sections of the grant format.

    Args:
        organization_id: The organization ID to generate the grant format for.
        section_type: The type of the section.

    Returns:
        The markdown template of the format
    """
    queries_result = await handle_create_search_queries(
        task_description=GENERATE_GRANT_SECTION_TASK_DESCRIPTION,
        section_type=section_type,
    )

    search_results = await retrieve_documents(
        organization_id=organization_id, search_queries=queries_result.queries, max_results=10
    )

    result = await handle_completions_request(
        prompt_identifier="grant_format_structure",
        system_prompt=GRANT_FORMAT_SYSTEM_PROMPT,
        user_prompt=GENERATE_GRANT_SECTION_USER_PROMPT.substitute(
            research_aspect_types=serialize([e.value for e in ContentTopicEnum]),
            section_type=section_type,
            rag_results=serialize(search_results),
        ),
        response_type=SectionDTO,
        response_schema=response_schema,
        output_instructions=GENERATE_GRANT_SECTION_OUTPUT_INSTRUCTIONS,
        validator=validate_section_dto,
    )
    logger.info("Generated grant format template", response=result.response)
    return result.response
