from string import Template
from typing import Final, NotRequired, TypedDict

from src.db.defaults import RESEARCH_ASPECT_DEFAULTS_MAPPING
from src.db.enums import GrantSectionEnum, ResearchAspectEnum
from src.rag.application_draft.shared_prompts import BASE_SYSTEM_PROMPT
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import handle_create_search_queries
from src.rag.utils import handle_completions_request
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

GENERATE_GRANT_FORMAT_STRUCTURE_USER_PROMPT: Final[Template] = Template("""
You are a part of a RAG system specialized in generating grant applications. Your task is to determine the contents the grant application should have
based on user uploaded guidelines that have been previously processed by the system.

Our system generalizes grant applications into a collection of "GrantSections". The types of sections defined by our system are these:
    <grant_section_types>
    ${grant_section_types}
    </grant_section_types>

Each section has n number of "ResearchAspects" related to it. The types of aspects defined by our system are these:
    <research_aspect_types>
    ${research_aspect_types}
    </research_aspect_types>

The aspects are not exclusive for specific sections, rather, different sections have different mixtures of aspects which is determined by their relative weight.

Each aspect has a predefined set of default facets that detail what dimensions of the aspect should be covered. The default facets are:
    <default_facets>
    ${default_facets}
    </default_facets>

If you identify additional facets not covered by our defaults, you can include them in the "additional_facets" field of the aspect.

Use the following retrieval results as the source for generation:
    <rag_results>
    ${rag_results}
    </rag_results>
""")

GENERATE_GRANT_FORMAT_STRUCTURE_OUTPUT_INSTRUCTIONS = """
You must respond exclusively by invoking the provided function.
Return a JSON object adhering to the following format:

```jsonc
{
    "sections": [
        {
            "section_type": "EXECUTIVE_SUMMARY",
            "is_required": true, // if this section must be included or is optional
            "min_words": 250, // optional, can be omitted or null
            "max_words": 500, // optional, can be omitted or null
            "research_aspects": [{
                "aspect_type": "BACKGROUND_CONTEXT",
                "weight": 0.8, // a float between 0 and 1, higher is more important
                "additional_facets": optional, can be omitted or null // nullable or string array
            }, {
                "aspect_type": "RATIONALE",
                "weight": 0.2,
                "additional_facets": [
                    "some additional facet", // ...
                ]
            },
            // ...
        },
        // ...
    ]
}
```
"""

GENERATE_GRANT_FORMAT_STRUCTURE_QUERIES_PROMPT: Final[Template] = Template("""
is to determine the contents the grant application should have
based on user uploaded guidelines that have been previously processed by the system.

Our system generalizes grant applications into a collection of "GrantSections". The types of sections defined by our system are these:
    <grant_section_types>
    ${grant_section_types}
    </grant_section_types>

Each section has n number of "ResearchAspects" related to it. The types of aspects defined by our system are these:
    <research_aspect_types>
    ${research_aspect_types}
    </research_aspect_types>

The aspects are not exclusive for specific sections, rather, different sections have different mixtures of aspects which is determined by their relative weight.

Each aspect has a predefined set of default facets that detail what dimensions of the aspect should be covered. The default facets are:
    <default_facets>
    ${default_facets}
    </default_facets>
""")


class ResearchAspectDTO(TypedDict):
    """The DTO for a research aspect."""

    aspect_type: ResearchAspectEnum
    weight: float
    additional_facets: NotRequired[list[str] | None]


class SectionDTO(TypedDict):
    """The DTO for a section."""

    section_type: GrantSectionEnum
    is_required: bool
    min_words: NotRequired[int | None]
    max_words: NotRequired[int | None]
    research_aspects: list[ResearchAspectDTO]


class ToolResponse(TypedDict):
    """The response from the tool call."""

    sections: list[SectionDTO]


response_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "section_type": {"type": "string"},
                    "is_required": {"type": "boolean"},
                    "min_words": {"type": ["number", "null"]},
                    "max_words": {"type": ["number", "null"]},
                    "research_aspects": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "aspect_type": {"type": "string"},
                                "weight": {"type": "number"},
                                "additional_facets": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["aspect_type", "weight"],
                        },
                    },
                },
                "required": ["section_type", "is_required", "research_aspects"],
            },
        }
    },
    "required": ["sections"],
}


async def generate_format_sections(format_id: str) -> list[SectionDTO]:
    """Generate the sections of the grant format.

    Args:
        format_id: The ID of the grant format.

    Returns:
        list[SectionDTO]: The generated sections of the grant format.
    """
    queries_result = await handle_create_search_queries(
        GENERATE_GRANT_FORMAT_STRUCTURE_QUERIES_PROMPT.substitute(
            grant_section_types=list(GrantSectionEnum),
            research_aspect_types=list(ResearchAspectEnum),
            default_facets=serialize(RESEARCH_ASPECT_DEFAULTS_MAPPING),
        )
    )

    search_results = await retrieve_documents(
        format_id=format_id,
        search_queries=queries_result.queries,
    )

    result = await handle_completions_request(
        prompt_identifier="grant_format_structure",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=GENERATE_GRANT_FORMAT_STRUCTURE_USER_PROMPT.substitute(
            grant_section_types=serialize([e.value for e in GrantSectionEnum]),
            research_aspect_types=serialize([e.value for e in ResearchAspectEnum]),
            default_facets=serialize(RESEARCH_ASPECT_DEFAULTS_MAPPING),
            rag_results=serialize(search_results),
        ),
        response_type=ToolResponse,
        response_schema=response_schema,
        output_instructions=GENERATE_GRANT_FORMAT_STRUCTURE_OUTPUT_INSTRUCTIONS,
    )
    logger.info("Generated grant format structure", result=result)
    return result.response["sections"]
