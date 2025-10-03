from collections import defaultdict
from typing import TYPE_CHECKING, Any, Final

from packages.db.src.tables import RagSource, TextVector
from packages.shared_utils.src.ai import REASONING_MODEL
from packages.shared_utils.src.dto import ExtractedCFPData
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.grant_template.category_extraction import categorize_text
from services.rag.src.grant_template.utils import RagSourceData, format_rag_sources_for_prompt, validate_cfp_extraction
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.prompt_template import PromptTemplate

if TYPE_CHECKING:
    from services.rag.src.grant_template.dto import ExtractCFPContentStageDTO
    from services.rag.src.utils.job_manager import JobManager


logger = get_logger(__name__)


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


# JSON schema for CFP data extraction
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
        "text": {
            "type": "string",
            "description": "Complete formatted source text used for extraction",
        },
        "error": {
            "type": "string",
            "nullable": True,
            "description": "Error if extraction fails, null on success",
        },
    },
    "required": ["org_id", "subject", "content", "deadline", "text"],
}


async def extract_cfp_data(task_description: str, *, trace_id: str) -> ExtractedCFPData:
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
    # Get RAG sources data inline
    async with session_maker() as session:
        # Get source metadata and content
        sources_result = await session.execute(
            select(RagSource.id, RagSource.source_type, RagSource.text_content)
            .where(RagSource.id.in_(source_ids))
            .where(RagSource.deleted_at.is_(None))
        )
        sources = sources_result.fetchall()

        # Get text chunks for all sources
        chunks_result = await session.execute(
            select(TextVector.rag_source_id, TextVector.chunk)
            .where(TextVector.rag_source_id.in_(source_ids))
            .where(TextVector.deleted_at.is_(None))
        )

        # Group chunks by source ID
        chunks_by_source: defaultdict[str, list[str]] = defaultdict(list)
        for source_id, chunk in chunks_result:
            chunk_content = chunk.get("content", "")
            if chunk_content:
                chunks_by_source[source_id].append(chunk_content)

    # Build rag sources data with NLP analysis
    rag_sources_data = []
    for source_id, source_type, source_text_content in sources:
        text_content = source_text_content or ""
        chunks = chunks_by_source.get(source_id, [])

        # Run NLP analysis on the full text content
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

    if not rag_sources_data:
        raise ValidationError("No RAG sources found for the provided IDs", context={"source_ids": source_ids})

    formatted_sources = format_rag_sources_for_prompt(rag_sources_data)

    result = await with_evaluation(
        prompt_identifier="extract_cfp_data_multi_source",
        prompt_handler=extract_cfp_data,
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

    result["text"] = formatted_sources

    return result
