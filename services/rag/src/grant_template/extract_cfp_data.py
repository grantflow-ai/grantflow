import hashlib
import re
import time
from collections import defaultdict
from typing import Any, Final, NotRequired, TypedDict

from packages.db.src.tables import RagSource, TextVector
from packages.shared_utils.src.ai import REASONING_MODEL
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.constants import MAX_CHUNK_SIZE, MAX_SOURCE_SIZE, NUM_CHUNKS
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)


class Content(TypedDict):
    title: str
    subtitles: list[str]


class ExtractedCFPData(TypedDict):
    organization_id: str | None
    error: NotRequired[str | None]
    cfp_subject: str
    submission_date: str | None
    content: list[Content]


class RagSourceData(TypedDict):
    source_id: str
    source_type: str
    text_content: str
    chunks: list[str]


# In-memory cache for CFP extraction results
# Key: content hash, Value: (result, timestamp)
_cfp_extraction_cache: dict[str, tuple[ExtractedCFPData, float]] = {}
CFP_CACHE_TTL_SECONDS = 3600  # 1 hour


def _create_cache_key(source_ids: list[str], organization_mapping: dict[str, dict[str, str]]) -> str:
    """Create a stable cache key from source IDs and organization mapping."""
    cache_data = {
        "source_ids": sorted(source_ids),
        "organizations": {k: v for k, v in sorted(organization_mapping.items())},
    }
    cache_str = str(cache_data)
    return hashlib.sha256(cache_str.encode()).hexdigest()[:16]


def _get_cached_cfp_result(cache_key: str) -> ExtractedCFPData | None:
    """Get cached CFP extraction result if still valid."""
    if cache_key not in _cfp_extraction_cache:
        return None
    
    result, timestamp = _cfp_extraction_cache[cache_key]
    current_time = time.time()
    
    if current_time - timestamp > CFP_CACHE_TTL_SECONDS:
        # Expired, remove from cache
        del _cfp_extraction_cache[cache_key]
        logger.debug("CFP cache entry expired", cache_key=cache_key)
        return None
    
    logger.debug("CFP cache hit", cache_key=cache_key, age_seconds=current_time - timestamp)
    return result


def _cache_cfp_result(cache_key: str, result: ExtractedCFPData) -> None:
    """Cache CFP extraction result."""
    _cfp_extraction_cache[cache_key] = (result, time.time())
    logger.debug("CFP result cached", cache_key=cache_key, cache_size=len(_cfp_extraction_cache))


TEMPERATURE: Final[float] = 0.1

EXTRACT_CFP_DATA_SYSTEM_PROMPT: Final[str] = """
Extract structured requirements from funding announcements.
Prioritize official CFP docs over supplementary materials.
"""

EXTRACT_CFP_DATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_cfp_data_multi_source",
    template="""
    Extract from: <rag_sources>${rag_sources}</rag_sources>
    Organizations: <orgs>${organization_mapping}</orgs>

    Extract:
    1. Organization ID from mapping (or null)
    2. CFP subject (one sentence: type, audience, focus)
    3. Deadline (YYYY-MM-DD)
    4. Section structure (titles, page limits, preserve numbering)
    
    Exclude: URLs, Grants.gov steps, addresses, admin details
    """,
)


async def get_rag_sources_data(source_ids: list[str], session_maker: async_sessionmaker[Any]) -> list[RagSourceData]:
    """
    Retrieve text content and chunks from multiple RAG sources with optimized batch processing.

    Args:
        source_ids: List of RAG source IDs to retrieve
        session_maker: Database session maker

    Returns:
        List of RagSourceData containing content and chunks for each source
    """
    async with session_maker() as session:
        # Execute queries sequentially to avoid session conflicts
        sources_result = await session.execute(
            select(RagSource.id, RagSource.source_type, RagSource.text_content).where(RagSource.id.in_(source_ids))
        )
        sources = sources_result.fetchall()

        chunks_result = await session.execute(
            select(TextVector.rag_source_id, TextVector.chunk).where(TextVector.rag_source_id.in_(source_ids))
        )
        
        # Process chunks efficiently
        chunks_by_source: defaultdict[str, list[str]] = defaultdict(list)
        for source_id, chunk in chunks_result:
            chunk_content = chunk.get("content", "")
            if chunk_content:  # Only include non-empty chunks
                chunks_by_source[source_id].append(chunk_content)

    # Build result list with optimized comprehension
    rag_sources_data = [
        RagSourceData(
            source_id=str(source_id),
            source_type=source_type,
            text_content=text_content or "",
            chunks=chunks_by_source.get(source_id, []),
        )
        for source_id, source_type, text_content in sources
    ]

    return rag_sources_data


def sanitize_text_content(text: str) -> str:
    """
    Sanitize text content by removing excessive newlines and whitespace.

    Args:
        text: Text to sanitize

    Returns:
        Sanitized text
    """

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    text = re.sub(r"\n{3,}", "\n\n", text)

    text = re.sub(r" {2,}", " ", text)

    lines = text.split("\n")
    lines = [line.rstrip() for line in lines]
    text = "\n".join(lines)

    text = text.replace("\x00", "")

    return text.strip()


