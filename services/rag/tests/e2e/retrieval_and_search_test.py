"""
Comprehensive test suite for document retrieval and search functionality.
Tests search query generation, document retrieval, and relevance scoring.
"""

import logging
import time
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from packages.db.src.utils import retrieve_application
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.e2e_utils import E2ETestCategory, e2e_test
from testing.rag_ai_evaluation import (
    evaluate_query_generation_quality,
    evaluate_retrieval_relevance,
)
from testing.rag_evaluation import (
    assess_query_quality,
    calculate_performance_metrics,
    calculate_retrieval_diversity,
    save_evaluation_results,
)

from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries
from services.rag.tests.e2e.utils_test import create_rag_sources_from_cfp_file


@e2e_test(category=E2ETestCategory.SMOKE, timeout=180)
async def test_retrieval_smoke(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Quick smoke test for document retrieval functionality.
    Verifies basic retrieval with simple queries.
    """
    start_time = time.time()

    async with async_session_maker() as session:
        await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        results = await retrieve_documents(
            rerank=True,
            application_id=melanoma_alliance_full_application_id,
            task_description="Test retrieval functionality",
            search_queries=["melanoma research", "cancer treatment", "immunotherapy"],
        )

    end_time = time.time()
    performance = calculate_performance_metrics(start_time, end_time, "retrieval")

    assert len(results) > 0, "Should retrieve at least some documents"
    assert len(results) <= 100, "Should not exceed maximum retrieval limit"
    assert all(isinstance(result, str) for result in results), "All results should be strings"
    assert all(len(result.strip()) > 0 for result in results), "All results should have content"

    assert performance["execution_time"] < 600, "Should complete within 10 minutes"

    logger.info(
        "Retrieval smoke test completed in %.2f seconds with %d results", performance["execution_time"], len(results)
    )


@e2e_test(timeout=600)
async def test_retrieval_quality_assessment(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Test retrieval quality with diversity metrics.
    Evaluates whether retrieved documents are diverse and relevant.
    """
    start_time = time.time()

    async with async_session_maker() as session:
        await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        task_description = "Grant application for melanoma research involving brain metastases and immunotherapy"

        results = await retrieve_documents(
            rerank=True,
            application_id=melanoma_alliance_full_application_id,
            task_description=task_description,
        )

    end_time = time.time()

    diversity_score = calculate_retrieval_diversity(results)
    performance = calculate_performance_metrics(start_time, end_time, "retrieval")

    assert len(results) > 0
    assert len(results) <= 100
    assert diversity_score > 0.2
    assert performance["execution_time"] < 600

    evaluation_results = {
        "test_type": "retrieval_quality_assessment",
        "application_id": melanoma_alliance_full_application_id,
        "results": {
            "document_count": len(results),
            "diversity_score": diversity_score,
            "performance": performance,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "retrieval_quality.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info("Retrieval quality assessment completed with diversity score: %.2f", diversity_score)


@e2e_test(category=E2ETestCategory.SEMANTIC_EVALUATION, timeout=600)
async def test_retrieval_semantic_evaluation(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Test retrieval with semantic evaluation of relevance.
    Uses AI to evaluate whether retrieved documents are relevant to the query.
    """
    start_time = time.time()

    async with async_session_maker() as session:
        await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        task_description = "Research melanoma treatment and immunotherapy approaches"

        results = await retrieve_documents(
            rerank=True,
            application_id=melanoma_alliance_full_application_id,
            task_description=task_description,
        )

    end_time = time.time()

    ai_evaluation = await evaluate_retrieval_relevance(task_description, results)

    diversity_score = calculate_retrieval_diversity(results)
    performance = calculate_performance_metrics(start_time, end_time, "retrieval")

    assert len(results) > 0
    assert len(results) <= 100
    assert diversity_score > 0.1

    if ai_evaluation["evaluation_enabled"]:
        assert ai_evaluation["avg_relevance"] >= 2.5

    evaluation_results = {
        "test_type": "retrieval_semantic_evaluation",
        "application_id": melanoma_alliance_full_application_id,
        "query": task_description,
        "results": {
            "document_count": len(results),
            "diversity_score": diversity_score,
            "ai_evaluation": ai_evaluation,
            "performance": performance,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "retrieval_semantic.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info("Semantic evaluation completed with AI relevance: %.2f", ai_evaluation.get("avg_relevance", 0))


@e2e_test(timeout=300)
async def test_retrieval_with_custom_queries(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Test retrieval with custom search queries.
    Evaluates performance with specific query patterns.
    """
    start_time = time.time()

    query_patterns = {
        "specific_terms": ["BRAF mutation", "PD-1 inhibitor", "ipilimumab"],
        "broad_concepts": ["cancer research", "clinical trials", "patient outcomes"],
        "technical_queries": ["single-cell RNA sequencing", "tumor microenvironment", "checkpoint blockade"],
    }

    results_by_pattern = {}

    async with async_session_maker() as session:
        await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        for pattern_name, queries in query_patterns.items():
            pattern_start = time.time()

            results = await retrieve_documents(
                rerank=True,
                application_id=melanoma_alliance_full_application_id,
                task_description=f"Testing {pattern_name} query pattern",
                search_queries=queries,
            )

            pattern_time = time.time() - pattern_start

            results_by_pattern[pattern_name] = {
                "count": len(results),
                "time": pattern_time,
                "avg_length": sum(len(r) for r in results) / len(results) if results else 0,
            }

            logger.info("%s pattern: %d results in %.2fs", pattern_name, len(results), pattern_time)

    total_time = time.time() - start_time

    for pattern_name, metrics in results_by_pattern.items():
        assert metrics["count"] > 0, f"{pattern_name} should return results"
        assert metrics["time"] < 120, f"{pattern_name} took too long"

    logger.info("Custom query retrieval completed in %.2fs", total_time)


@e2e_test(timeout=300)
async def test_search_query_generation_basic(
    logger: logging.Logger,
) -> None:
    """
    Test basic search query generation functionality.
    """
    start_time = time.time()

    test_prompts = [
        "Generate search queries for melanoma research grant",
        "Create queries for investigating cancer immunotherapy approaches",
        "Search terms for clinical trial design and patient recruitment",
    ]

    all_queries = []

    for prompt in test_prompts:
        queries = await handle_create_search_queries(user_prompt=prompt)

        assert isinstance(queries, list), "Should return a list of queries"
        assert 3 <= len(queries) <= 10, f"Should generate 3-10 queries, got {len(queries)}"
        assert all(isinstance(q, str) for q in queries), "All queries should be strings"
        assert all(len(q.strip()) > 0 for q in queries), "No empty queries"

        all_queries.extend(queries)

        logger.info("Generated %d queries for: %s", len(queries), prompt[:50])

    end_time = time.time()

    unique_queries = set(all_queries)
    diversity_ratio = len(unique_queries) / len(all_queries)

    assert diversity_ratio > 0.7, f"Query diversity too low: {diversity_ratio:.2f}"

    logger.info(
        "Query generation completed in %.2fs, generated %d total queries with %.2f diversity",
        end_time - start_time,
        len(all_queries),
        diversity_ratio,
    )


@e2e_test(timeout=600)
async def test_search_query_quality_assessment(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Test search query generation quality with AI evaluation.
    """
    start_time = time.time()

    template_id = str(uuid4())
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="melanoma_alliance.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    context = f"Melanoma research grant with {len(source_ids)} CFP sources"

    queries = await handle_create_search_queries(
        user_prompt=f"Generate effective search queries for grant research: {context}"
    )

    end_time = time.time()

    quality_metrics = assess_query_quality(queries)
    performance = calculate_performance_metrics(start_time, end_time, "query_generation")
    ai_evaluation = await evaluate_query_generation_quality(context, queries)

    assert 3 <= len(queries) <= 10
    assert quality_metrics["diversity"] > 0.3
    assert quality_metrics["avg_length"] >= 2
    assert performance["execution_time"] < 600

    evaluation_results = {
        "test_type": "query_generation_quality",
        "cfp_name": "melanoma_alliance",
        "results": {
            "query_count": len(queries),
            "quality_metrics": quality_metrics,
            "ai_evaluation": ai_evaluation,
            "performance": performance,
            "generated_queries": queries,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "query_quality_assessment.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info("Query quality assessment completed with %d queries", len(queries))


@e2e_test(timeout=300)
async def test_search_query_context_sensitivity(
    logger: logging.Logger,
) -> None:
    """
    Test that search query generation is sensitive to context.
    Different contexts should produce different queries.
    """
    contexts = {
        "technical": "Generate queries for technical aspects of CRISPR-Cas9 gene editing in melanoma research",
        "clinical": "Generate queries for clinical trial design and patient recruitment strategies",
        "funding": "Generate queries for grant funding opportunities and budget justification",
    }

    queries_by_context = {}

    for context_type, prompt in contexts.items():
        queries = await handle_create_search_queries(user_prompt=prompt)
        queries_by_context[context_type] = queries

        logger.info("%s context: %d queries", context_type, len(queries))

    technical_set = set(queries_by_context["technical"])
    clinical_set = set(queries_by_context["clinical"])
    funding_set = set(queries_by_context["funding"])

    tech_clinical_overlap = len(technical_set & clinical_set) / len(technical_set | clinical_set)
    tech_funding_overlap = len(technical_set & funding_set) / len(technical_set | funding_set)
    clinical_funding_overlap = len(clinical_set & funding_set) / len(clinical_set | funding_set)

    assert tech_clinical_overlap < 0.3, f"Technical-Clinical overlap too high: {tech_clinical_overlap:.2f}"
    assert tech_funding_overlap < 0.3, f"Technical-Funding overlap too high: {tech_funding_overlap:.2f}"
    assert clinical_funding_overlap < 0.3, f"Clinical-Funding overlap too high: {clinical_funding_overlap:.2f}"

    logger.info(
        "Context sensitivity verified - overlaps: T-C=%.2f, T-F=%.2f, C-F=%.2f",
        tech_clinical_overlap,
        tech_funding_overlap,
        clinical_funding_overlap,
    )


@e2e_test(category=E2ETestCategory.E2E_FULL, timeout=900)
async def test_search_and_retrieval_integration(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Integration test for search query generation and document retrieval.
    Tests the complete flow from query generation to retrieval.
    """
    start_time = time.time()

    context = "Comprehensive melanoma research grant application focusing on immunotherapy"

    queries = await handle_create_search_queries(user_prompt=f"Generate search queries for: {context}")

    assert len(queries) >= 3, "Should generate at least 3 queries"

    logger.info("Generated %d search queries", len(queries))

    async with async_session_maker() as session:
        await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        results = await retrieve_documents(
            rerank=True,
            application_id=melanoma_alliance_full_application_id,
            task_description=context,
            search_queries=queries,
        )

    end_time = time.time()

    integration_metrics = {
        "total_time": end_time - start_time,
        "queries_generated": len(queries),
        "documents_retrieved": len(results),
        "avg_doc_length": sum(len(r) for r in results) / len(results) if results else 0,
        "retrieval_diversity": calculate_retrieval_diversity(results),
    }

    assert integration_metrics["documents_retrieved"] > 0, "Should retrieve documents"
    assert integration_metrics["retrieval_diversity"] > 0.1, "Retrieved documents should be diverse"
    assert integration_metrics["total_time"] < 900, "Integration should complete within time limit"

    logger.info("=== INTEGRATION TEST RESULTS ===")
    for metric, value in integration_metrics.items():
        logger.info("%s: %s", metric, value)

    ai_evaluation = await evaluate_retrieval_relevance(context, results[:10])

    if ai_evaluation["evaluation_enabled"]:
        assert ai_evaluation["avg_relevance"] >= 2.0, "Retrieved documents should be relevant"
        logger.info("AI relevance score: %.2f", ai_evaluation["avg_relevance"])

    logger.info("Search and retrieval integration test completed successfully")
