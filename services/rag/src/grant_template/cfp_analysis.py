"""CFP analysis stage - comprehensive extraction, organization identification, and analysis."""

from collections import defaultdict
from typing import TYPE_CHECKING, Any, Final, NotRequired, TypedDict

from packages.db.src.json_objects import CFPAnalysis, OrganizationNamespace
from packages.db.src.tables import GrantTemplate, GrantTemplateSource, GrantingInstitution, RagSource, TextVector
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import InsufficientContextError, ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.grant_template.identify_organization import identify_granting_institution
from services.rag.src.grant_template.utils import RagSourceData, format_rag_sources_for_prompt
from services.rag.src.grant_template.utils.category_extraction import categorize_text
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.prompt_template import PromptTemplate

if TYPE_CHECKING:
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)

TEMPERATURE: Final[float] = 0.1

# System prompt following guidelines: concise, clear, professional tone
CFP_ANALYSIS_SYSTEM_PROMPT: Final[str] = """Extract structured requirements and analyze funding announcements.

Return valid JSON only. Use organization identification and comprehensive content extraction."""

# User prompt using PromptTemplate with proper indentation for dedent
CFP_ANALYSIS_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="cfp_analysis",
    template="""
    # CFP Analysis Task

    ## Sources
    <rag_sources>${rag_sources}</rag_sources>
    <organization_mapping>${organization_mapping}</organization_mapping>

    ## Task

    Extract comprehensive CFP data and perform requirements analysis:

    1. **Organization Identification**: Match from organization mapping
    2. **Content Extraction**: Extract section structure with titles and requirements
    3. **Requirements Analysis**: Identify categories, constraints, and metadata
    4. **Subject Analysis**: Create one-sentence funding opportunity summary

    ## Requirements

    - Max 50 subtitles per section
    - Use "[UNCLEAR]" for ambiguous information
    - Include submission deadline if found (YYYY-MM-DD format)
    - Analyze content for categories: Research, Budget, Team, Compliance, Other
    - Extract length constraints and requirements
    - Exclude: URLs, Grants.gov steps, addresses, admin details

    ## Analysis Categories

    Extract requirements by category:
    - **Research**: Scientific methodology, innovation, objectives
    - **Budget**: Funding amounts, justification, cost breakdown
    - **Team**: Personnel, qualifications, collaboration
    - **Compliance**: Ethics, regulations, reporting requirements
    - **Other**: Additional requirements not in above categories
    """,
)

# JSON schema following Google best practices: short property names, minimal nesting, strategic constraints
cfp_analysis_schema = {
    "type": "object",
    "properties": {
        "org_id": {
            "type": "string",
            "nullable": True,
            "description": "Organization UUID from mapping, null if not found",
        },
        "subject": {
            "type": "string",
            "description": "One-sentence funding opportunity summary",
        },
        "content": {
            "type": "array",
            "description": "Section structure with titles and subtitles",
            "minItems": 1,
            "maxItems": 50,
            "items": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Section title",
                    },
                    "subtitles": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,
                        "maxItems": 50,
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
        "analysis": {
            "type": "object",
            "description": "Requirements analysis by category",
            "properties": {
                "categories": {
                    "type": "array",
                    "description": "Requirement categories found",
                    "minItems": 1,
                    "maxItems": 10,
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "enum": ["Research", "Budget", "Team", "Compliance", "Other"],
                                "description": "Category name",
                            },
                            "count": {
                                "type": "integer",
                                "minimum": 1,
                                "description": "Number of requirements in category",
                            },
                            "examples": {
                                "type": "array",
                                "items": {"type": "string"},
                                "maxItems": 5,
                                "description": "Example requirements from category",
                            },
                        },
                        "required": ["name", "count", "examples"],
                    },
                },
                "constraints": {
                    "type": "array",
                    "description": "Length and formatting constraints",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": ["word_limit", "page_limit", "char_limit", "format"],
                                "description": "Constraint type",
                            },
                            "value": {
                                "type": "string",
                                "description": "Constraint value or description",
                            },
                            "section": {
                                "type": "string",
                                "nullable": True,
                                "description": "Specific section this applies to",
                            },
                        },
                        "required": ["type", "value"],
                    },
                },
                "metadata": {
                    "type": "object",
                    "description": "Analysis metadata",
                    "properties": {
                        "total_sections": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Total number of sections extracted",
                        },
                        "total_requirements": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Total number of requirements found",
                        },
                        "source_count": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Number of source documents analyzed",
                        },
                    },
                    "required": ["total_sections", "total_requirements", "source_count"],
                },
            },
            "required": ["categories", "constraints", "metadata"],
        },
        "error": {
            "type": "string",
            "nullable": True,
            "description": "Error message if analysis fails, null on success",
        },
    },
    "required": ["org_id", "subject", "content", "deadline", "analysis"],
}