def format_rag_sources_for_prompt(rag_sources: list[RagSourceData]) -> str:
    """
    Format RAG sources data for inclusion in the prompt.

    Args:
        rag_sources: List of RAG source data

    Returns:
        Formatted string for prompt inclusion
    """
    formatted_sources = []

    for i, source in enumerate(rag_sources):
        source_section = f"### Source {i}: {source['source_type'].upper()} (ID: {source['source_id']})\n\n"

        sanitized_content = sanitize_text_content(source["text_content"])
        source_section += "#### Full Content:\n"
        source_section += (
            f"{sanitized_content[:MAX_SOURCE_SIZE]}{'...' if len(sanitized_content) > MAX_SOURCE_SIZE else ''}\n\n"
        )

        source_section += "#### Key Chunks:\n"

        for j, chunk in enumerate(source["chunks"][:NUM_CHUNKS]):
            sanitized_chunk = sanitize_text_content(chunk)
            source_section += (
                f"{j}. {sanitized_chunk[:MAX_CHUNK_SIZE]}{'...' if len(sanitized_chunk) > MAX_CHUNK_SIZE else ''}\n"
            )

        formatted_sources.append(source_section)

    return "\n".join(formatted_sources)


cfp_extraction_schema = {
    "type": "object",
    "properties": {
        "organization_id": {
            "type": "string",
            "nullable": True,
            "description": "UUID from organization mapping if the funding organization is found, null otherwise",
        },
        "cfp_subject": {
            "type": "string",
            "description": "Comprehensive summary of the funding opportunity including type, audience, objectives, and focus areas",
        },
        "content": {
            "type": "array",
            "description": "Array of sections and requirements extracted from the CFP",
            "items": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "nullable": False,
                        "description": "Section title or requirement category name",
                    },
                    "subtitles": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,
                        "description": "Array of subsection titles or individual requirements",
                    },
                },
                "required": ["title", "subtitles"],
            },
        },
        "submission_date": {
            "type": "string",
            "nullable": True,
            "description": "Final submission deadline in YYYY-MM-DD format if found, null otherwise",
        },
        "error": {
            "type": "string",
            "nullable": True,
            "description": "Error message if extraction fails, null on success",
        },
    },
    "required": ["organization_id", "cfp_subject", "content", "submission_date"],
}


def validate_cfp_extraction(response: ExtractedCFPData) -> None:
    if not response["content"]:
        if error := response.get("error"):
            raise InsufficientContextError(
                error,
                context={
                    "cfp_subject": response.get("cfp_subject", ""),
                    "organization_id": response.get("organization_id", None),
                    "recovery_instruction": "The CFP content appears to be insufficient or unclear. Try extracting more specific guidelines or requirements from all available sources.",
                },
            )
        raise ValidationError(
            "No content extracted from any source. Please provide an error message.",
            context={
                "cfp_subject": response.get("cfp_subject", ""),
                "organization_id": response.get("organization_id", None),
                "recovery_instruction": "Extract at least 3-5 relevant guidelines or requirements from the available RAG sources, or provide a specific error message.",
            },
        )


async def extract_cfp_data_multi_source(task_description: str, **_: Any) -> ExtractedCFPData:
    return await handle_completions_request(
        prompt_identifier="extract_cfp_data_multi_source",
        response_type=ExtractedCFPData,
        response_schema=cfp_extraction_schema,
        validator=validate_cfp_extraction,
        messages=task_description,
        system_prompt=EXTRACT_CFP_DATA_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=REASONING_MODEL,
        top_p=0.9,
    )


async def handle_extract_cfp_data_from_rag_sources(
    *, source_ids: list[str], organization_mapping: dict[str, dict[str, str]], session_maker: async_sessionmaker[Any]
) -> ExtractedCFPData:
    """
    Extract CFP data from multiple RAG sources (files and URLs).
    Uses intelligent caching to avoid redundant LLM calls.

    Args:
        source_ids: List of RAG source IDs to use for extraction
        organization_mapping: Mapping of organization IDs to names/abbreviations
        session_maker: Database session maker

    Returns:
        Extracted CFP data synthesized from all sources
    """
    # Check cache first
    cache_key = _create_cache_key(source_ids, organization_mapping)
    cached_result = _get_cached_cfp_result(cache_key)
    if cached_result is not None:
        logger.info("Using cached CFP extraction result", cache_key=cache_key)
        return cached_result

    rag_sources = await get_rag_sources_data(source_ids, session_maker)

    if not rag_sources:
        raise ValidationError("No RAG sources found for the provided IDs", context={"source_ids": source_ids})

    formatted_sources = format_rag_sources_for_prompt(rag_sources)

    logger.info(
        "Extracting CFP data from multiple sources",
        source_count=len(rag_sources),
        source_types=[s["source_type"] for s in rag_sources],
        cache_key=cache_key,
    )

    result = await with_prompt_evaluation(
        prompt_identifier="extract_cfp_data_multi_source",
        prompt_handler=extract_cfp_data_multi_source,
        prompt=EXTRACT_CFP_DATA_USER_PROMPT.to_string(
            rag_sources=formatted_sources, organization_mapping=organization_mapping
        ),
        increment=10,
        retries=3,
        passing_score=80,
        criteria=[
            EvaluationCriterion(
                name="Multi-Source Synthesis",
                evaluation_instructions="""
                Assess whether information from all available sources has been properly synthesized and conflicts resolved appropriately.
                """,
                weight=0.8,
            ),
            EvaluationCriterion(
                name="Correctness",
                evaluation_instructions="""
                Assess whether extracted content correctly reflects the explicit grant requirements from all sources, avoiding extraneous administrative details.
                """,
            ),
            EvaluationCriterion(
                name="Structural Completeness",
                evaluation_instructions="""
                Ensure extracted content includes necessary structural details such as required sections, page limits, and evaluation criteria from all relevant sources.
                """,
                weight=0.9,
            ),
            EvaluationCriterion(
                name="Filtering Accuracy",
                evaluation_instructions="""
                Validate that unnecessary general instructions (e.g., Grants.gov, eRA Commons, URLs) are removed while keeping essential information from all sources.
                """,
                weight=0.7,
            ),
        ],
    )
    
    # Cache the result for future use
    _cache_cfp_result(cache_key, result)
    logger.info("CFP extraction completed and cached", cache_key=cache_key)
    
    return result
