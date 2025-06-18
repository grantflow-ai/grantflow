import re
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


TEMPERATURE: Final[float] = 0.2

EXTRACT_CFP_DATA_SYSTEM_PROMPT: Final[str] = """
You are a specialized system designed to analyze and extract information from STEM funding opportunity announcements (CFPs).
Your primary goal is to maintain the structural integrity of the CFP while extracting all relevant requirements and guidelines.
Focus on preserving the hierarchical organization and explicit requirements of the document.

You will be working with content from multiple sources including:
- Direct CFP documents (PDFs, Word docs)
- Crawled website content
- Related funding organization materials

Synthesize information from all sources while prioritizing official CFP documents over supplementary materials.
"""

EXTRACT_CFP_DATA_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="extract_cfp_data_multi_source",
    template="""
    # CFP Data Extraction from Multiple Sources

    Your task is to analyze and extract the most relevant application guidelines and requirements from multiple funding opportunity sources while maintaining structural integrity:

    ## Sources

    ### Primary CFP Content
    The following content comes from multiple RAG sources (files and URLs) related to this funding opportunity:

    <rag_sources>
    ${rag_sources}
    </rag_sources>

    ### Organization Mapping
    The following JSON object maps organization IDs (in our database) to their names and abbreviations:

    <organization_mapping>
    ${organization_mapping}
    </organization_mapping>

    ## Source Prioritization:
    1. **Primary Sources**: Official CFP documents, announcements, and guidelines
    2. **Secondary Sources**: Organization websites, supplementary materials
    3. **Supporting Sources**: Related documents and contextual information

    When conflicts arise between sources, prioritize official CFP documents over website content.

    ## Extraction Steps:

    1. **Determine Organization**
       - Identify which organization, if any, from the provided **organization mapping** the CFP announcement belongs to.
       - Cross-reference across all sources for consistency.
       - If an explicit mention is found, return the corresponding organization ID.
       - If no match is found, return `null` for `organization_id`.

    2. **Content Synthesis**
       - Combine information from all sources to create a comprehensive view
       - Resolve conflicts by prioritizing official CFP documents
       - Ensure no critical requirements are missed due to information being split across sources

    3. **Formatting Requirements**
       - Extract all explicit formatting requirements from any source including:
         - Font specifications (type, size)
         - Margin requirements
         - Line spacing rules
         - Page limits and exclusions
       - Present these as separate, clear statements

    4. **Structural Analysis**
       - Identify and preserve the hierarchical structure of the CFP across all sources
       - Merge section information when complementary
       - For each section:
         - Include the full section title with page limits (if specified)
         - Add "- Title only" for main sections
         - Include subsection titles without "- Title only"
         - Subsection: Do not include description of the section, only the title summarized to highlight the main topic of the section
       - Maintain the exact numbering scheme (e.g., "1a.i", "1b.ii")
       - Preserve the original section order

    5. **Requirements Extraction**
       - Extract all explicit requirements from all sources including:
         - Character limits (e.g., for abstracts)
         - Language requirements
         - Content restrictions
         - Supporting documentation needs
       - Present these as clear, concise, grouped statements
       - Ensure completeness by checking all sources

    6. **CFP Subject Identification**
       - Generate a comprehensive summary using information from all sources that captures:
         - The type of funding opportunity
         - The target audience/researchers
         - The key objectives and expected outcomes
         - The scope and scale of the project
         - Any specific focus areas or themes
       - Ensure the summary is rich in domain-specific details

    7. **Administrative Details Filtering**
       - Aggressively remove any content that does not directly impact submission format or requirements
       - Retain only **application-related** details that impact **submission format**.
       - **Exclude** general grant submission instructions (e.g., Grants.gov steps, eRA Commons login).
       - URLs and external references.
       - Forms, addresses, bureaucratic details etc.

    8. **Submission Date Extraction**
       - Check all sources for submission deadlines
       - Identify the final full application submission deadline explicitly mentioned in any CFP content.
       - Only extract a date if it specifies a day, month, and year (no vague dates like "July 2025").
       - If multiple dates are mentioned across sources:
         - Prefer the earliest final submission deadline for application submission (not internal reviews, LOIs, drafts, etc.).
         - Ensure consistency across sources
       - Accept dates in any format (e.g., "July 1, 2025", "07/01/2025", "2025-07-01"), but standardize the output to the YYYY-MM-DD format.
       - If no explicit submission date is found, return null.

    ## Output Format:
    ```jsonc
    {
        "organization_id": "UUID from mapping", // null if not found
        "content": [
            {"title": "Formatting requirement", "content": ["requirement 1", "requirement 2"]},
            {"title": "Section title", "content": ["Subsection 1", "Subsection 2"]},
            {"Explicit requirement": "Section title", "content": ["requirement 1", "requirement 2"]},
            {"Supporting documentation requirement": "Section title", "content": ["requirement 1", "requirement 2"]},
        ],
        "cfp_subject": "...", // can be empty if error
        "submission_date": "2025-04-26", // null if not found
        "error": null // or error message if extraction fails
    }
    ```

    ## Guidelines - Do NOT skip any step:
    - Synthesize information from all available sources
    - Preserve the exact hierarchical structure of the CFP
    - Include, summarize, and **group** all explicit requirements and constraints while representing each requirement as a separate, clear statement
    - Maintain section relationships and dependencies
    - For each section title add "- Title only" if it is a main section
    - Keep section and subsection names unchanged
    - Section are not to be divided into multiple sections
    - **Important**: For each section extract subsections and present each in a single, clear statement
    - Ensure the extracted content is machine-processable while maintaining readability
    - **Important**: Remove only truly administrative details (URL, reference)
    - The core meaning MUST be maintained and no other information should be added or removed
    - Skip repeated escape sequences in your output (such as \n or \r)
    - If there is content in a language other than English, make sure to translate it to English before processing the input
    - When sources conflict, prioritize official CFP documents over supplementary materials
    """,
)


