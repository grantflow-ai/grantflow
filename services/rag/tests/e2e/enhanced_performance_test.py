"""Enhanced performance and quality test for grant template generation."""

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from packages.shared_utils.src.serialization import serialize
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_template.determine_application_sections import handle_extract_sections
from services.rag.src.grant_template.determine_longform_metadata import handle_generate_grant_template
from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from services.rag.tests.e2e.utils import create_rag_sources_from_cfp_file


def analyze_extraction_quality(cfp_data: dict[str, Any]) -> dict[str, Any]:
    """Analyze the quality of CFP extraction."""
    content_items = cfp_data.get("content", [])

    quality_metrics = {
        "content_count": len(content_items),
        "has_organization": bool(cfp_data.get("organization_id")),
        "avg_subtitles_per_item": (
            sum(len(item.get("subtitles", [])) for item in content_items) / len(content_items)
            if content_items else 0
        ),
        "empty_titles": sum(1 for item in content_items if not item.get("title", "").strip()),
        "cfp_subject_length": len(cfp_data.get("cfp_subject", "")),
    }

    # Quality scores (0-100)
    scores = {
        "content_richness": min(100, len(content_items) * 10),  # More content is better
        "subtitle_depth": min(100, quality_metrics["avg_subtitles_per_item"] * 25),  # 4+ subtitles = 100
        "completeness": 100 if quality_metrics["empty_titles"] == 0 else 80,
        "organization_detection": 100 if quality_metrics["has_organization"] else 0,
    }

    quality_metrics["overall_score"] = sum(scores.values()) / len(scores)
    quality_metrics["scores"] = scores

    return quality_metrics


def analyze_section_quality(sections: list[dict[str, Any]]) -> dict[str, Any]:
    """Analyze the quality of extracted sections."""
    long_form_sections = [s for s in sections if s.get("is_long_form")]
    research_sections = [s for s in sections if s.get("is_detailed_research_plan")]

    quality_metrics = {
        "total_sections": len(sections),
        "long_form_sections": len(long_form_sections),
        "research_plan_sections": len(research_sections),
        "title_only_sections": sum(1 for s in sections if s.get("is_title_only")),
        "nested_sections": sum(1 for s in sections if s.get("parent_id")),
        "clinical_trial_sections": sum(1 for s in sections if s.get("is_clinical_trial")),
    }

    # Quality scores
    scores = {
        "structure_complexity": min(100, quality_metrics["nested_sections"] * 20),  # Nested = good structure
        "content_depth": min(100, (len(long_form_sections) / len(sections)) * 100) if sections else 0,
        "research_focus": 100 if quality_metrics["research_plan_sections"] > 0 else 50,
        "section_count": min(100, len(sections) * 10),  # 10+ sections = 100
    }

    quality_metrics["overall_score"] = sum(scores.values()) / len(scores)
    quality_metrics["scores"] = scores

    return quality_metrics