class CFPAnalysisResult(TypedDict):
    """Result of comprehensive CFP analysis."""
    org_id: str | None
    subject: str
    content: list[dict[str, Any]]
    deadline: str | None
    analysis: dict[str, Any]
    error: NotRequired[str | None]


def validate_cfp_analysis(response: CFPAnalysisResult) -> None:
    """Validate CFP analysis response and raise appropriate errors if invalid.

    Args:
        response: CFP analysis result to validate

    Raises:
        InsufficientContextError: If CFP content is insufficient with recovery instructions
        ValidationError: If validation fails
    """
    if not response["content"]:
        if error := response.get("error"):
            raise InsufficientContextError(
                error,
                context={
                    "subject": response.get("subject", ""),
                    "org_id": response.get("org_id"),
                    "recovery_instruction": "The CFP content appears insufficient. Try extracting more specific guidelines from all sources.",
                },
            )
        raise ValidationError(
            "No content extracted from any source.",
            context={
                "subject": response.get("subject", ""),
                "org_id": response.get("org_id"),
                "recovery_instruction": "Extract at least 3-5 relevant guidelines or provide specific error message.",
            },
        )

    # Validate analysis structure
    analysis = response.get("analysis", {})
    if not analysis.get("categories"):
        raise ValidationError(
            "No requirement categories identified in CFP analysis.",
            context={
                "content_sections": len(response["content"]),
                "recovery_instruction": "Analyze content to identify Research, Budget, Team, Compliance, or Other requirements.",
            },
        )

    # Validate metadata consistency
    metadata = analysis.get("metadata", {})
    actual_sections = len(response["content"])
    if metadata.get("total_sections") != actual_sections:
        raise ValidationError(
            f"Metadata section count mismatch: expected {metadata.get('total_sections')}, got {actual_sections}",
            context={
                "actual_sections": actual_sections,
                "metadata_sections": metadata.get("total_sections"),
            },
        )


def validate_section_depth_constraint(sections: list[dict[str, Any]]) -> None:
    """Validate that sections satisfy 2-level depth constraint (parent + children only).

    Args:
        sections: List of CFPSection dictionaries

    Raises:
        ValidationError: If any section violates the 2-level depth constraint
    """
    # Build mapping of section_id -> section for quick lookup
    section_map: dict[str, dict[str, Any]] = {section["id"]: section for section in sections}

    # Check each section
    for section in sections:
        parent_id = section.get("parent_id")

        # Skip root sections (no parent)
        if not parent_id:
            continue

        # Check if parent exists
        if parent_id not in section_map:
            raise ValidationError(
                f"Section '{section['title']}' references non-existent parent_id: {parent_id}",
                context={
                    "section_id": section["id"],
                    "section_title": section["title"],
                    "invalid_parent_id": parent_id,
                    "recovery_instruction": "Ensure all parent_id references point to existing sections.",
                },
            )

        # Check if parent itself has a parent (would violate 2-level constraint)
        parent_section = section_map[parent_id]
        if parent_section.get("parent_id"):
            raise ValidationError(
                f"Section '{section['title']}' has grandparent (violates 2-level depth constraint). "
                f"Parent '{parent_section['title']}' has parent_id: {parent_section['parent_id']}",
                context={
                    "section_id": section["id"],
                    "section_title": section["title"],
                    "parent_id": parent_id,
                    "parent_title": parent_section["title"],
                    "grandparent_id": parent_section["parent_id"],
                    "recovery_instruction": "Flatten or merge sections to satisfy 2-level depth constraint (root + children only).",
                },
            )


