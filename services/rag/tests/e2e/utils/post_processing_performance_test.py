"""
Performance tests for RAG post-processing utilities.

Tests the third most critical performance bottlenecks in post_processing.py:
1. spaCy NLP processing pipeline
2. BM25 ranking computation
3. Sentence embedding generation and similarity calculations
4. Document deduplication with N² complexity
"""

import logging
from datetime import UTC, datetime

from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.post_processing import (
    apply_semantic_ranking,
    deduplicate_sentences,
    post_process_documents,
)
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    create_performance_context,
)


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=600)
async def test_post_processing_pipeline_performance(logger: logging.Logger) -> None:
    """
    Test complete post-processing pipeline performance.
    Tests spaCy NLP, BM25 ranking, and semantic similarity processing.
    """

    with create_performance_context(
        test_name="post_processing_pipeline_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "cpu_intensive_performance",
            "operation": "document_post_processing",
            "document_sizes": ["small", "medium", "large"],
            "processing_steps": ["spacy_nlp", "bm25_ranking", "semantic_similarity"],
        },
        expected_patterns=["post", "processing", "nlp", "ranking", "performance"]
    ) as perf_ctx:

        logger.info("=== POST-PROCESSING PIPELINE PERFORMANCE TEST ===")


        small_docs = [
            DocumentDTO(
                chunk="Melanoma is a type of skin cancer that develops from melanocytes.",
                rag_source_id="source1",
                embedding=None,
                created_at=None,
                updated_at=None,
                id=None
            ),
            DocumentDTO(
                chunk="Immunotherapy has shown promising results in melanoma treatment.",
                rag_source_id="source2",
                embedding=None,
                created_at=None,
                updated_at=None,
                id=None
            ),
            DocumentDTO(
                chunk="Resistance mechanisms in melanoma involve multiple pathways.",
                rag_source_id="source3",
                embedding=None,
                created_at=None,
                updated_at=None,
                id=None
            ),
        ]

        medium_docs = small_docs * 5

        large_docs = [
            DocumentDTO(
                chunk="Melanoma research has advanced significantly in recent years with the development of targeted therapies and immunotherapies. "
                      "The understanding of melanoma biology, including the role of oncogenes such as BRAF and NRAS, has led to the development of specific inhibitors. "
                      "Immune checkpoint inhibitors, particularly anti-PD-1 and anti-CTLA-4 antibodies, have revolutionized melanoma treatment. "
                      "However, resistance to these therapies remains a significant challenge that requires comprehensive research approaches.",
                rag_source_id=f"large_source{i}",
                embedding=None,
                created_at=None,
                updated_at=None,
                id=None
            )
            for i in range(10)
        ]

        test_document_sets = {
            "small": small_docs,
            "medium": medium_docs,
            "large": large_docs
        }

        query = "melanoma immunotherapy resistance mechanisms"
        results = {}


        for size, documents in test_document_sets.items():
            logger.info(f"Testing {size} document set ({len(documents)} documents)")

            with perf_ctx.stage_timer(f"{size}_document_processing"):
                processing_start = datetime.now(UTC)

                try:
                    processed_docs = await post_process_documents(
                        documents=documents,
                        query=query,
                        model="gemini-2.5-flash",
                        max_tokens=4000,
                    )

                    processing_duration = (datetime.now(UTC) - processing_start).total_seconds()

                    results[size] = {
                        "duration": processing_duration,
                        "success": True,
                        "input_count": len(documents),
                        "output_count": len(processed_docs),
                        "docs_per_second": len(documents) / processing_duration if processing_duration > 0 else 0,
                        "avg_time_per_doc": processing_duration / len(documents) if len(documents) > 0 else 0,
                    }

                    logger.info(
                        f"{size.capitalize()} document processing completed",
                        duration_seconds=processing_duration,
                        input_documents=len(documents),
                        output_documents=len(processed_docs),
                        docs_per_second=results[size]["docs_per_second"],
                    )

                except Exception as e:
                    processing_duration = (datetime.now(UTC) - processing_start).total_seconds()
                    results[size] = {
                        "duration": processing_duration,
                        "success": False,
                        "error": str(e),
                        "input_count": len(documents),
                    }
                    logger.error(f"{size.capitalize()} document processing failed", exc_info=e)


        complexity_analysis = {}
        if all(results[size]["success"] for size in ["small", "medium", "large"]):
            small_time = results["small"]["duration"]
            medium_time = results["medium"]["duration"]
            large_time = results["large"]["duration"]


            medium_scaling = medium_time / small_time if small_time > 0 else 1
            large_scaling = large_time / small_time if small_time > 0 else 1

            complexity_analysis = {
                "medium_scaling_factor": medium_scaling,
                "large_scaling_factor": large_scaling,
                "is_linear": medium_scaling < 6.0 and large_scaling < 12.0,
                "complexity_grade": "Linear" if medium_scaling < 6.0 and large_scaling < 12.0 else "Quadratic" if large_scaling > 50.0 else "Super-linear"
            }


        avg_efficiency = sum(r["docs_per_second"] for r in results.values() if r.get("success")) / len([r for r in results.values() if r.get("success")]) if any(r.get("success") for r in results.values()) else 0

        analysis_content = f"""
        # Post-Processing Pipeline Performance Analysis

        ## Test Configuration
        - Query: "{query}"
        - Document sets: Small ({len(small_docs)}), Medium ({len(medium_docs)}), Large ({len(large_docs)})
        - Processing steps: spaCy NLP, BM25 ranking, semantic similarity
        - Max results: All documents (no filtering)

        ## Document Processing Performance

        ### Small Document Set ({results['small']['input_count']} docs)
        - Duration: {results['small']['duration']:.2f} seconds
        - Output documents: {results['small'].get('output_count', 0)}
        - Processing rate: {results['small'].get('docs_per_second', 0):.1f} docs/second
        - Time per document: {results['small'].get('avg_time_per_doc', 0):.3f} seconds
        - Status: {'✅ Success' if results['small']['success'] else '❌ Failed'}

        ### Medium Document Set ({results['medium']['input_count']} docs)
        - Duration: {results['medium']['duration']:.2f} seconds
        - Output documents: {results['medium'].get('output_count', 0)}
        - Processing rate: {results['medium'].get('docs_per_second', 0):.1f} docs/second
        - Time per document: {results['medium'].get('avg_time_per_doc', 0):.3f} seconds
        - Status: {'✅ Success' if results['medium']['success'] else '❌ Failed'}

        ### Large Document Set ({results['large']['input_count']} docs)
        - Duration: {results['large']['duration']:.2f} seconds
        - Output documents: {results['large'].get('output_count', 0)}
        - Processing rate: {results['large'].get('docs_per_second', 0):.1f} docs/second
        - Time per document: {results['large'].get('avg_time_per_doc', 0):.3f} seconds
        - Status: {'✅ Success' if results['large']['success'] else '❌ Failed'}

        ## Computational Complexity Analysis
        {f'''- Medium scaling factor: {complexity_analysis.get('medium_scaling_factor', 0):.1f}x
        - Large scaling factor: {complexity_analysis.get('large_scaling_factor', 0):.1f}x
        - Algorithm complexity: {complexity_analysis.get('complexity_grade', 'Unknown')}
        - Linear scaling: {'✅ Yes' if complexity_analysis.get('is_linear', False) else '❌ No'}''' if complexity_analysis else '- Analysis unavailable due to test failures'}

        ## Performance Analysis
        - **Average processing rate**: {avg_efficiency:.1f} documents/second
        - **CPU efficiency**: {'Good' if avg_efficiency > 5.0 else 'Needs optimization'}
        - **Memory usage**: {'Efficient' if complexity_analysis.get('is_linear', True) else 'High memory usage detected'}
        - **Scalability**: {'Excellent' if complexity_analysis.get('is_linear', False) else 'Poor - optimization needed'}

        ## Bottleneck Analysis
        - Primary bottleneck: {'spaCy NLP processing' if avg_efficiency < 2.0 else 'Embedding generation' if avg_efficiency < 5.0 else 'Similarity calculations'}
        - Complexity issues: {'Yes - quadratic behavior' if complexity_analysis.get('large_scaling_factor', 0) > 50 else 'No significant issues'}
        - Memory pressure: {'High' if complexity_analysis.get('large_scaling_factor', 0) > 20 else 'Normal'}

        ## Optimization Recommendations
        - spaCy optimization: {'Critical - use smaller models' if avg_efficiency < 1.0 else 'Standard monitoring'}
        - Embedding caching: {'High priority' if avg_efficiency < 3.0 else 'Low priority'}
        - Batch processing: {'Implement parallelization' if complexity_analysis.get('large_scaling_factor', 0) > 15 else 'Current approach adequate'}
        - Memory management: {'Optimize algorithms' if complexity_analysis.get('large_scaling_factor', 0) > 25 else 'Current usage acceptable'}

        ## Production Readiness
        - Processing rate grade: {'A' if avg_efficiency > 10.0 else 'B' if avg_efficiency > 5.0 else 'C'}
        - Scalability grade: {'A' if complexity_analysis.get('is_linear', False) else 'C'}
        - Overall assessment: {'Production ready' if avg_efficiency > 3.0 and complexity_analysis.get('is_linear', True) else 'Optimization required'}
        """

        section_analysis = [
            "Test Configuration",
            "Document Processing Performance",
            "Computational Complexity Analysis",
            "Performance Analysis",
            "Bottleneck Analysis",
            "Optimization Recommendations",
            "Production Readiness"
        ]

        perf_ctx.set_content(analysis_content, section_analysis)


        if avg_efficiency < 2.0:
            perf_ctx.add_warning(f"Low processing rate: {avg_efficiency:.1f} docs/second")
        if complexity_analysis.get("large_scaling_factor", 0) > 25:
            perf_ctx.add_warning(f"Poor algorithm scaling: {complexity_analysis['large_scaling_factor']:.1f}x factor")
        if not complexity_analysis.get("is_linear", True):
            perf_ctx.add_warning("Non-linear complexity detected - optimization needed")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_sentence_deduplication_performance(logger: logging.Logger) -> None:
    """
    Test sentence deduplication performance.
    Critical bottleneck: N² similarity comparisons with embedding generation.
    """

    with create_performance_context(
        test_name="sentence_deduplication_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "deduplication_performance",
            "operation": "sentence_similarity_analysis",
            "complexity": "quadratic_n_squared",
        },
        expected_patterns=["deduplication", "similarity", "embedding", "performance"]
    ) as perf_ctx:

        logger.info("=== SENTENCE DEDUPLICATION PERFORMANCE TEST ===")


        base_sentences = [
            "Melanoma is a type of skin cancer.",
            "Immunotherapy has shown promising results.",
            "Resistance mechanisms involve multiple pathways.",
            "Targeted therapies have improved outcomes.",
            "Biomarkers can predict treatment response."
        ]


        test_batches = {
            "small": base_sentences[:3],
            "medium": base_sentences * 2,
            "large": base_sentences * 4,
        }

        results = {}


        for size, sentences in test_batches.items():
            logger.info(f"Testing {size} batch deduplication ({len(sentences)} sentences)")

            with perf_ctx.stage_timer(f"{size}_batch_deduplication"):
                dedup_start = datetime.now(UTC)

                try:
                    deduplicated = await deduplicate_sentences(
                        sentences=sentences,
                    )

                    dedup_duration = (datetime.now(UTC) - dedup_start).total_seconds()


                    comparisons = len(sentences) * (len(sentences) - 1) // 2
                    comparisons_per_second = comparisons / dedup_duration if dedup_duration > 0 else 0

                    results[size] = {
                        "duration": dedup_duration,
                        "success": True,
                        "input_count": len(sentences),
                        "output_count": len(deduplicated),
                        "duplicates_removed": len(sentences) - len(deduplicated),
                        "comparisons": comparisons,
                        "comparisons_per_second": comparisons_per_second,
                        "time_per_comparison": dedup_duration / comparisons if comparisons > 0 else 0,
                    }

                    logger.info(
                        f"{size.capitalize()} deduplication completed",
                        duration_seconds=dedup_duration,
                        input_sentences=len(sentences),
                        output_sentences=len(deduplicated),
                        duplicates_removed=results[size]["duplicates_removed"],
                        comparisons=comparisons,
                    )

                except Exception as e:
                    dedup_duration = (datetime.now(UTC) - dedup_start).total_seconds()
                    results[size] = {
                        "duration": dedup_duration,
                        "success": False,
                        "error": str(e),
                        "input_count": len(sentences),
                    }
                    logger.error(f"{size.capitalize()} deduplication failed", exc_info=e)


        scaling_analysis = {}
        if all(results[size]["success"] for size in test_batches):
            small_time = results["small"]["duration"]
            medium_time = results["medium"]["duration"]
            large_time = results["large"]["duration"]


            small_n = results["small"]["input_count"]
            medium_n = results["medium"]["input_count"]
            large_n = results["large"]["input_count"]

            medium_expected_factor = (medium_n ** 2) / (small_n ** 2)
            large_expected_factor = (large_n ** 2) / (small_n ** 2)

            medium_actual_factor = medium_time / small_time if small_time > 0 else 1
            large_actual_factor = large_time / small_time if small_time > 0 else 1

            scaling_analysis = {
                "medium_expected": medium_expected_factor,
                "medium_actual": medium_actual_factor,
                "large_expected": large_expected_factor,
                "large_actual": large_actual_factor,
                "medium_efficiency": medium_actual_factor / medium_expected_factor,
                "large_efficiency": large_actual_factor / large_expected_factor,
                "is_quadratic": abs(medium_actual_factor - medium_expected_factor) < medium_expected_factor * 0.5,
            }

        analysis_content = f"""
        # Sentence Deduplication Performance Analysis

        ## Test Configuration
        - Algorithm: Embedding-based similarity with N² comparisons
        - Similarity threshold: 0.85 (hardcoded)
        - Batch sizes: Small ({test_batches['small'].__len__()}), Medium ({test_batches['medium'].__len__()}), Large ({test_batches['large'].__len__()})
        - Expected complexity: O(N²)

        ## Deduplication Performance Results

        ### Small Batch ({results['small']['input_count']} sentences)
        - Duration: {results['small']['duration']:.3f} seconds
        - Comparisons: {results['small'].get('comparisons', 0)}
        - Output: {results['small'].get('output_count', 0)} sentences
        - Duplicates removed: {results['small'].get('duplicates_removed', 0)}
        - Comparison rate: {results['small'].get('comparisons_per_second', 0):.0f} comparisons/second
        - Status: {'✅ Success' if results['small']['success'] else '❌ Failed'}

        ### Medium Batch ({results['medium']['input_count']} sentences)
        - Duration: {results['medium']['duration']:.3f} seconds
        - Comparisons: {results['medium'].get('comparisons', 0)}
        - Output: {results['medium'].get('output_count', 0)} sentences
        - Duplicates removed: {results['medium'].get('duplicates_removed', 0)}
        - Comparison rate: {results['medium'].get('comparisons_per_second', 0):.0f} comparisons/second
        - Status: {'✅ Success' if results['medium']['success'] else '❌ Failed'}

        ### Large Batch ({results['large']['input_count']} sentences)
        - Duration: {results['large']['duration']:.3f} seconds
        - Comparisons: {results['large'].get('comparisons', 0)}
        - Output: {results['large'].get('output_count', 0)} sentences
        - Duplicates removed: {results['large'].get('duplicates_removed', 0)}
        - Comparison rate: {results['large'].get('comparisons_per_second', 0):.0f} comparisons/second
        - Status: {'✅ Success' if results['large']['success'] else '❌ Failed'}

        ## N² Complexity Analysis
        {f'''- Medium batch scaling: {scaling_analysis.get('medium_actual', 0):.1f}x actual vs {scaling_analysis.get('medium_expected', 0):.1f}x expected
        - Large batch scaling: {scaling_analysis.get('large_actual', 0):.1f}x actual vs {scaling_analysis.get('large_expected', 0):.1f}x expected
        - Medium efficiency: {scaling_analysis.get('medium_efficiency', 0):.2f} (1.0 = perfect N²)
        - Large efficiency: {scaling_analysis.get('large_efficiency', 0):.2f} (1.0 = perfect N²)
        - Quadratic behavior: {'✅ Confirmed' if scaling_analysis.get('is_quadratic', False) else '❌ Unexpected scaling'}''' if scaling_analysis else '- Analysis unavailable due to test failures'}

        ## Performance Analysis
        - **Average comparison rate**: {sum(r.get('comparisons_per_second', 0) for r in results.values() if r.get('success')) / len([r for r in results.values() if r.get('success')]):.0f} comparisons/second
        - **Embedding efficiency**: {'Good' if results['small']['duration'] < 0.1 else 'Slow embedding generation'}
        - **Similarity computation**: {'Efficient' if results['large'].get('comparisons_per_second', 0) > 1000 else 'Optimization needed'}
        - **Memory usage**: {'High - N² space complexity' if results['large']['input_count'] > 15 else 'Manageable'}

        ## Bottleneck Analysis
        - Primary bottleneck: {'Embedding generation' if results['small']['duration'] > 0.05 else 'Similarity calculations'}
        - Scaling bottleneck: {'Memory allocation' if scaling_analysis.get('large_efficiency', 1) > 1.5 else 'CPU computation'}
        - Algorithm efficiency: {'Good' if scaling_analysis.get('large_efficiency', 1) < 1.2 else 'Suboptimal implementation'}

        ## Optimization Recommendations
        - Algorithm optimization: {'Critical - implement approximate methods' if results['large']['duration'] > 2.0 else 'Standard monitoring'}
        - Embedding caching: {'High priority' if results['small']['duration'] > 0.05 else 'Low priority'}
        - Batch size limits: {f"Implement - max {max(10, results['medium']['input_count'])} sentences" if results['large']['duration'] > 1.0 else 'Current limits adequate'}
        - Parallel processing: {'Implement for large batches' if results['large']['duration'] > 0.5 else 'Current approach adequate'}

        ## Production Guidelines
        - Recommended max batch size: {10 if results['large']['duration'] > 1.0 else 20 if results['large']['duration'] > 0.5 else 50}
        - Performance grade: {'A' if results['large']['duration'] < 0.5 else 'B' if results['large']['duration'] < 1.0 else 'C'}
        - Scalability: {'Excellent' if results['large']['duration'] < 0.3 else 'Good' if results['large']['duration'] < 1.0 else 'Needs optimization'}
        """

        section_analysis = [
            "Test Configuration",
            "Deduplication Performance Results",
            "N² Complexity Analysis",
            "Performance Analysis",
            "Bottleneck Analysis",
            "Optimization Recommendations",
            "Production Guidelines"
        ]

        perf_ctx.set_content(analysis_content, section_analysis)


        if results["large"]["duration"] > 2.0:
            perf_ctx.add_warning(f"Slow deduplication for large batches: {results['large']['duration']:.1f}s")
        if scaling_analysis.get("large_efficiency", 1) > 2.0:
            perf_ctx.add_warning(f"Poor scaling efficiency: {scaling_analysis['large_efficiency']:.1f}x worse than expected")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_semantic_ranking_performance(logger: logging.Logger) -> None:
    """
    Smoke test for semantic ranking performance.
    Tests sentence transformer model inference speed.
    """

    with create_performance_context(
        test_name="semantic_ranking_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "smoke",
            "operation": "semantic_similarity_ranking",
        },
        expected_patterns=["semantic", "ranking", "similarity", "performance"]
    ) as perf_ctx:

        logger.info("=== SEMANTIC RANKING PERFORMANCE TEST ===")


        test_sentences = [
            "Melanoma research focuses on immunotherapy approaches.",
            "Targeted therapy has improved melanoma outcomes significantly.",
            "Resistance mechanisms in melanoma involve multiple pathways.",
            "Biomarker discovery is crucial for personalized treatment.",
            "Clinical trials are evaluating combination therapies."
        ]

        query = "melanoma immunotherapy research"

        with perf_ctx.stage_timer("semantic_ranking"):
            ranking_start = datetime.now(UTC)

            try:
                ranked_sentences = await apply_semantic_ranking(
                    sentences=test_sentences,
                    query=query,
                )

                ranking_duration = (datetime.now(UTC) - ranking_start).total_seconds()

                smoke_content = f"""
                # Semantic Ranking Performance Smoke Test

                ## Results
                - Duration: {ranking_duration:.3f} seconds
                - Sentences ranked: {len(test_sentences)}
                - Query: "{query}"
                - Output: {len(ranked_sentences)} ranked sentences
                - Ranking rate: {len(test_sentences) / ranking_duration:.1f} sentences/second

                ## Analysis
                - Model inference speed: {'Excellent' if ranking_duration < 0.1 else 'Good' if ranking_duration < 0.5 else 'Needs optimization'}
                - Throughput: {'High' if len(test_sentences) / ranking_duration > 20 else 'Moderate' if len(test_sentences) / ranking_duration > 5 else 'Low'}
                - Performance grade: {'A' if ranking_duration < 0.2 else 'B' if ranking_duration < 0.5 else 'C'}

                ## Status: {'PASSED ✓' if ranking_duration < 1.0 and len(ranked_sentences) == len(test_sentences) else 'NEEDS OPTIMIZATION ⚠️'}
                """

                logger.info(
                    "Semantic ranking completed",
                    duration_seconds=ranking_duration,
                    sentences_count=len(test_sentences),
                    ranking_rate=len(test_sentences) / ranking_duration,
                )

            except Exception as e:
                ranking_duration = (datetime.now(UTC) - ranking_start).total_seconds()

                smoke_content = f"""
                # Semantic Ranking Performance Smoke Test

                ## Results
                - Duration: {ranking_duration:.3f} seconds (failed)
                - Error: {str(e)[:100]}...
                - Status: ❌ FAILED

                ## Analysis
                - Model availability: Issues detected
                - Error type: {type(e).__name__}

                ## Status: FAILED ❌
                """

                logger.error("Semantic ranking failed", error=str(e))

        perf_ctx.set_content(smoke_content, ["Results", "Analysis", "Status"])

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="B")

    return perf_ctx.result
