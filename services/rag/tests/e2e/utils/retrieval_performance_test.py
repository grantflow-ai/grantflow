"""
Performance tests for RAG retrieval utilities.

Tests the most critical performance bottlenecks in retrieval.py:
1. Database vector similarity queries (retrieve_vectors_for_embedding)
2. Embedding generation (generate_embeddings in handle_retrieval)
3. Post-processing pipeline (post_process_documents)
4. End-to-end retrieval performance (retrieve_documents)
"""

import logging
from datetime import UTC, datetime
from typing import Any

from packages.db.src.tables import GrantApplicationRagSource
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.utils.retrieval import (
    handle_retrieval,
    retrieve_documents,
    retrieve_vectors_for_embedding,
)
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    create_performance_context,
)


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_vector_retrieval_performance(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Test database vector similarity query performance.
    Critical bottleneck: Complex vector queries with cosine distance calculations.
    """

    with create_performance_context(
        test_name="vector_retrieval_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "database_performance",
            "operation": "vector_similarity_queries",
            "query_embeddings": 3,
            "max_results": 100,
        },
        expected_patterns=["vector", "similarity", "database", "performance"],
    ) as perf_ctx:
        logger.info("=== VECTOR RETRIEVAL PERFORMANCE TEST ===")

        test_embeddings = [
            [0.1] * 384,
            [0.2] * 384,
            [0.3] * 384,
        ]

        application_id = "550e8400-e29b-41d4-a716-446655440010"

        with perf_ctx.stage_timer("single_embedding_query"):
            single_start = datetime.now(UTC)

            single_results = await retrieve_vectors_for_embedding(
                application_id=application_id,
                embeddings=test_embeddings[:1],
                file_table_cls=GrantApplicationRagSource,
                limit=50,
            )

            single_duration = (datetime.now(UTC) - single_start).total_seconds()

            logger.info(
                "Single embedding query completed",
                duration_seconds=single_duration,
                results_count=len(single_results) if single_results else 0,
            )

        with perf_ctx.stage_timer("multiple_embedding_queries"):
            batch_start = datetime.now(UTC)

            batch_results = await retrieve_vectors_for_embedding(
                application_id=application_id,
                embeddings=test_embeddings,
                file_table_cls=GrantApplicationRagSource,
                limit=100,
            )

            batch_duration = (datetime.now(UTC) - batch_start).total_seconds()

            logger.info(
                "Multiple embedding queries completed",
                duration_seconds=batch_duration,
                embeddings_count=len(test_embeddings),
                results_count=len(batch_results) if batch_results else 0,
            )

        with perf_ctx.stage_timer("recursive_threshold_queries"):
            recursive_start = datetime.now(UTC)

            recursive_results = await retrieve_vectors_for_embedding(
                application_id=application_id,
                embeddings=test_embeddings,
                file_table_cls=GrantApplicationRagSource,
                limit=200,
                iteration=1,
            )

            recursive_duration = (datetime.now(UTC) - recursive_start).total_seconds()

            logger.info(
                "Recursive threshold queries completed",
                duration_seconds=recursive_duration,
                results_count=len(recursive_results) if recursive_results else 0,
            )

        query_efficiency = single_duration / len(test_embeddings[:1]) if single_duration > 0 else 0
        batch_efficiency = batch_duration / len(test_embeddings) if batch_duration > 0 else 0
        scaling_factor = batch_duration / single_duration if single_duration > 0 else 1.0

        analysis_content = f"""
        # Vector Retrieval Performance Analysis

        ## Test Configuration
        - Embedding dimensions: 384 (sentence-transformers)
        - Single query embeddings: 1
        - Batch query embeddings: {len(test_embeddings)}
        - Max results per query: 100
        - Application ID: {application_id}

        ## Performance Results

        ### Single Embedding Query
        - Duration: {single_duration:.3f} seconds
        - Results: {len(single_results) if single_results else 0}
        - Efficiency: {query_efficiency:.3f}s per embedding

        ### Multiple Embedding Queries (Batch)
        - Duration: {batch_duration:.3f} seconds
        - Embeddings: {len(test_embeddings)}
        - Results: {len(batch_results) if batch_results else 0}
        - Efficiency: {batch_efficiency:.3f}s per embedding

        ### Recursive Threshold Queries
        - Duration: {recursive_duration:.3f} seconds
        - Results: {len(recursive_results) if recursive_results else 0}
        - Recursion impact: {"High" if recursive_duration > batch_duration * 2 else "Low"}

        ## Performance Analysis
        - **Scaling factor**: {scaling_factor:.2f}x (batch vs single)
        - **Query throughput**: {len(test_embeddings) / batch_duration:.1f} embeddings/second
        - **Database efficiency**: {"Good" if batch_efficiency < 0.1 else "Needs optimization"}
        - **Recursion overhead**: {"Significant" if recursive_duration > batch_duration * 1.5 else "Minimal"}

        ## Optimization Opportunities
        - Database query optimization: {"High priority" if batch_efficiency > 0.1 else "Low priority"}
        - Index optimization: {"Recommended" if scaling_factor > 2.0 else "Current indexes adequate"}
        - Connection pooling: {"Critical" if single_duration > 0.05 else "Current setup adequate"}
        - Query result caching: {"High impact" if recursive_duration > batch_duration * 1.5 else "Limited impact"}

        ## Performance Recommendations
        - Target query time: < 0.1s per embedding
        - {"✅ Performance target met" if batch_efficiency < 0.1 else "❌ Performance optimization needed"}
        - Next steps: {"Monitor production performance" if batch_efficiency < 0.1 else "Implement database optimizations"}
        """

        section_analysis = [
            "Test Configuration",
            "Performance Results",
            "Performance Analysis",
            "Optimization Opportunities",
            "Performance Recommendations",
        ]

        perf_ctx.set_content(analysis_content, section_analysis)

        if batch_efficiency > 0.2:
            perf_ctx.add_warning(f"Slow vector queries detected: {batch_efficiency:.3f}s per embedding")
        if scaling_factor > 3.0:
            perf_ctx.add_warning(f"Poor query scaling: {scaling_factor:.1f}x increase for batch")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=600)
async def test_retrieval_pipeline_performance(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Test end-to-end retrieval pipeline performance.
    Measures complete retrieval workflow including embeddings, queries, and post-processing.
    """

    with create_performance_context(
        test_name="retrieval_pipeline_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "end_to_end_performance",
            "operation": "complete_retrieval_pipeline",
            "search_queries": 5,
            "max_tokens": 4000,
        },
        expected_patterns=["retrieval", "pipeline", "embeddings", "performance"],
    ) as perf_ctx:
        logger.info("=== RETRIEVAL PIPELINE PERFORMANCE TEST ===")

        application_id = "550e8400-e29b-41d4-a716-446655440011"
        task_description = (
            "Investigate melanoma immunotherapy resistance mechanisms and develop combination therapy approaches"
        )

        search_queries = [
            "melanoma immunotherapy resistance",
            "combination therapy approaches",
            "predictive biomarkers cancer",
            "therapeutic targets validation",
            "treatment protocols oncology",
        ]

        with perf_ctx.stage_timer("basic_retrieval"):
            basic_start = datetime.now(UTC)

            basic_results = await retrieve_documents(
                application_id=application_id,
                search_queries=search_queries,
                task_description=task_description,
                max_tokens=2000,
                with_guided_retrieval=False,
            )

            basic_duration = (datetime.now(UTC) - basic_start).total_seconds()

            logger.info(
                "Basic retrieval completed",
                duration_seconds=basic_duration,
                search_queries_count=len(search_queries),
                result_length=len("".join(basic_results)) if basic_results else 0,
                results_count=len(basic_results) if basic_results else 0,
            )

        with perf_ctx.stage_timer("guided_retrieval"):
            guided_start = datetime.now(UTC)

            guided_results = await retrieve_documents(
                application_id=application_id,
                search_queries=search_queries,
                task_description=task_description,
                max_tokens=4000,
                with_guided_retrieval=True,
            )

            guided_duration = (datetime.now(UTC) - guided_start).total_seconds()

            logger.info(
                "Guided retrieval completed",
                duration_seconds=guided_duration,
                result_length=len("".join(guided_results)) if guided_results else 0,
                results_count=len(guided_results) if guided_results else 0,
            )

        large_queries = search_queries * 3

        with perf_ctx.stage_timer("large_query_batch"):
            stress_start = datetime.now(UTC)

            stress_results = await retrieve_documents(
                application_id=application_id,
                search_queries=large_queries,
                task_description=task_description,
                max_tokens=6000,
                with_guided_retrieval=False,
            )

            stress_duration = (datetime.now(UTC) - stress_start).total_seconds()

            logger.info(
                "Large query batch completed",
                duration_seconds=stress_duration,
                search_queries_count=len(large_queries),
                result_length=len("".join(stress_results)) if stress_results else 0,
            )

        basic_throughput = len(search_queries) / basic_duration if basic_duration > 0 else 0
        guided_overhead = (guided_duration - basic_duration) / basic_duration * 100 if basic_duration > 0 else 0
        stress_scaling = stress_duration / (basic_duration * 3) if basic_duration > 0 else 1.0

        analysis_content = f"""
        # Retrieval Pipeline Performance Analysis

        ## Test Configuration
        - Application ID: {application_id}
        - Basic search queries: {len(search_queries)}
        - Stress test queries: {len(large_queries)}
        - Task: Melanoma immunotherapy research

        ## Performance Results

        ### Basic Retrieval (No Optimization)
        - Duration: {basic_duration:.2f} seconds
        - Queries processed: {len(search_queries)}
        - Results count: {len(basic_results) if basic_results else 0}
        - Throughput: {basic_throughput:.1f} queries/second
        - Result size: {len("".join(basic_results)) if basic_results else 0} characters

        ### Guided Retrieval (With Optimization)
        - Duration: {guided_duration:.2f} seconds
        - Optimization overhead: {guided_overhead:.1f}%
        - Results count: {len(guided_results) if guided_results else 0}
        - Quality impact: {"Positive" if len(guided_results) > len(basic_results) else "Neutral"}

        ### Large Query Batch (Stress Test)
        - Duration: {stress_duration:.2f} seconds
        - Queries processed: {len(large_queries)}
        - Scaling factor: {stress_scaling:.2f}x
        - Performance degradation: {"Significant" if stress_scaling > 1.5 else "Minimal"}

        ## Pipeline Performance Analysis
        - **Query processing rate**: {basic_throughput:.1f} queries/second
        - **Guided retrieval cost**: {guided_overhead:.1f}% overhead
        - **Scaling efficiency**: {stress_scaling:.2f}x (ideal: 1.0x)
        - **Memory efficiency**: {"Good" if stress_scaling < 1.2 else "Needs optimization"}

        ## Bottleneck Identification
        - Primary bottleneck: {"Database queries" if basic_duration > 5.0 else "Embedding generation" if basic_duration > 2.0 else "Network I/O"}
        - Guided retrieval impact: {"High cost" if guided_overhead > 50 else "Acceptable cost"}
        - Scaling issues: {"Yes" if stress_scaling > 1.5 else "No"}

        ## Optimization Recommendations
        - Database optimization: {"Critical" if basic_duration > 5.0 else "Standard monitoring"}
        - Caching strategy: {"High priority" if guided_overhead > 30 else "Low priority"}
        - Parallel processing: {"Implement" if stress_scaling > 1.3 else "Current approach adequate"}
        - Connection pooling: {"Upgrade" if basic_throughput < 2.0 else "Current setup adequate"}

        ## Production Readiness
        - Performance grade: {"A" if basic_duration < 3.0 and stress_scaling < 1.2 else "B" if basic_duration < 5.0 else "C"}
        - Recommendation: {"Production ready" if basic_duration < 5.0 and stress_scaling < 1.5 else "Optimization required"}
        """

        section_analysis = [
            "Test Configuration",
            "Performance Results",
            "Pipeline Performance Analysis",
            "Bottleneck Identification",
            "Optimization Recommendations",
            "Production Readiness",
        ]

        perf_ctx.set_content(analysis_content, section_analysis)

        if basic_duration > 10.0:
            perf_ctx.add_warning(f"Slow retrieval pipeline: {basic_duration:.1f}s for basic retrieval")
        if guided_overhead > 100:
            perf_ctx.add_warning(f"High guided retrieval overhead: {guided_overhead:.1f}%")
        if stress_scaling > 2.0:
            perf_ctx.add_warning(f"Poor scaling performance: {stress_scaling:.1f}x degradation")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.SMOKE, timeout=180)