async def extract_cfp_analysis(
    task_description: str,
    *,
    trace_id: str,
) -> CFPAnalysisResult:
    """Extract and analyze CFP data using LLM.

    Args:
        task_description: Formatted prompt with RAG sources and organization mapping
        trace_id: Trace ID for logging

    Returns:
        CFPAnalysisResult with comprehensive analysis
    """
    return await handle_completions_request(
        prompt_identifier="cfp_analysis",
        response_type=CFPAnalysisResult,
        response_schema=cfp_analysis_schema,
        validator=validate_cfp_analysis,
        messages=task_description,
        system_prompt=CFP_ANALYSIS_SYSTEM_PROMPT,
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


async def handle_cfp_analysis(
    *,
    grant_template: GrantTemplate,
    session_maker: async_sessionmaker[Any],
    job_manager: "JobManager[Any]",
    trace_id: str,
) -> CFPAnalysis:
    """Handle comprehensive CFP analysis stage.

    Combines extraction, organization identification, and requirements analysis
    into a single comprehensive operation.

    Args:
        grant_template: Grant template to analyze
        session_maker: Database session factory
        job_manager: Job manager for progress tracking
        trace_id: Trace ID for logging

    Returns:
        CFPAnalysis with complete analysis results
    """
    await job_manager.ensure_not_cancelled()

    logger.info("Starting comprehensive CFP analysis", trace_id=trace_id)

    # Get RAG sources and prepare data
    async with session_maker() as session:
        # Get source IDs for this grant template
        source_ids = list(
            await session.scalars(
                select(RagSource.id)
                .join(GrantTemplateSource, RagSource.id == GrantTemplateSource.rag_source_id)
                .where(GrantTemplateSource.grant_template_id == grant_template.id)
                .where(RagSource.indexing_status == "FINISHED")
                .where(RagSource.deleted_at.is_(None))
            )
        )

        if not source_ids:
            raise ValidationError(
                "No finished RAG sources found for grant template",
                context={"grant_template_id": str(grant_template.id)},
            )

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
        for row in chunks_result:
            chunk_content = row.chunk.get("content", "") if isinstance(row.chunk, dict) else str(row.chunk)
            chunks_by_source[str(row.rag_source_id)].append(chunk_content)

        # Get all granting institutions for organization mapping
        institutions = list(await session.scalars(select(GrantingInstitution)))

        organization_mapping = {
            str(org.id): {
                "full_name": org.full_name,
                "abbreviation": org.abbreviation or "",
            }
            for org in institutions
        }

    await job_manager.ensure_not_cancelled()

    # Prepare RAG sources data with NLP analysis
    rag_sources: list[RagSourceData] = []
    for source in sources:
        source_id = str(source.id)
        text_content = source.text_content or ""
        chunks = chunks_by_source.get(source_id, [])

        # Perform NLP categorization
        nlp_analysis = await categorize_text(text_content, trace_id=trace_id)

        rag_sources.append(
            RagSourceData(
                source_id=source_id,
                source_type=source.source_type,
                text_content=text_content,
                chunks=chunks,
                nlp_analysis=nlp_analysis,
            )
        )

    await job_manager.ensure_not_cancelled()

    # Format prompt with RAG sources and organization mapping
    formatted_sources = format_rag_sources_for_prompt(rag_sources)
    formatted_org_mapping = "\n".join(
        f"- {org_id}: {data['full_name']} ({data['abbreviation']})" if data['abbreviation']
        else f"- {org_id}: {data['full_name']}"
        for org_id, data in organization_mapping.items()
    )

    task_description = CFP_ANALYSIS_USER_PROMPT.format(
        rag_sources=formatted_sources,
        organization_mapping=formatted_org_mapping,
    )

    # Extract and analyze CFP data
    with_evaluation_decorator = with_evaluation(**get_evaluation_kwargs("cfp_analysis"))
    extract_with_eval = with_evaluation_decorator(extract_cfp_analysis)

    extraction_result = await extract_with_eval(
        task_description=task_description,
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    # Perform organization identification if not found in extraction
    if not extraction_result["org_id"]:
        logger.info("Organization not identified in extraction, using hybrid identification", trace_id=trace_id)

        # Combine all text content for organization identification
        full_cfp_text = "\n\n".join(source.text_content for source in sources if source.text_content)

        org_id, confidence, method = await identify_granting_institution(
            cfp_text=full_cfp_text,
            session_maker=session_maker,
            trace_id=trace_id,
        )

        if org_id and confidence >= 0.85:
            extraction_result["org_id"] = org_id
            logger.info(
                "Organization identified via hybrid method",
                org_id=org_id,
                confidence=confidence,
                method=method,
                trace_id=trace_id,
            )

    # Convert to CFPAnalysis format
    organization = None
    if extraction_result["org_id"]:
        org_data = organization_mapping.get(extraction_result["org_id"])
        if org_data:
            organization = OrganizationNamespace(
                id=extraction_result["org_id"],
                abbreviation=org_data["abbreviation"],
                full_name=org_data["full_name"],
            )

    cfp_analysis = CFPAnalysis(
        subject=extraction_result["subject"],
        content=extraction_result["content"],
        deadline=extraction_result["deadline"],
        org_id=extraction_result["org_id"],
        analysis_metadata=extraction_result["analysis"],
        organization=organization,
    )

    logger.info(
        "CFP analysis completed successfully",
        sections_count=len(extraction_result["content"]),
        org_id=extraction_result["org_id"],
        has_deadline=bool(extraction_result["deadline"]),
        categories_found=len(extraction_result["analysis"]["categories"]),
        trace_id=trace_id,
    )

    return cfp_analysis