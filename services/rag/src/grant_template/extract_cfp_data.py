import hashlib
import re
import time
from collections import defaultdict
from typing import TYPE_CHECKING, Any, Final, TypedDict

from packages.db.src.json_objects import CategorizationAnalysisResult

if TYPE_CHECKING:
    from services.rag.src.grant_template.dto import ExtractCFPContentStageDTO
    from services.rag.src.utils.job_manager import JobManager
from packages.db.src.tables import RagSource, TextVector
from packages.shared_utils.src.ai import REASONING_MODEL
from packages.shared_utils.src.dto import ExtractedCFPData
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.constants import MAX_CHUNK_SIZE, MAX_SOURCE_SIZE, NUM_CHUNKS
from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.grant_template.category_extraction import (
    categorize_text,
    format_nlp_analysis_for_prompt,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

_cfp_extraction_cache: dict[str, tuple["ExtractedCFPData", float]] = {}
CFP_CACHE_TTL_SECONDS = 3600


class RagSourceData(TypedDict):
    source_id: str
    source_type: str
    text_content: str
    chunks: list[str]
    nlp_analysis: CategorizationAnalysisResult


def _create_cache_key(source_ids: list[str], organization_mapping: dict[str, dict[str, str]]) -> str:
    cache_data = {
        "source_ids": sorted(source_ids),
        "organizations": dict(sorted(organization_mapping.items())),
    }
    cache_str = str(cache_data)
    return hashlib.sha256(cache_str.encode()).hexdigest()[:16]


def _get_cached_cfp_result(cache_key: str) -> ExtractedCFPData | None:
    if cache_key not in _cfp_extraction_cache:
        return None

    result, timestamp = _cfp_extraction_cache[cache_key]
    current_time = time.time()

    if current_time - timestamp > CFP_CACHE_TTL_SECONDS:
        del _cfp_extraction_cache[cache_key]
        return None

    return result


def _cache_cfp_result(cache_key: str, result: ExtractedCFPData) -> None:
    _cfp_extraction_cache[cache_key] = (result, time.time())


TEMPERATURE: Final[float] = 0.1

EXTRACT_CFP_DATA_SYSTEM_PROMPT: Final[str] = """
Extract structured requirements from funding announcements. Prioritize official CFP documents.
Return valid JSON only. Use "[UNCLEAR]" for ambiguous information. Avoid repetitive patterns.
"""

EXTRACT_CFP_DATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_cfp_data_multi_source",
    template="""
Extract structured CFP data from funding announcements.

## Input

<rag_sources>${rag_sources}</rag_sources>
<orgs>${organization_mapping}</orgs>

## Task

Each source includes NLP analysis (Money/Budget, Date/Time, Writing, Orders, Recommendations, Evaluation) to help locate information. Read all source content comprehensively - NLP is guidance, not replacement.

Extract four fields:
1. **org_id**: Match from organization mapping (null if not found)
2. **subject**: One-sentence funding opportunity summary (type, audience, focus)
3. **deadline**: Final submission deadline in YYYY-MM-DD (null if not found)
4. **content**: Section structure with titles and subtitles

## Requirements

- Max 50 subtitles per section
- Use "[UNCLEAR]" for ambiguous information
- Prioritize Date/Time categories for deadline extraction
- Use Orders/Writing categories for section structure
- Exclude: URLs, Grants.gov steps, addresses, admin details
    """,
)