async def test_embedding_generation_performance(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Test embedding generation performance in isolation.
    Critical component: generate_embeddings function called by handle_retrieval.
    """

    with create_performance_context(
        test_name="embedding_generation_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "embedding_performance",
            "operation": "batch_embedding_generation",
        },
        expected_patterns=["embedding", "generation", "performance"],
    ) as perf_ctx:
        logger.info("=== EMBEDDING GENERATION PERFORMANCE TEST ===")

        small_queries = ["melanoma research", "immunotherapy approaches"]
        medium_queries = ["melanoma research"] * 5
        large_queries = ["melanoma research"] * 10

        with perf_ctx.stage_timer("small_batch_embeddings"):
            small_start = datetime.now(UTC)

            small_results = await handle_retrieval(
                application_id="550e8400-e29b-41d4-a716-446655440012",
                search_queries=small_queries,
                max_results=50,
            )

            small_duration = (datetime.now(UTC) - small_start).total_seconds()

            logger.info(
                "Small batch embeddings completed",
                duration_seconds=small_duration,
                queries_count=len(small_queries),
                results_count=len(small_results) if small_results else 0,
            )

        with perf_ctx.stage_timer("medium_batch_embeddings"):
            medium_start = datetime.now(UTC)

            medium_results = await handle_retrieval(
                application_id="550e8400-e29b-41d4-a716-446655440012",
                search_queries=medium_queries,
                max_results=100,
            )

            medium_duration = (datetime.now(UTC) - medium_start).total_seconds()

            logger.info(
                "Medium batch embeddings completed",
                duration_seconds=medium_duration,
                queries_count=len(medium_queries),
                results_count=len(medium_results) if medium_results else 0,
            )

        with perf_ctx.stage_timer("large_batch_embeddings"):
            large_start = datetime.now(UTC)

            large_results = await handle_retrieval(
                application_id="550e8400-e29b-41d4-a716-446655440012",
                search_queries=large_queries,
                max_results=200,
            )

            large_duration = (datetime.now(UTC) - large_start).total_seconds()

            logger.info(
                "Large batch embeddings completed",
                duration_seconds=large_duration,
                queries_count=len(large_queries),
                results_count=len(large_results) if large_results else 0,
            )

        small_efficiency = small_duration / len(small_queries) if small_duration > 0 else 0
        medium_efficiency = medium_duration / len(medium_queries) if medium_duration > 0 else 0
        large_efficiency = large_duration / len(large_queries) if large_duration > 0 else 0

        smoke_content = f"""
        # Embedding Generation Performance Smoke Test

        ## Results
        - Small batch ({len(small_queries)} queries): {small_duration:.2f}s ({small_efficiency:.3f}s per query)
        - Medium batch ({len(medium_queries)} queries): {medium_duration:.2f}s ({medium_efficiency:.3f}s per query)
        - Large batch ({len(large_queries)} queries): {large_duration:.2f}s ({large_efficiency:.3f}s per query)

        ## Analysis
        - Embedding efficiency: {"Good" if large_efficiency < 0.1 else "Needs optimization"}
        - Batch scaling: {"Linear" if abs(large_efficiency - small_efficiency) < 0.02 else "Sub-linear"}
        - Performance grade: {"A" if large_efficiency < 0.05 else "B" if large_efficiency < 0.1 else "C"}

        ## Status: {"PASSED ✓" if large_efficiency < 0.2 else "NEEDS OPTIMIZATION ⚠️"}
        """

        perf_ctx.set_content(smoke_content, ["Results", "Analysis", "Status"])

        if large_efficiency > 0.2:
            perf_ctx.add_warning(f"Slow embedding generation: {large_efficiency:.3f}s per query")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="B")

    return perf_ctx.result
