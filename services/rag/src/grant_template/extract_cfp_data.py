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
from services.rag.src.grant_template.nlp_categorizer import (
    categorize_text_async,
    format_nlp_analysis_for_prompt,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import EvaluationCriterion, with_prompt_evaluation
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
    nlp_analysis: NotRequired[dict[str, list[str]]]


_cfp_extraction_cache: dict[str, tuple[ExtractedCFPData, float]] = {}
CFP_CACHE_TTL_SECONDS = 3600


def _create_cache_key(source_ids: list[str], organization_mapping: dict[str, dict[str, str]]) -> str:
    """Create a stable cache key from source IDs and organization mapping."""
    cache_data = {
        "source_ids": sorted(source_ids),
        "organizations": dict(sorted(organization_mapping.items())),
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

CRITICAL: Respond only with valid JSON. Do not include repetitive text, escaped characters, or malformed content.
If encountering unclear content, use "[UNCLEAR]" markers instead of repeating text patterns.
"""

EXTRACT_CFP_DATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_cfp_data_multi_source",
    template="""
    Extract from: <rag_sources>${rag_sources}</rag_sources>
    Organizations: <orgs>${organization_mapping}</orgs>

    USE NLP ANALYSIS AS SUPPLEMENTAL GUIDANCE:
    Each source includes semantic categorization to help identify key content:
    - Money/Budget, Date/Time, Writing-related requirements
    - Orders (mandatory) vs Recommendations (optional)
    - Positive vs Negative instructions
    - Evaluation criteria

    IMPORTANT: You must still read and analyze ALL source content comprehensively.
    The NLP analysis is supportive context - not a replacement for thorough text analysis.

    EXTRACTION PRIORITIES (NLP categories help identify):
    1. Orders & Positive Instructions → Likely contain mandatory requirements
    2. Evaluation Criteria → Often critical for application structure
    3. Date/Time → May contain essential deadlines (prioritize for submission_date)
    4. Writing-related → May contain format compliance requirements
    5. Money/Budget → May provide funding context
    6. Negative Instructions → May contain important restrictions

    Extract:
    1. Organization ID from mapping (or null)
    2. CFP subject (one sentence: type, audience, focus)
    3. Deadline (YYYY-MM-DD format) - prioritize Date/Time categories from NLP
    4. Section structure (titles, page limits, preserve numbering) - use Orders/Writing-related

    Exclude: URLs, Grants.gov steps, addresses, admin details

    IMPORTANT OUTPUT RULES:
    - Return valid JSON only
    - Maximum 50 subtitles per section
    - No repetitive text patterns
    - Use "[UNCLEAR]" for ambiguous information
    - Limit response to 5000 tokens maximum
    - Leverage NLP categorization to improve extraction quality
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
        sources_result = await session.execute(
            select(RagSource.id, RagSource.source_type, RagSource.text_content).where(RagSource.id.in_(source_ids))
        )
        sources = sources_result.fetchall()

        chunks_result = await session.execute(
            select(TextVector.rag_source_id, TextVector.chunk).where(TextVector.rag_source_id.in_(source_ids))
        )

        chunks_by_source: defaultdict[str, list[str]] = defaultdict(list)
        for source_id, chunk in chunks_result:
            chunk_content = chunk.get("content", "")
            if chunk_content:
                chunks_by_source[source_id].append(chunk_content)

    rag_sources_data = []
    for source_id, source_type, source_text_content in sources:
        text_content = source_text_content or ""
        chunks = chunks_by_source.get(source_id, [])

        try:
            nlp_analysis = await categorize_text_async(text_content)
            logger.debug(
                "NLP analysis completed for source",
                source_id=str(source_id),
                total_sentences=sum(len(sentences) for sentences in nlp_analysis.values()),
                categories_found={k: len(v) for k, v in nlp_analysis.items() if v},
            )
        except Exception as e:
            logger.warning(
                "NLP analysis failed for source, using empty analysis", source_id=str(source_id), error=str(e)
            )
            nlp_analysis = {}

        rag_sources_data.append(
            RagSourceData(
                source_id=str(source_id),
                source_type=source_type,
                text_content=text_content,
                chunks=chunks,
                nlp_analysis=nlp_analysis,
            )
        )

    return rag_sources_data


def sanitize_text_content(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    text = re.sub(r"\\+r\\+n", "\n", text)
    text = re.sub(r"\\+n", "\n", text)
    text = re.sub(r"\\+r", "\n", text)
    repetitive_pattern = re.search(r"(.{1,10})\1{20,}", text)
    if repetitive_pattern:
        start_pos = repetitive_pattern.start()
        logger.warning(
            "Detected repetitive pattern in text content",
            pattern=repetitive_pattern.group(1)[:20],
            original_length=len(text),
            truncated_length=start_pos,
        )
        text = text[:start_pos] + "\n[Content truncated due to repetitive pattern]"

    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    lines = text.split("\n")
    lines = [line.rstrip() for line in lines]
    text = "\n".join(lines)

    text = text.replace("\x00", "")
    text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    return text.strip()


def format_rag_sources_for_prompt(rag_sources: list[RagSourceData]) -> str:
    formatted_sources = []

    for i, source in enumerate(rag_sources):
        source_section = f"### Source {i}: {source['source_type'].upper()} (ID: {source['source_id']})\n\n"

        nlp_analysis = source.get("nlp_analysis", {})
        if nlp_analysis:
            formatted_nlp = format_nlp_analysis_for_prompt(nlp_analysis)
            source_section += f"#### NLP Analysis:\n{formatted_nlp}\n\n"
        else:
            source_section += "#### NLP Analysis:\nNo semantic analysis available for this source.\n\n"

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
                name="NLP-Enhanced Extraction Quality",
                evaluation_instructions="""
                Evaluate whether the extraction effectively leveraged the NLP semantic analysis to prioritize mandatory requirements (Orders/Positive Instructions),
                evaluation criteria, and formatting requirements over optional recommendations and administrative details.
                Check if Date/Time categories from NLP analysis were properly identified for deadlines.
                Assess if the extraction properly distinguished between mandatory vs optional content using NLP categorization.
                """,
                weight=0.9,
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
                Verify that critical restrictions and prohibitions identified in NLP analysis are included.
                """,
                weight=0.9,
            ),
            EvaluationCriterion(
                name="Filtering Accuracy",
                evaluation_instructions="""
                Validate that unnecessary general instructions (e.g., Grants.gov, eRA Commons, URLs) are removed while keeping essential information from all sources.
                Ensure that NLP-identified mandatory requirements are retained while optional recommendations are appropriately categorized.
                """,
                weight=0.7,
            ),
        ],
    )

    _cache_cfp_result(cache_key, result)
    logger.info("CFP extraction completed and cached", cache_key=cache_key)

    return result