async def get_rag_sources_data(source_ids: list[str], session_maker: async_sessionmaker[Any]) -> list[RagSourceData]:
    async with session_maker() as session:
        sources_result = await session.execute(
            select(RagSource.id, RagSource.source_type, RagSource.text_content)
            .where(RagSource.id.in_(source_ids))
            .where(RagSource.deleted_at.is_(None))
        )
        sources = sources_result.fetchall()

        chunks_result = await session.execute(
            select(TextVector.rag_source_id, TextVector.chunk)
            .where(TextVector.rag_source_id.in_(source_ids))
            .where(TextVector.deleted_at.is_(None))
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

        nlp_analysis = await categorize_text(text_content)
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


_ESCAPED_CRLF_PATTERN = re.compile(r"\\+r\\+n")
_ESCAPED_LF_PATTERN = re.compile(r"\\+n")
_ESCAPED_CR_PATTERN = re.compile(r"\\+r")
_REPETITIVE_PATTERN = re.compile(r"(.{1,10})\1{20,}")
_MULTIPLE_NEWLINES_PATTERN = re.compile(r"\n{3,}")
_MULTIPLE_SPACES_PATTERN = re.compile(r" {2,}")
_CONTROL_CHARS_PATTERN = re.compile(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_text_content(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    text = _ESCAPED_CRLF_PATTERN.sub("\n", text)
    text = _ESCAPED_LF_PATTERN.sub("\n", text)
    text = _ESCAPED_CR_PATTERN.sub("\n", text)
    repetitive_pattern = _REPETITIVE_PATTERN.search(text)
    if repetitive_pattern:
        start_pos = repetitive_pattern.start()
        logger.warning(
            "Detected repetitive pattern in text content",
            pattern=repetitive_pattern.group(1)[:20],
            original_length=len(text),
            truncated_length=start_pos,
        )
        text = text[:start_pos] + "\n[Content truncated due to repetitive pattern]"

    text = _MULTIPLE_NEWLINES_PATTERN.sub("\n\n", text)
    text = _MULTIPLE_SPACES_PATTERN.sub(" ", text)
    lines = text.split("\n")
    lines = [line.rstrip() for line in lines]
    text = "\n".join(lines)

    text = text.replace("\x00", "")
    text = _CONTROL_CHARS_PATTERN.sub("", text)

    return text.strip()


def format_rag_sources_for_prompt(rag_sources: list[RagSourceData]) -> str:
    formatted_sources = []

    for i, source in enumerate(rag_sources):
        source_section = f"### Source {i}: {source['source_type'].upper()} (ID: {source['source_id']})\n\n"

        nlp_analysis = source["nlp_analysis"]
        formatted_nlp = format_nlp_analysis_for_prompt(nlp_analysis)
        source_section += f"#### NLP Analysis:\n{formatted_nlp}\n\n"

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
        "org_id": {
            "type": "string",
            "nullable": True,
            "description": "UUID from org mapping, null if not found",
        },
        "subject": {
            "type": "string",
            "description": "One-sentence funding opportunity summary",
        },
        "content": {
            "type": "array",
            "description": "Section structure with titles and subtitles",
            "items": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "nullable": False,
                        "description": "Section title",
                    },
                    "subtitles": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,
                        "description": "Subsection titles or requirements",
                    },
                },
                "required": ["title", "subtitles"],
            },
        },
        "deadline": {
            "type": "string",
            "nullable": True,
            "description": "Submission deadline YYYY-MM-DD, null if not found",
        },
        "error": {
            "type": "string",
            "nullable": True,
            "description": "Error if extraction fails, null on success",
        },
    },
    "required": ["org_id", "subject", "content", "deadline"],
}


def validate_cfp_extraction(response: ExtractedCFPData) -> None:
    if not response["content"]:
        if error := response.get("error"):
            raise InsufficientContextError(
                error,
                context={
                    "subject": response.get("subject", ""),
                    "org_id": response.get("org_id"),
                    "recovery_instruction": "The CFP content appears to be insufficient or unclear. Try extracting more specific guidelines or requirements from all available sources.",
                },
            )
        raise ValidationError(
            "No content extracted from any source. Please provide an error message.",
            context={
                "subject": response.get("subject", ""),
                "org_id": response.get("org_id"),
                "recovery_instruction": "Extract at least 3-5 relevant guidelines or requirements from the available RAG sources, or provide a specific error message.",
            },
        )


async def extract_cfp_data_multi_source(task_description: str, trace_id: str, **_: Any) -> ExtractedCFPData:
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
        trace_id=trace_id,
    )


async def handle_extract_cfp_data(
    *,
    source_ids: list[str],
    organization_mapping: dict[str, dict[str, str]],
    session_maker: async_sessionmaker[Any],
    job_manager: "JobManager[ExtractCFPContentStageDTO]",
    trace_id: str,
) -> ExtractedCFPData:
    cache_key = _create_cache_key(source_ids, organization_mapping)
    cached_result = _get_cached_cfp_result(cache_key)
    if cached_result is not None:
        return cached_result

    rag_sources = await get_rag_sources_data(source_ids, session_maker)

    if not rag_sources:
        raise ValidationError("No RAG sources found for the provided IDs", context={"source_ids": source_ids})

    formatted_sources = format_rag_sources_for_prompt(rag_sources)

    result = await with_evaluation(
        prompt_identifier="extract_cfp_data_multi_source",
        prompt_handler=extract_cfp_data_multi_source,
        prompt=EXTRACT_CFP_DATA_USER_PROMPT.to_string(
            rag_sources=formatted_sources, organization_mapping=organization_mapping
        ),
        trace_id=trace_id,
        **get_evaluation_kwargs(
            "extract_cfp_data",
            job_manager,
            rag_context=formatted_sources,
            is_json_content=True,
        ),
    )

    result["full_text"] = formatted_sources

    _cache_cfp_result(cache_key, result)

    return result