def analyze_metadata_quality(metadata: list[dict[str, Any]]) -> dict[str, Any]:
    """Analyze the quality of generated metadata."""
    quality_metrics = {
        "metadata_count": len(metadata),
        "avg_keywords": sum(len(m.get("keywords", [])) for m in metadata) / len(metadata) if metadata else 0,
        "avg_topics": sum(len(m.get("topics", [])) for m in metadata) / len(metadata) if metadata else 0,
        "avg_search_queries": sum(len(m.get("search_queries", [])) for m in metadata) / len(metadata) if metadata else 0,
        "avg_instruction_length": sum(len(m.get("generation_instructions", "")) for m in metadata) / len(metadata) if metadata else 0,
        "total_word_allocation": sum(m.get("max_words", 0) for m in metadata),
        "has_dependencies": sum(1 for m in metadata if m.get("depends_on")),
    }

    # Quality scores
    scores = {
        "keyword_richness": min(100, quality_metrics["avg_keywords"] * 10),  # 10+ keywords = 100
        "topic_coverage": min(100, quality_metrics["avg_topics"] * 20),  # 5+ topics = 100
        "search_guidance": min(100, quality_metrics["avg_search_queries"] * 20),  # 5+ queries = 100
        "instruction_detail": min(100, quality_metrics["avg_instruction_length"] / 5),  # 500+ chars = 100
        "dependency_structure": min(100, (quality_metrics["has_dependencies"] / len(metadata)) * 200) if metadata else 0,
    }

    quality_metrics["overall_score"] = sum(scores.values()) / len(scores)
    quality_metrics["scores"] = scores

    return quality_metrics


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_grant_template_quality_and_performance(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    """Comprehensive test for grant template generation with quality metrics."""
    template_id = str(uuid4())

    # Stage 1: Create RAG sources
    stage1_start = datetime.now(UTC)
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="melanoma_alliance.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )
    stage1_time = (datetime.now(UTC) - stage1_start).total_seconds()

    # Stage 2: Extract CFP data
    stage2_start = datetime.now(UTC)
    cfp_data = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )
    stage2_time = (datetime.now(UTC) - stage2_start).total_seconds()
    cfp_quality = analyze_extraction_quality(cfp_data)

    # Stage 3: Extract sections
    stage3_start = datetime.now(UTC)
    sections = await handle_extract_sections(
        cfp_content=cfp_data["content"],
        cfp_subject=cfp_data["cfp_subject"],
        organization=None,
    )
    stage3_time = (datetime.now(UTC) - stage3_start).total_seconds()
    section_quality = analyze_section_quality(sections)

    # Stage 4: Generate metadata
    stage4_start = datetime.now(UTC)
    long_form_sections = [s for s in sections if s["is_long_form"]]
    metadata = await handle_generate_grant_template(
        cfp_content=str(cfp_data["content"]),
        cfp_subject=cfp_data["cfp_subject"],
        organization=None,
        long_form_sections=long_form_sections,
    )
    stage4_time = (datetime.now(UTC) - stage4_start).total_seconds()
    metadata_quality = analyze_metadata_quality(metadata)

    total_time = stage1_time + stage2_time + stage3_time + stage4_time

    # Calculate overall quality score
    overall_quality = (
        cfp_quality["overall_score"] * 0.2 +
        section_quality["overall_score"] * 0.3 +
        metadata_quality["overall_score"] * 0.5  # Metadata is most important
    )

    # Performance score (100 = under target, 0 = 2x over target)
    performance_score = max(0, 100 - ((total_time - 100) / 100) * 100)

    # Combined score
    combined_score = (overall_quality * 0.7) + (performance_score * 0.3)

    # Detailed results
    results = {
        "summary": {
            "overall_quality_score": round(overall_quality, 2),
            "performance_score": round(performance_score, 2),
            "combined_score": round(combined_score, 2),
            "total_time_seconds": round(total_time, 2),
            "test_passed": combined_score >= 70,  # 70% threshold
        },
        "performance": {
            "stage1_rag_creation": round(stage1_time, 2),
            "stage2_cfp_extraction": round(stage2_time, 2),
            "stage3_section_extraction": round(stage3_time, 2),
            "stage4_metadata_generation": round(stage4_time, 2),
            "total_time": round(total_time, 2),
            "performance_targets": {
                "stage2_target": 40,
                "stage3_target": 60,
                "stage4_target": 50,
                "total_target": 150,
            },
            "performance_vs_target": {
                "stage2_pct": round((stage2_time / 40) * 100, 1),
                "stage3_pct": round((stage3_time / 60) * 100, 1),
                "stage4_pct": round((stage4_time / 50) * 100, 1),
                "total_pct": round((total_time / 150) * 100, 1),
            },
        },
        "quality": {
            "cfp_extraction": cfp_quality,
            "section_extraction": section_quality,
            "metadata_generation": metadata_quality,
        },
        "outputs": {
            "cfp_data": cfp_data,
            "sections": sections,
            "metadata": metadata,
        },
        "test_metadata": {
            "timestamp": datetime.now(UTC).isoformat(),
            "grant_template_id": template_id,
            "source_count": len(source_ids),
        },
    }

    # Save comprehensive results
    folder = RESULTS_FOLDER / "quality_performance"
    folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_quality_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.json"
    results_file.write_bytes(serialize(results))

    # Log summary
    logger.info(
        "Quality & Performance Test Complete - Score: %.1f%% (Q: %.1f%%, P: %.1f%%) - Time: %.1fs",
        combined_score,
        overall_quality,
        performance_score,
        total_time,
    )

    # Log quality details
    logger.info(
        "Quality Breakdown - CFP: %.1f%%, Sections: %.1f%%, Metadata: %.1f%%",
        cfp_quality["overall_score"],
        section_quality["overall_score"],
        metadata_quality["overall_score"],
    )

    # Log performance details
    logger.info(
        "Performance vs Target - S2: %.1f%%, S3: %.1f%%, S4: %.1f%%, Total: %.1f%%",
        (stage2_time / 40) * 100,
        (stage3_time / 60) * 100,
        (stage4_time / 50) * 100,
        (total_time / 150) * 100,
    )

    # Assertions
    assert combined_score >= 70, f"Combined score {combined_score:.1f}% below 70% threshold"
    assert total_time < 180, f"Total time {total_time:.1f}s exceeds 180s hard limit"
    assert overall_quality >= 60, f"Quality score {overall_quality:.1f}% below 60% minimum"