async def get_rag_sources_data(source_ids: list[str], session_maker: async_sessionmaker[Any]) -> list[RagSourceData]:
    """
    Retrieve text content and chunks from multiple RAG sources.

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
            chunks_by_source[source_id].append(chunk_content)

    rag_sources_data = []
    for source_id, source_type, text_content in sources:
        rag_sources_data.append(
            RagSourceData(
                source_id=str(source_id),
                source_type=source_type,
                text_content=text_content or "",
                chunks=chunks_by_source.get(source_id, []),
            )
        )

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
        "organization_id": {"type": "string", "nullable": True},
        "cfp_subject": {"type": "string"},
        "content": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "nullable": False},
                    "subtitles": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                },
                "required": ["title", "subtitles"],
            },
        },
        "submission_date": {"type": "string", "nullable": True},
        "error": {"type": "string", "nullable": True},
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
        top_p=0.95,
    )


async def handle_extract_cfp_data_from_rag_sources(
    *, source_ids: list[str], organization_mapping: dict[str, dict[str, str]], session_maker: async_sessionmaker[Any]
) -> ExtractedCFPData:
    """
    Extract CFP data from multiple RAG sources (files and URLs).

    Args:
        source_ids: List of RAG source IDs to use for extraction
        organization_mapping: Mapping of organization IDs to names/abbreviations
        session_maker: Database session maker

    Returns:
        Extracted CFP data synthesized from all sources
    """
    rag_sources = await get_rag_sources_data(source_ids, session_maker)

    if not rag_sources:
        raise ValidationError("No RAG sources found for the provided IDs", context={"source_ids": source_ids})

    formatted_sources = format_rag_sources_for_prompt(rag_sources)

    logger.info(
        "Extracting CFP data from multiple sources",
        source_count=len(rag_sources),
        source_types=[s["source_type"] for s in rag_sources],
    )

    return await with_prompt_evaluation(
        prompt_identifier="extract_cfp_data_multi_source",
        prompt_handler=extract_cfp_data_multi_source,
        prompt=EXTRACT_CFP_DATA_USER_PROMPT.to_string(
            rag_sources=formatted_sources, organization_mapping=organization_mapping
        ),
        increment=5,
        retries=5,
        passing_score=90,
        criteria=[
            EvaluationCriterion(
                name="Multi-Source Synthesis",
                evaluation_instructions="""
                Assess whether information from all available sources has been properly synthesized and conflicts resolved appropriately.
                """,
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
            ),
            EvaluationCriterion(
                name="Filtering Accuracy",
                evaluation_instructions="""
                Validate that unnecessary general instructions (e.g., Grants.gov, eRA Commons, URLs) are removed while keeping essential information from all sources.
                """,
            ),
        ],
    )
