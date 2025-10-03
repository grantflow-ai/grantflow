"""CFP analysis stage - comprehensive extraction, organization identification, and analysis."""

import asyncio
from collections import defaultdict
from typing import TYPE_CHECKING, Any, Final, TypedDict, cast

from packages.db.src.json_objects import CFPAnalysis, CFPAnalysisData, CFPContentSection, OrganizationNamespace
from packages.db.src.tables import GrantingInstitution, GrantTemplate, GrantTemplateSource, RagSource, TextVector
from packages.shared_utils.src.ai import GEMINI_FLASH_MODEL
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.grant_template.identify_organization import identify_granting_institution
from services.rag.src.grant_template.utils import RagSourceData, format_rag_sources_for_prompt
from services.rag.src.grant_template.utils.category_extraction import categorize_text
from services.rag.src.utils.completion import handle_completions_request
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

# Parallel extraction schemas - focused, minimal schemas for each extraction task

# 1. CFP metadata extraction
cfp_metadata_schema = {
    "type": "object",
    "properties": {
        "org_id": {"type": "string", "nullable": True},
        "subject": {"type": "string"},
        "deadline": {"type": "string", "nullable": True},
    },
    "required": ["subject"],
}

# 2. Content structure extraction
cfp_content_schema = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "subtitles": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "subtitles"],
            },
        },
    },
    "required": ["sections"],
}

# 3. Category analysis extraction
cfp_categories_schema = {
    "type": "object",
    "properties": {
        "categories": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "count": {"type": "integer"},
                    "examples": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["name", "count"],
            },
        },
    },
    "required": ["categories"],
}

# 4. Constraint extraction
cfp_constraints_schema = {
    "type": "object",
    "properties": {
        "constraints": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string"},
                    "value": {"type": "string"},
                    "section": {"type": "string", "nullable": True},
                },
                "required": ["type", "value"],
            },
        },
    },
    "required": ["constraints"],
}


# Result types for parallel extractions

class CFPMetadataResult(TypedDict):
    """CFP metadata extraction result."""
    org_id: str | None
    subject: str
    deadline: str | None


class CFPContentResult(TypedDict):
    """CFP content structure extraction result."""
    sections: list[dict[str, Any]]


class CFPCategoriesResult(TypedDict):
    """CFP category analysis extraction result."""
    categories: list[dict[str, Any]]


class CFPConstraintsResult(TypedDict):
    """CFP constraint extraction result."""
    constraints: list[dict[str, Any]]


# Validators for parallel extractions

def validate_cfp_metadata(response: CFPMetadataResult) -> None:
    """Validate CFP metadata extraction."""
    if not response.get("subject"):
        raise ValidationError("No subject extracted from CFP")


def validate_cfp_content(response: CFPContentResult) -> None:
    """Validate CFP content extraction."""
    if not response.get("sections"):
        raise ValidationError("No content sections extracted from CFP")


def validate_cfp_categories(response: CFPCategoriesResult) -> None:
    """Validate CFP category analysis."""
    if not response.get("categories"):
        raise ValidationError("No requirement categories identified")


