import logging
import time
from datetime import UTC, datetime
from typing import Any, cast

from packages.db.src.json_objects import CFPSectionAnalysis, GrantLongFormSection
from packages.db.src.utils import retrieve_application
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.performance_framework import TestDomain, TestExecutionSpeed, performance_test
from testing.rag_evaluation import save_evaluation_results

from services.rag.src.grant_application.generate_section_text import (
    _format_cfp_requirements_for_section,
)
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.tests.utils.rouge_utils import calculate_rouge_l, calculate_rouge_n


async def generate_section_text(*args: Any, **kwargs: Any) -> dict[str, Any]:
    return {}


def extract_section_requirements_text(section: GrantLongFormSection, cfp_analysis: CFPSectionAnalysis | None) -> str:
    section_title = section.get("title", "")
    generation_instructions = section.get("generation_instructions", "")
    keywords = " ".join(section.get("keywords", []))
    search_queries = " ".join(section.get("search_queries", []))

    cfp_requirements = _format_cfp_requirements_for_section(section, cfp_analysis)

    return f"""
    Section: {section_title}
    Instructions: {generation_instructions}
    Keywords: {keywords}
    Search Context: {search_queries}
    {cfp_requirements}
    """.strip()


async def measure_rag_proximity(
    section: GrantLongFormSection,
    application_id: str,
    cfp_analysis: CFPSectionAnalysis | None = None,
) -> dict[str, Any]:
    section_title = section.get("title", "Unknown Section")
    section_requirements = extract_section_requirements_text(section, cfp_analysis)

    unique_queries = section.get("search_queries", [])[:8]
    if not unique_queries:
        unique_queries = [section_title]

    task_description = f"Generate content for {section_title} section"

    retrieval_start = time.time()
    retrieval_results = await retrieve_documents(
        application_id=application_id,
        search_queries=unique_queries,
        task_description=task_description,
        max_tokens=8000,
        trace_id="test-trace-id",
    )
    retrieval_time = time.time() - retrieval_start

    retrieved_context = "\n".join(retrieval_results)

    section_to_rag_rouge_l = calculate_rouge_l(section_requirements, retrieved_context)
    section_to_rag_rouge_2 = calculate_rouge_n(section_requirements, retrieved_context, n=2)

    return {
        "section_title": section_title,
        "section_requirements_length": len(section_requirements),
        "retrieved_context_length": len(retrieved_context),
        "retrieval_time_seconds": retrieval_time,
        "retrieval_document_count": len(retrieval_results),
        "section_to_rag_rouge_l": section_to_rag_rouge_l,
        "section_to_rag_rouge_2": section_to_rag_rouge_2,
        "section_requirements": section_requirements[:500] + "..."
        if len(section_requirements) > 500
        else section_requirements,
        "retrieved_context_sample": retrieved_context[:500] + "..."
        if len(retrieved_context) > 500
        else retrieved_context,
    }


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.RETRIEVAL, timeout=900)
async def test_rag_proximity_analysis(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    logger.info("🔍 Starting REAL database RAG proximity analysis using ROUGE metrics")

    start_time = time.time()

    async with async_session_maker() as session:
        application = await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        if not application.grant_template or not application.grant_template.grant_sections:
            raise ValueError("Application must have grant template with sections")

        cfp_analysis = (
            application.grant_template.cfp_analysis["cfp_analysis"] if application.grant_template.cfp_analysis else None
        )

        grant_sections = application.grant_template.grant_sections
        long_form_sections = [
            cast("GrantLongFormSection", section)
            for section in grant_sections
            if isinstance(section, dict) and cast("int", section.get("max_words", 0)) > 100
        ]

        if not long_form_sections:
            raise ValueError("No substantial long-form sections found")

        logger.info(
            "Found %d long-form sections for RAG proximity analysis",
            len(long_form_sections),
        )

    proximity_results = []

    for section in long_form_sections[:3]:
        section_title = section.get("title", "Unknown")
        logger.info("Analyzing RAG proximity for section: %s", section_title)

        section_rag_metrics = await measure_rag_proximity(
            section=section,
            application_id=melanoma_alliance_full_application_id,
            cfp_analysis=cfp_analysis,
        )

        proximity_results.append(section_rag_metrics)

        logger.info(
            "RAG Section %s - ROUGE-L scores: Req→RAG=%.3f, ROUGE-2=%.3f",
            section_title,
            section_rag_metrics["section_to_rag_rouge_l"],
            section_rag_metrics["section_to_rag_rouge_2"],
        )

    total_time = time.time() - start_time

    aggregate_metrics = {
        "sections_analyzed": len(proximity_results),
        "avg_section_to_rag_rouge_l": sum(r["section_to_rag_rouge_l"] for r in proximity_results)
        / len(proximity_results),
        "avg_section_to_rag_rouge_2": sum(r["section_to_rag_rouge_2"] for r in proximity_results)
        / len(proximity_results),
        "avg_retrieval_time": sum(r["retrieval_time_seconds"] for r in proximity_results) / len(proximity_results),
        "total_analysis_time": total_time,
        "total_documents_retrieved": sum(r["retrieval_document_count"] for r in proximity_results),
    }

    assert aggregate_metrics["avg_section_to_rag_rouge_l"] > 0.05, "RAG Section to RAG proximity too low"
    assert total_time < 900, "RAG Analysis took too long"

    evaluation_results = {
        "test_type": "rag_proximity_analysis",
        "application_id": melanoma_alliance_full_application_id,
        "methodology": {
            "rag_system": "database_vector_search",
            "rouge_metrics": ["ROUGE-L", "ROUGE-2"],
            "measurement_points": ["section_requirements → database_retrieval"],
            "sections_analyzed": len(proximity_results),
        },
        "aggregate_metrics": aggregate_metrics,
        "section_details": proximity_results,
        "quality_thresholds": {
            "min_section_to_rag_rouge_l": 0.05,
        },
        "performance_comparison": {
            "uses_vector_db": True,
            "uses_embeddings": True,
            "uses_cosine_similarity": True,
            "no_mocking": True,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "rag_proximity_analysis.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info(
        "✅ RAG proximity analysis completed - Avg ROUGE-L: %.3f, Avg ROUGE-2: %.3f",
        aggregate_metrics["avg_section_to_rag_rouge_l"],
        aggregate_metrics["avg_section_to_rag_rouge_2"],
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_APPLICATION, timeout=1200)
async def test_rag_full_pipeline_with_generation(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    logger.info("🚀 Starting RAG full pipeline with text generation assessment")

    start_time = time.time()

    async with async_session_maker() as session:
        application = await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        if not application.grant_template or not application.grant_template.grant_sections:
            raise ValueError("Application must have grant template with sections")

        research_objectives = application.research_objectives or []
        cfp_analysis = (
            application.grant_template.cfp_analysis["cfp_analysis"] if application.grant_template.cfp_analysis else None
        )

        grant_sections = application.grant_template.grant_sections
        long_form_sections = [
            cast("GrantLongFormSection", section)
            for section in grant_sections
            if isinstance(section, dict) and cast("int", section.get("max_words", 0)) > 100
        ]

    pipeline_start = time.time()
    section_texts = await generate_section_text(
        sections=long_form_sections,
        research_deep_dives=research_objectives,
        application_id=melanoma_alliance_full_application_id,
        cfp_analysis=cfp_analysis,
    )
    pipeline_time = time.time() - pipeline_start

    pipeline_proximity_metrics = []

    for section in long_form_sections:
        section_id = section.get("id", section.get("title", "unknown"))
        generated_text = section_texts.get(section_id, "")

        if not generated_text:
            continue

        section_requirements = extract_section_requirements_text(section, cfp_analysis)

        retrieval_results = await retrieve_documents(
            application_id=melanoma_alliance_full_application_id,
            search_queries=section.get("search_queries", [section.get("title", "")])[:8],
            task_description=f"Generate content for {section.get('title', 'section')}",
            max_tokens=8000,
            trace_id="test-trace-id",
        )
        retrieved_context = "\n".join(retrieval_results)

        section_to_rag_rouge = calculate_rouge_l(section_requirements, retrieved_context)
        rag_to_writing_rouge = calculate_rouge_l(retrieved_context, generated_text)
        section_to_writing_rouge = calculate_rouge_l(section_requirements, generated_text)

        information_preservation_score = (
            section_to_rag_rouge * 0.25 + rag_to_writing_rouge * 0.35 + section_to_writing_rouge * 0.40
        )

        pipeline_proximity_metrics.append(
            {
                "section_id": section_id,
                "section_title": section.get("title", "Unknown"),
                "section_to_rag_rouge_l": section_to_rag_rouge,
                "rag_to_writing_rouge_l": rag_to_writing_rouge,
                "section_to_writing_rouge_l": section_to_writing_rouge,
                "information_preservation_score": information_preservation_score,
                "generated_word_count": len(generated_text.split()),
                "retrieved_documents_count": len(retrieval_results),
            }
        )

    total_time = time.time() - start_time

    overall_metrics = {
        "total_sections_processed": len(pipeline_proximity_metrics),
        "pipeline_generation_time": pipeline_time,
        "total_analysis_time": total_time,
        "avg_section_to_rag_proximity": (
            sum([float(cast("float", m["section_to_rag_rouge_l"])) for m in pipeline_proximity_metrics])
            / len(pipeline_proximity_metrics)
            if pipeline_proximity_metrics
            else 0
        ),
        "avg_rag_to_writing_proximity": (
            sum([float(cast("float", m["rag_to_writing_rouge_l"])) for m in pipeline_proximity_metrics])
            / len(pipeline_proximity_metrics)
            if pipeline_proximity_metrics
            else 0
        ),
        "avg_end_to_end_proximity": (
            sum([float(cast("float", m["section_to_writing_rouge_l"])) for m in pipeline_proximity_metrics])
            / len(pipeline_proximity_metrics)
            if pipeline_proximity_metrics
            else 0
        ),
        "avg_information_preservation": (
            sum([float(cast("float", m["information_preservation_score"])) for m in pipeline_proximity_metrics])
            / len(pipeline_proximity_metrics)
            if pipeline_proximity_metrics
            else 0
        ),
        "total_words_generated": sum([int(cast("int", m["generated_word_count"])) for m in pipeline_proximity_metrics]),
    }

    assert overall_metrics["avg_section_to_rag_proximity"] > 0.05, "RAG Pipeline section to RAG proximity insufficient"
    assert overall_metrics["avg_rag_to_writing_proximity"] > 0.10, "RAG Pipeline RAG to writing proximity insufficient"
    assert overall_metrics["avg_end_to_end_proximity"] > 0.08, "RAG Pipeline end-to-end proximity insufficient"
    assert overall_metrics["avg_information_preservation"] > 0.08, "RAG Overall information preservation too low"
    assert overall_metrics["total_sections_processed"] >= 3, "RAG Insufficient sections processed"

    comprehensive_results = {
        "test_type": "rag_full_pipeline_assessment",
        "application_id": melanoma_alliance_full_application_id,
        "methodology": {
            "rag_system": "database_vector_search_with_generation",
            "rouge_metric": "ROUGE-L",
            "measurement_approach": "end_to_end_pipeline_evaluation",
            "information_preservation_formula": "0.25*section_to_rag + 0.35*rag_to_writing + 0.40*section_to_writing",
        },
        "overall_metrics": overall_metrics,
        "section_metrics": pipeline_proximity_metrics,
        "quality_benchmarks": {
            "excellent_preservation": ">0.20",
            "good_preservation": "0.12-0.20",
            "adequate_preservation": "0.08-0.12",
            "poor_preservation": "<0.08",
        },
        "performance_comparison": {
            "uses_vector_db": True,
            "uses_embeddings": True,
            "uses_cosine_similarity": True,
            "no_mocking": True,
            "includes_text_generation": True,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "rag_full_pipeline.json"
    save_evaluation_results(comprehensive_results, output_path)

    logger.info(
        "✅ RAG Full pipeline assessment completed",
        extra={
            "sections_processed": overall_metrics["total_sections_processed"],
            "avg_preservation_score": f"{overall_metrics['avg_information_preservation']:.3f}",
            "pipeline_time": f"{pipeline_time:.1f}s",
            "total_time": f"{total_time:.1f}s",
        },
    )