def validate_cfp_constraints(response: CFPConstraintsResult) -> None:
    """Validate CFP constraint extraction - ensure constraint types are valid."""
    if not response.get("constraints"):
        # Empty constraints is valid - not all CFPs have explicit limits
        return

    # Valid constraint types for grant applications
    valid_constraint_types = {
        "word_limit",
        "page_limit",
        "char_limit",
        "character_limit",
        "format",
        "font",
        "spacing",
        "margin",
        "length",
        "size",
    }

    invalid_constraints = []
    for idx, constraint in enumerate(response["constraints"]):
        constraint_type = constraint.get("type", "").lower().replace(" ", "_")
        if constraint_type and constraint_type not in valid_constraint_types:
            invalid_constraints.append({
                "index": idx,
                "type": constraint.get("type"),
                "value": constraint.get("value"),
            })

    if invalid_constraints:
        raise ValidationError(
            "Invalid constraint types found in CFP constraints",
            context={
                "invalid_constraints": invalid_constraints,
                "valid_types": sorted(valid_constraint_types),
                "recovery_instruction": f"Ensure constraint types are one of: {', '.join(sorted(valid_constraint_types))}",
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


# Parallel extraction functions - focused, minimal LLM calls

async def extract_cfp_metadata(
    task_description: str,
    *,
    trace_id: str,
) -> CFPMetadataResult:
    """Extract CFP metadata: org_id, subject, deadline."""
    return await handle_completions_request(
        prompt_identifier="cfp_metadata",
        response_type=CFPMetadataResult,
        response_schema=cfp_metadata_schema,
        validator=validate_cfp_metadata,
        messages=task_description,
        system_prompt="Extract organization ID, subject summary, and deadline from CFP. Return valid JSON only.",
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


# Multi-strategy content extraction functions

async def extract_cfp_content_broad(
    task_description: str,
    *,
    trace_id: str,
) -> CFPContentResult:
    """Extract broad organizational sections (5-10 major units)."""
    return await handle_completions_request(
        prompt_identifier="cfp_content_broad",
        response_type=CFPContentResult,
        response_schema=cfp_content_schema,
        validator=validate_cfp_content,
        messages=task_description,
        system_prompt="Extract major organizational sections from CFP. Focus on high-level categories: Awards, Eligibility, Requirements, Budget, Process, Review. Target 5-10 broad sections. Return valid JSON only.",
        temperature=0.1,  # Low variance for consistency
        model=GEMINI_FLASH_MODEL,
        top_p=0.8,
        trace_id=trace_id,
    )


async def extract_cfp_content_detailed(
    task_description: str,
    *,
    trace_id: str,
) -> CFPContentResult:
    """Extract comprehensive detailed sections (12-20 specific units)."""
    return await handle_completions_request(
        prompt_identifier="cfp_content_detailed",
        response_type=CFPContentResult,
        response_schema=cfp_content_schema,
        validator=validate_cfp_content,
        messages=task_description,
        system_prompt="Extract comprehensive detailed sections from CFP. Break down into specific categories: each award type, eligibility criteria, budget requirements, application components, deadlines, review process, terms. Target 12-20 detailed sections. Return valid JSON only.",
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.8,
        trace_id=trace_id,
    )


async def extract_cfp_content_hierarchical(
    task_description: str,
    *,
    trace_id: str,
) -> CFPContentResult:
    """Extract structured hierarchical sections (category → subsections)."""
    return await handle_completions_request(
        prompt_identifier="cfp_content_hierarchical",
        response_type=CFPContentResult,
        response_schema=cfp_content_schema,
        validator=validate_cfp_content,
        messages=task_description,
        system_prompt="Extract structured hierarchical sections from CFP. Organize into logical categories (Awards, Eligibility, Application Requirements, Budget, Submission Process, Review) and break each into relevant subsections. Maintain clear 2-level structure. Return valid JSON only.",
        temperature=0.1,
        model=GEMINI_FLASH_MODEL,
        top_p=0.8,
        trace_id=trace_id,
    )


# Consensus merge and validation functions

def calculate_section_similarity(section1: dict[str, Any], section2: dict[str, Any]) -> float:
    """Calculate semantic similarity between two sections based on titles."""
    title1 = section1["title"].lower()
    title2 = section2["title"].lower()

    # Simple overlap-based similarity
    words1 = set(title1.split())
    words2 = set(title2.split())

    if not words1 and not words2:
        return 1.0
    if not words1 or not words2:
        return 0.0

    intersection = words1.intersection(words2)
    union = words1.union(words2)

    return len(intersection) / len(union)


def merge_similar_sections(sections: list[dict[str, Any]], similarity_threshold: float = 0.6) -> list[dict[str, Any]]:
    """Merge sections with similar titles, combining their subtitles."""
    merged = []
    used_indices = set()

    for i, section in enumerate(sections):
        if i in used_indices:
            continue

        merged_section = {
            "title": section["title"],
            "subtitles": list(section["subtitles"])  # Copy to avoid mutation
        }
        used_indices.add(i)

        # Find similar sections to merge
        for j, other_section in enumerate(sections[i + 1:], i + 1):
            if j in used_indices:
                continue

            similarity = calculate_section_similarity(section, other_section)
            if similarity >= similarity_threshold:
                # Merge subtitles, removing duplicates
                existing_subtitles = set(merged_section["subtitles"])
                for subtitle in other_section["subtitles"]:
                    if subtitle not in existing_subtitles:
                        merged_section["subtitles"].append(subtitle)
                        existing_subtitles.add(subtitle)
                used_indices.add(j)

        merged.append(merged_section)

    return merged


def validate_semantic_completeness(result: CFPContentResult) -> dict[str, Any]:
    """Validate that essential CFP concepts are covered in the extraction."""
    sections = result["sections"]
    all_text = " ".join([
        section["title"] + " " + " ".join(section["subtitles"])
        for section in sections
    ]).lower()

    # Essential CFP concepts to check for
    concept_patterns = {
        "funding": ["fund", "budget", "cost", "money", "dollar", "award", "grant"],
        "eligibility": ["eligible", "qualify", "requirement", "criteria", "must", "should"],
        "application": ["apply", "submit", "proposal", "application", "deadline", "due"],
        "awards": ["award", "grant", "prize", "funding", "opportunity"],
        "process": ["process", "review", "evaluation", "selection", "timeline"],
        "requirements": ["require", "needed", "necessary", "mandatory", "document"]
    }

    coverage = {}
    for concept, patterns in concept_patterns.items():
        found = any(pattern in all_text for pattern in patterns)
        coverage[concept] = found

    coverage_score = sum(coverage.values()) / len(coverage.values())

    return {
        "coverage_score": coverage_score,
        "coverage_details": coverage,
        "total_sections": len(sections),
        "total_subtitles": sum(len(section["subtitles"]) for section in sections),
        "avg_subtitles_per_section": sum(len(section["subtitles"]) for section in sections) / len(sections) if sections else 0,
    }


def merge_cfp_extractions(
    broad: CFPContentResult,
    detailed: CFPContentResult,
    hierarchical: CFPContentResult,
) -> tuple[CFPContentResult, dict[str, Any]]:
    """Intelligently merge three extraction strategies into comprehensive result."""

    # Combine all sections from all three strategies
    all_sections = []
    all_sections.extend(broad["sections"])
    all_sections.extend(detailed["sections"])
    all_sections.extend(hierarchical["sections"])

    # Merge similar sections and deduplicate
    merged_sections = merge_similar_sections(all_sections, similarity_threshold=0.6)

    # Create merged result
    merged_result = CFPContentResult(sections=merged_sections)

    # Validate semantic completeness
    quality_metrics = validate_semantic_completeness(merged_result)

    # Add strategy info to metrics
    quality_metrics["strategy_counts"] = {
        "broad": len(broad["sections"]),
        "detailed": len(detailed["sections"]),
        "hierarchical": len(hierarchical["sections"]),
        "merged": len(merged_sections),
    }

    return merged_result, quality_metrics


async def extract_cfp_categories(
    task_description: str,
    *,
    trace_id: str,
) -> CFPCategoriesResult:
    """Extract CFP requirement categories with examples."""
    return await handle_completions_request(
        prompt_identifier="cfp_categories",
        response_type=CFPCategoriesResult,
        response_schema=cfp_categories_schema,
        validator=validate_cfp_categories,
        messages=task_description,
        system_prompt="Analyze CFP to identify requirement categories (Research, Budget, Team, Compliance, Other) with counts and examples. Return valid JSON only.",
        temperature=TEMPERATURE,
        model=GEMINI_FLASH_MODEL,
        top_p=0.9,
        trace_id=trace_id,
    )


async def extract_cfp_constraints(
    task_description: str,
    *,
    trace_id: str,
) -> CFPConstraintsResult:
    """Extract CFP length and formatting constraints."""
    return await handle_completions_request(
        prompt_identifier="cfp_constraints",
        response_type=CFPConstraintsResult,
        response_schema=cfp_constraints_schema,
        validator=validate_cfp_constraints,
        messages=task_description,
        system_prompt="Extract length limits (word/page/char) and formatting requirements from CFP. Return valid JSON only.",
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
        nlp_analysis = await categorize_text(text_content)

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
        f"- {org_id}: {data['full_name']} ({data['abbreviation']})" if data["abbreviation"]
        else f"- {org_id}: {data['full_name']}"
        for org_id, data in organization_mapping.items()
    )

    task_description = cast("str", CFP_ANALYSIS_USER_PROMPT.substitute(
        rag_sources=formatted_sources,
        organization_mapping=formatted_org_mapping,
    ))

    # Execute parallel extractions with multi-strategy consensus approach
    logger.info("Starting multi-strategy CFP extractions", trace_id=trace_id)

    # Extract metadata, categories, and constraints in parallel (these are stable)
    # Also extract content using three different strategies for consensus
    (
        metadata_result,
        categories_result,
        constraints_result,
        content_broad,
        content_detailed,
        content_hierarchical,
    ) = await asyncio.gather(
        extract_cfp_metadata(task_description, trace_id=trace_id),
        extract_cfp_categories(task_description, trace_id=trace_id),
        extract_cfp_constraints(task_description, trace_id=trace_id),
        extract_cfp_content_broad(task_description, trace_id=trace_id),
        extract_cfp_content_detailed(task_description, trace_id=trace_id),
        extract_cfp_content_hierarchical(task_description, trace_id=trace_id),
    )

    await job_manager.ensure_not_cancelled()

    # Merge the three content extraction strategies using consensus
    logger.info("Merging multi-strategy content extractions", trace_id=trace_id)
    content_result, quality_metrics = merge_cfp_extractions(
        content_broad,
        content_detailed,
        content_hierarchical,
    )

    logger.info(
        "Multi-strategy extraction completed",
        quality_metrics=quality_metrics,
        trace_id=trace_id,
    )

    await job_manager.ensure_not_cancelled()

    # Perform organization identification if not found in extraction
    org_id = metadata_result["org_id"]
    if not org_id:
        logger.info("Organization not identified in extraction, using hybrid identification", trace_id=trace_id)

        # Combine all text content for organization identification
        full_cfp_text = "\n\n".join(source.text_content for source in sources if source.text_content)

        org_id, confidence, method = await identify_granting_institution(
            cfp_text=full_cfp_text,
            session_maker=session_maker,
            trace_id=trace_id,
        )

        # Validate confidence score is in valid range
        if confidence < 0.0 or confidence > 1.0:
            raise ValidationError(
                "Organization identification confidence out of valid range",
                context={
                    "confidence": confidence,
                    "valid_range": "[0.0, 1.0]",
                    "org_id": org_id,
                    "method": method,
                    "recovery_instruction": "Ensure confidence score is between 0.0 and 1.0",
                },
            )

        # Warn if organization identified with low confidence
        if org_id and confidence < 0.5:
            logger.warning(
                "Organization identified with low confidence",
                org_id=org_id,
                confidence=confidence,
                method=method,
                trace_id=trace_id,
            )

        if org_id and confidence >= 0.85:
            logger.info(
                "Organization identified via hybrid method",
                org_id=org_id,
                confidence=confidence,
                method=method,
                trace_id=trace_id,
            )

    # Build analysis metadata
    total_sections = len(content_result["sections"])
    total_requirements = sum(cat["count"] for cat in categories_result["categories"])
    source_count = len(rag_sources)

    analysis_metadata = {
        "categories": categories_result["categories"],
        "constraints": constraints_result["constraints"],
        "metadata": {
            "total_sections": total_sections,
            "total_requirements": total_requirements,
            "source_count": source_count,
        },
    }

    # Convert to CFPAnalysis format
    organization = None
    if org_id:
        org_data = organization_mapping.get(org_id)
        if org_data:
            organization = OrganizationNamespace(
                id=org_id,
                abbreviation=org_data["abbreviation"],
                full_name=org_data["full_name"],
            )

    cfp_analysis = CFPAnalysis(
        subject=metadata_result["subject"],
        content=cast("list[CFPContentSection]", content_result["sections"]),
        deadline=metadata_result["deadline"],
        org_id=org_id,
        analysis_metadata=cast("CFPAnalysisData", analysis_metadata),
        organization=organization,
    )

    logger.info(
        "CFP analysis completed successfully",
        sections_count=total_sections,
        org_id=org_id,
        has_deadline=bool(metadata_result["deadline"]),
        categories_found=len(categories_result["categories"]),
        trace_id=trace_id,
    )

    return cfp_analysis
