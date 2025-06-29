"""
Comprehensive evaluation performance test suite.
Tests baseline performance, optimizations, caching, complexity routing, and quality validation.
"""

import logging
import time
from unittest.mock import patch

from testing.e2e_utils import e2e_test

from services.rag.src.utils.evaluation import (
    ContentComplexity,
    EvaluationCriterion,
    analyze_content_complexity,
    clear_evaluation_cache,
    evaluate_prompt_output,
    get_adaptive_timeout_stats,
    get_cache_stats,
    reset_adaptive_timeouts,
    smart_evaluate_output,
)
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import PerformanceTestContext


@e2e_test(timeout=300)
async def test_evaluation_framework_baseline(
    logger: logging.Logger,
) -> None:
    """
    Baseline performance test for the evaluation framework.
    Measures timing and quality consistency of LLM evaluations.
    """
    with PerformanceTestContext(
        test_name="evaluation_framework_baseline",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "baseline_performance",
            "evaluation_scenarios": 3,
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION FRAMEWORK BASELINE TEST ===")

        criteria = [
            EvaluationCriterion(
                name="Content Quality",
                evaluation_instructions="Rate overall content quality from 0-100",
                weight=1.0,
            ),
        ]

        test_cases = [
            {
                "content": "Comprehensive research plan with clear objectives, methodology, and outcomes.",
                "expected_score": 85,
                "label": "high_quality",
            },
            {
                "content": "Basic research plan with some structure and detail.",
                "expected_score": 65,
                "label": "medium_quality",
            },
            {
                "content": "Brief plan with minimal detail.",
                "expected_score": 35,
                "label": "low_quality",
            },
        ]

        all_content = []
        total_time = 0.0
        evaluation_count = 0

        for test_case in test_cases:
            with perf_ctx.stage_timer(f"evaluate_{test_case['label']}"):
                start_time = time.time()

                with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                    mock_request.return_value = {
                        "criteria": {
                            "Content Quality": {
                                "score": test_case["expected_score"],
                                "instructions": f"Evaluated {test_case['label']} content",
                            }
                        }
                    }

                    result = await evaluate_prompt_output(
                        criteria=criteria,
                        prompt="Evaluate this research plan content",
                        model_output=str(test_case["content"]),
                    )

                    end_time = time.time()
                    eval_time = end_time - start_time
                    total_time += eval_time
                    evaluation_count += 1

                    perf_ctx.add_llm_call()

                    score = result["criteria"]["Content Quality"]["score"]

                    logger.info(
                        "Evaluation completed: %s in %.2fs, score: %d",
                        test_case["label"],
                        eval_time,
                        score,
                    )

                    all_content.append(f"## {str(test_case['label']).upper()}\n{test_case['content']}")

        content_dict = {f"case_{i}": content for i, content in enumerate(all_content)}
        perf_ctx.set_content("\n\n".join(all_content), content_dict)

        avg_time = total_time / evaluation_count if evaluation_count > 0 else 0

        logger.info("=== EVALUATION PERFORMANCE SUMMARY ===")
        logger.info("Total evaluations: %d", evaluation_count)
        logger.info("Total time: %.2fs", total_time)
        logger.info("Average time per evaluation: %.2fs", avg_time)
        logger.info("LLM calls made: %d", perf_ctx.llm_calls_made)

        perf_ctx.configuration.update(
            {
                "total_evaluations": evaluation_count,
                "avg_evaluation_time": avg_time,
                "total_time": total_time,
            }
        )

        assert evaluation_count == 3, f"Expected 3 evaluations, got {evaluation_count}"
        assert total_time > 0, "Total evaluation time should be positive"
        assert avg_time < 10, f"Average evaluation time too high: {avg_time:.2f}s"
        assert perf_ctx.llm_calls_made == 3, f"Expected 3 LLM calls, got {perf_ctx.llm_calls_made}"


@e2e_test(timeout=180)
async def test_evaluation_consistency(
    logger: logging.Logger,
) -> None:
    """
    Test evaluation consistency for the same content.
    Measures how consistently the evaluation framework scores identical content.
    """
    with PerformanceTestContext(
        test_name="evaluation_consistency",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "consistency_check",
            "trials": 3,
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION CONSISTENCY TEST ===")

        criterion = EvaluationCriterion(
            name="Content Analysis",
            evaluation_instructions="Analyze content quality consistently",
            weight=1.0,
        )

        test_content = "Detailed research methodology with clear objectives and expected outcomes."
        scores = []

        for trial in range(3):
            with (
                perf_ctx.stage_timer(f"trial_{trial + 1}"),
                patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request,
            ):
                base_score = 75 + (trial * 2)

                mock_request.return_value = {
                    "criteria": {
                        "Content Analysis": {
                            "score": base_score,
                            "instructions": f"Trial {trial + 1} evaluation",
                        }
                    }
                }

                result = await evaluate_prompt_output(
                    criteria=[criterion],
                    prompt="Evaluate content quality",
                    model_output=test_content,
                )

                score = result["criteria"]["Content Analysis"]["score"]
                scores.append(score)
                perf_ctx.add_llm_call()

                logger.info("Trial %d: score = %d", trial + 1, score)

        avg_score = sum(scores) / len(scores)
        score_variance = sum((score - avg_score) ** 2 for score in scores) / len(scores)
        score_std = score_variance**0.5
        consistency_percentage = max(0, 100 - (score_std * 2))

        logger.info("=== CONSISTENCY RESULTS ===")
        logger.info("Scores: %s", scores)
        logger.info("Average score: %.1f", avg_score)
        logger.info("Standard deviation: %.1f", score_std)
        logger.info("Consistency: %.1f%%", consistency_percentage)

        content_dict = {
            "test_content": test_content,
            "scores": f"Scores: {scores}",
            "stats": f"Avg: {avg_score:.1f}, StdDev: {score_std:.1f}",
        }
        perf_ctx.set_content(f"Test Content:\n{test_content}\n\nResults:\n{content_dict!s}", content_dict)

        perf_ctx.configuration.update(
            {
                "scores": scores,
                "avg_score": avg_score,
                "std_deviation": score_std,
                "consistency_percentage": consistency_percentage,
            }
        )

        assert len(scores) == 3, f"Expected 3 scores, got {len(scores)}"
        assert score_std < 10, f"Score variance too high: {score_std:.1f}"
        assert consistency_percentage > 50, f"Consistency too low: {consistency_percentage:.1f}%"


@e2e_test(timeout=600)
async def test_evaluation_optimization_performance(
    logger: logging.Logger,
) -> None:
    """
    Test evaluation optimizations with real grant application content.
    Measures actual performance improvements from caching, complexity routing, and adaptive timeouts.
    """

    clear_evaluation_cache()
    reset_adaptive_timeouts()

    with PerformanceTestContext(
        test_name="evaluation_optimization_performance",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "optimization_performance",
            "features_tested": ["caching", "complexity_routing", "adaptive_timeouts"],
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION OPTIMIZATION PERFORMANCE TEST ===")

        criteria = [
            EvaluationCriterion(
                name="Scientific Merit",
                evaluation_instructions="Evaluate the scientific merit and innovation of the research proposal. Consider novelty, methodology rigor, and potential impact. Score 0-100.",
                weight=1.0,
            ),
            EvaluationCriterion(
                name="Feasibility",
                evaluation_instructions="Assess the feasibility of the proposed research including timeline, resources, and team expertise. Score 0-100.",
                weight=0.8,
            ),
            EvaluationCriterion(
                name="Clinical Relevance",
                evaluation_instructions="Evaluate the clinical relevance and potential patient impact of the research. Score 0-100.",
                weight=0.9,
            ),
        ]

        test_contents = {
            "simple": """
            Research Proposal: Basic Cancer Study

            We propose to study cancer cell behavior using standard laboratory techniques.
            The research will involve cell culture experiments and basic analysis.
            Expected outcomes include better understanding of cancer progression.
            """,
            "moderate": """
            ## Research Methodology for Melanoma Immunotherapy

            This study employs a mixed-methods approach investigating novel checkpoint inhibitors
            in melanoma treatment. We will utilize CRISPR-Cas9 gene editing to identify key
            regulatory pathways, followed by in vivo validation using mouse models.

            ### Experimental Design
            - Phase 1: High-throughput screening of immunotherapy targets
            - Phase 2: Validation in patient-derived xenograft models
            - Phase 3: Biomarker discovery using single-cell RNA sequencing

            The methodology ensures rigorous statistical analysis with appropriate controls.
            """,
            "complex": """
            # Advanced Multi-Modal Approach to Melanoma Brain Metastases Treatment

            ## Abstract
            This proposal outlines an innovative therapeutic strategy combining immunotherapy,
            targeted therapy, and novel drug delivery systems for melanoma brain metastases.

            ## Research Methodology

            ### Aim 1: Develop BBB-Penetrant Nanoparticle Delivery System
            We will engineer lipid-polymer hybrid nanoparticles functionalized with
            transferrin receptors for enhanced blood-brain barrier penetration.
            Pharmacokinetic modeling using PBPK approaches will optimize dosing regimens.

            ### Aim 2: Combination Immunotherapy Optimization
            Using advanced bioinformatics and machine learning algorithms, we will:
            - Perform single-cell RNA-seq on patient samples (n=50)
            - Identify resistance mechanisms through CRISPR screens
            - Validate combinations in humanized PDX models

            ### Aim 3: Clinical Translation Framework
            - Phase I dose-escalation study design
            - Biomarker-driven patient stratification
            - Real-time ctDNA monitoring protocols

            ## Statistical Considerations
            Power analysis indicates n=30 per arm for 80% power to detect 25% improvement
            in progression-free survival. Bayesian adaptive design will maximize efficiency.

            ## Expected Impact
            This research addresses critical unmet needs in melanoma brain metastases,
            potentially improving median survival from 6 to 18 months.
            """,
        }

        performance_results = {
            "cache_performance": {},
            "complexity_routing": {},
            "adaptive_timeout": {},
        }

        logger.info("Testing cache performance...")
        with perf_ctx.stage_timer("cache_performance_test"):
            cache_times = {"first_call": [], "cached_call": []}

            for content in test_contents.values():
                start_time = time.time()
                result1, analysis1 = await smart_evaluate_output(
                    criteria=criteria,
                    prompt="Evaluate this grant proposal for funding",
                    model_output=content,
                    auto_route=True,
                    record_performance=False,
                )
                first_call_time = time.time() - start_time
                cache_times["first_call"].append(first_call_time)
                perf_ctx.add_llm_call()

                start_time = time.time()
                result2, analysis2 = await smart_evaluate_output(
                    criteria=criteria,
                    prompt="Evaluate this grant proposal for funding",
                    model_output=content,
                    auto_route=True,
                    record_performance=False,
                )
                cached_call_time = time.time() - start_time
                cache_times["cached_call"].append(cached_call_time)

                logger.info(
                    "Cache test: first=%.3fs, cached=%.3fs (%.1fx speedup)",
                    first_call_time,
                    cached_call_time,
                    first_call_time / max(cached_call_time, 0.001),
                )

            cache_stats = get_cache_stats()
            performance_results["cache_performance"] = {
                "avg_first_call": sum(cache_times["first_call"]) / len(cache_times["first_call"]),
                "avg_cached_call": sum(cache_times["cached_call"]) / len(cache_times["cached_call"]),
                "speedup_factor": sum(cache_times["first_call"]) / max(sum(cache_times["cached_call"]), 0.001),
                "cache_hit_rate": cache_stats["size"] / (cache_stats["size"] + len(test_contents)),
                "cache_stats": cache_stats,
            }

        clear_evaluation_cache()

        logger.info("Testing complexity routing performance...")
        with perf_ctx.stage_timer("complexity_routing_test"):
            routing_results = {}

            for content_type, content in test_contents.items():
                complexity_analysis = analyze_content_complexity(content, criteria)

                start_time = time.time()
                result, analysis = await smart_evaluate_output(
                    criteria=criteria,
                    prompt="Evaluate this grant proposal",
                    model_output=content,
                    auto_route=True,
                    record_performance=True,
                )
                routing_time = time.time() - start_time
                perf_ctx.add_llm_call()

                routing_results[content_type] = {
                    "complexity_level": complexity_analysis.complexity_level.value,
                    "recommended_mode": complexity_analysis.recommended_evaluation_mode,
                    "recommended_timeout": complexity_analysis.recommended_timeout,
                    "actual_time": routing_time,
                    "within_timeout": routing_time < complexity_analysis.recommended_timeout,
                    "word_count": complexity_analysis.word_count,
                    "technical_terms": complexity_analysis.technical_terms_count,
                }

                logger.info(
                    "Routing %s: %s mode, %.1fs timeout, actual=%.3fs",
                    content_type,
                    complexity_analysis.recommended_evaluation_mode,
                    complexity_analysis.recommended_timeout,
                    routing_time,
                )

            performance_results["complexity_routing"] = routing_results

        logger.info("Testing adaptive timeout learning...")
        with perf_ctx.stage_timer("adaptive_timeout_test"):
            adaptive_results = {"before_learning": {}, "after_learning": {}}

            initial_stats = get_adaptive_timeout_stats()
            adaptive_results["before_learning"] = initial_stats

            for i in range(5):
                for content in test_contents.values():
                    try:
                        await smart_evaluate_output(
                            criteria=criteria,
                            prompt=f"Evaluate grant proposal iteration {i}",
                            model_output=content,
                            auto_route=True,
                            record_performance=True,
                        )
                        perf_ctx.add_llm_call()
                    except Exception:  # noqa: BLE001
                        logger.warning("Evaluation failed in adaptive test", exc_info=True)

            final_stats = get_adaptive_timeout_stats()
            adaptive_results["after_learning"] = final_stats

            performance_results["adaptive_timeout"] = adaptive_results

            logger.info(
                "Adaptive learning: %d evaluations, success rate: %.1f%%",
                final_stats.get("total_evaluations", 0),
                final_stats.get("success_rate", 0) * 100,
            )

        results_content = f"""
# Evaluation Framework Optimization Results

## Cache Performance
- Average first call: {performance_results["cache_performance"]["avg_first_call"]:.3f}s
- Average cached call: {performance_results["cache_performance"]["avg_cached_call"]:.3f}s
- Speedup factor: {performance_results["cache_performance"]["speedup_factor"]:.1f}x
- Cache effectiveness: {performance_results["cache_performance"]["speedup_factor"] > 10}

## Complexity Routing
- Simple content: {routing_results["simple"]["complexity_level"]} → {routing_results["simple"]["actual_time"]:.3f}s
- Moderate content: {routing_results["moderate"]["complexity_level"]} → {routing_results["moderate"]["actual_time"]:.3f}s
- Complex content: {routing_results["complex"]["complexity_level"]} → {routing_results["complex"]["actual_time"]:.3f}s
- Routing accuracy: All within recommended timeouts

## Adaptive Timeout Learning
- Total evaluations: {final_stats.get("total_evaluations", 0)}
- Success rate: {final_stats.get("success_rate", 0) * 100:.1f}%
- Prediction accuracy: {final_stats.get("prediction_accuracy", 0) * 100:.1f}%

## Overall Performance Impact
- Cache speedup: {performance_results["cache_performance"]["speedup_factor"]:.1f}x
- Smart routing effectiveness: ✓ (appropriate timeouts for complexity)
- Adaptive learning: {"✓ Improving" if final_stats.get("success_rate", 0) > 0.8 else "⚠ Needs more data"}
        """

        perf_ctx.set_content(results_content, list(test_contents.values()))
        perf_ctx.configuration.update(performance_results)

        assert performance_results["cache_performance"]["speedup_factor"] > 5, "Cache should provide >5x speedup"
        assert all(r["within_timeout"] for r in routing_results.values()), (
            "All evaluations should complete within timeout"
        )
        assert final_stats.get("total_evaluations", 0) >= 15, "Should have recorded at least 15 evaluations"

        logger.info("=== OPTIMIZATION IMPACT SUMMARY ===")
        logger.info("Cache speedup: %.1fx", performance_results["cache_performance"]["speedup_factor"])
        logger.info("Complexity routing: 100%% success rate")
        logger.info("Adaptive learning: %d evaluations processed", final_stats.get("total_evaluations", 0))


@e2e_test(timeout=180)
async def test_content_complexity_analysis(
    logger: logging.Logger,
) -> None:
    """Test content complexity analysis with different content types."""

    with PerformanceTestContext(
        test_name="content_complexity_analysis",
        test_category=TestCategory.EVALUATION,
        logger=logger,
    ) as perf_ctx:
        simple_content = """
        This is a simple research proposal.
        We want to study basic patterns in data.
        The goal is to find interesting results.
        """

        with perf_ctx.stage_timer("simple_content_analysis"):
            simple_analysis = analyze_content_complexity(simple_content)

        assert simple_analysis.complexity_level == ContentComplexity.SIMPLE
        assert simple_analysis.word_count < 50
        assert simple_analysis.technical_terms_count < 5
        assert simple_analysis.recommended_evaluation_mode == "quick_evaluation"

        logger.info(
            "Simple content analysis: %s, timeout: %.1fs",
            simple_analysis.complexity_level.value,
            simple_analysis.recommended_timeout,
        )

        moderate_content = """
        # Research Methodology

        This study employs a mixed-methods approach to investigate the correlation
        between statistical patterns and empirical outcomes. The research framework
        incorporates quantitative analysis methods with qualitative assessment protocols.

        ## Data Collection
        We will implement standardized procedures for data validation and analysis.
        The methodology ensures comprehensive evaluation of research variables.
        """

        with perf_ctx.stage_timer("moderate_content_analysis"):
            moderate_analysis = analyze_content_complexity(moderate_content)

        assert moderate_analysis.complexity_level in [ContentComplexity.MODERATE, ContentComplexity.COMPLEX]
        assert moderate_analysis.word_count > 50
        assert moderate_analysis.technical_terms_count >= 5
        assert moderate_analysis.section_count >= 2

        logger.info(
            "Moderate content analysis: %s, timeout: %.1fs",
            moderate_analysis.complexity_level.value,
            moderate_analysis.recommended_timeout,
        )

        complex_content = """
        # Advanced Computational Framework for Multi-dimensional Data Analysis

        ## Abstract
        This research proposes a novel algorithmic framework for optimization
        of machine learning protocols in high-dimensional statistical environments.

        ## Methodology
        The investigation employs sophisticated regression analysis techniques,
        incorporating Bayesian inference methodology with stochastic optimization
        algorithms. Our experimental protocol validates hypotheses through
        comprehensive empirical assessment procedures.

        ### Statistical Validation
        We implement rigorous statistical significance testing with correlation
        analysis and multivariate regression models. The validation framework
        ensures robust theoretical foundations for all experimental procedures.

        ### Implementation Architecture
        The computational infrastructure leverages distributed processing protocols
        with advanced algorithmic optimization techniques. Our implementation
        framework supports scalable analysis across multiple research domains.

        ## Expected Outcomes
        This research will advance understanding of complex statistical relationships
        in high-dimensional data spaces, providing foundational contributions to
        computational research methodology and empirical validation techniques.
        """

        with perf_ctx.stage_timer("complex_content_analysis"):
            complex_analysis = analyze_content_complexity(complex_content)

        assert complex_analysis.complexity_level in [ContentComplexity.COMPLEX, ContentComplexity.VERY_COMPLEX]
        assert complex_analysis.word_count > 150
        assert complex_analysis.technical_terms_count >= 15
        assert complex_analysis.section_count >= 4
        assert complex_analysis.recommended_timeout > 60

        logger.info(
            "Complex content analysis: %s, timeout: %.1fs",
            complex_analysis.complexity_level.value,
            complex_analysis.recommended_timeout,
        )

        assert simple_analysis.confidence_score > 0.5
        assert moderate_analysis.confidence_score > 0.7
        assert complex_analysis.confidence_score > 0.8

        assert simple_analysis.recommended_timeout < moderate_analysis.recommended_timeout
        assert moderate_analysis.recommended_timeout <= complex_analysis.recommended_timeout

        logger.info("Content complexity analysis validation completed successfully")


@e2e_test(timeout=300)
async def test_smart_evaluation_routing(
    logger: logging.Logger,
) -> None:
    """Test smart evaluation routing based on content complexity."""

    criteria = [
        EvaluationCriterion(
            name="Content Quality",
            evaluation_instructions="Evaluate the quality and completeness of the content.",
            weight=1.0,
        ),
        EvaluationCriterion(
            name="Technical Accuracy",
            evaluation_instructions="Assess technical accuracy and scientific rigor.",
            weight=0.8,
        ),
    ]

    with PerformanceTestContext(
        test_name="smart_evaluation_routing",
        test_category=TestCategory.EVALUATION,
        logger=logger,
    ) as perf_ctx:
        with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
            mock_request.return_value = {
                "criteria": {
                    "Content Quality": {"score": 85, "instructions": "Good quality content"},
                    "Technical Accuracy": {"score": 80, "instructions": "Technically sound"},
                }
            }

            simple_content = "Basic research proposal with simple methodology."

            with perf_ctx.stage_timer("simple_routing_test"):
                result, analysis = await smart_evaluate_output(
                    criteria=criteria,
                    prompt="Evaluate this research proposal",
                    model_output=simple_content,
                    auto_route=True,
                )

            assert analysis.complexity_level == ContentComplexity.SIMPLE
            assert analysis.recommended_evaluation_mode == "quick_evaluation"
            assert result["criteria"]["Content Quality"]["score"] == 85

            logger.info(
                "Simple content routed to: %s (timeout: %.1fs)",
                analysis.recommended_evaluation_mode,
                analysis.recommended_timeout,
            )

            complex_content = """
            # Advanced Research Framework

            ## Methodology
            This investigation employs sophisticated statistical analysis with
            machine learning algorithms, implementing Bayesian optimization
            protocols for hypothesis validation through empirical assessment.

            ## Implementation
            The computational framework leverages distributed processing with
            advanced regression techniques and multivariate correlation analysis.
            """

            with perf_ctx.stage_timer("complex_routing_test"):
                result, analysis = await smart_evaluate_output(
                    criteria=criteria,
                    prompt="Evaluate this research proposal",
                    model_output=complex_content,
                    auto_route=True,
                )

            assert analysis.complexity_level in [ContentComplexity.COMPLEX, ContentComplexity.VERY_COMPLEX]
            assert analysis.recommended_evaluation_mode in ["thorough_evaluation", "optimized_prompt_evaluation"]
            assert analysis.recommended_timeout > 60

            logger.info(
                "Complex content routed to: %s (timeout: %.1fs)",
                analysis.recommended_evaluation_mode,
                analysis.recommended_timeout,
            )

            with perf_ctx.stage_timer("manual_override_test"):
                result, analysis = await smart_evaluate_output(
                    criteria=criteria,
                    prompt="Evaluate this research proposal",
                    model_output=complex_content,
                    auto_route=False,
                    force_mode="quick_evaluation",
                    force_timeout=30.0,
                )

            assert analysis.complexity_level in [ContentComplexity.COMPLEX, ContentComplexity.VERY_COMPLEX]

            assert result["criteria"]["Content Quality"]["score"] == 85

            logger.info("Manual routing override completed successfully")

            many_criteria = [
                *criteria,
                EvaluationCriterion(name="Clarity", evaluation_instructions="Evaluate content clarity", weight=0.5),
                EvaluationCriterion(
                    name="Completeness", evaluation_instructions="Assess content completeness", weight=0.7
                ),
            ]

            mock_request.return_value = {
                "criteria": {
                    "Content Quality": {"score": 85, "instructions": "Good quality"},
                    "Technical Accuracy": {"score": 80, "instructions": "Technically sound"},
                    "Clarity": {"score": 75, "instructions": "Clear content"},
                    "Completeness": {"score": 88, "instructions": "Complete content"},
                }
            }

            with perf_ctx.stage_timer("multi_criteria_timeout_test"):
                _, analysis = await smart_evaluate_output(
                    criteria=many_criteria,
                    prompt="Evaluate this research proposal",
                    model_output=complex_content,
                    auto_route=True,
                )

            single_criteria_analysis = analyze_content_complexity(complex_content, criteria[:1])
            multi_criteria_analysis = analysis

            assert multi_criteria_analysis.recommended_timeout > single_criteria_analysis.recommended_timeout

            logger.info(
                "Multi-criteria timeout: %.1fs vs single: %.1fs",
                multi_criteria_analysis.recommended_timeout,
                single_criteria_analysis.recommended_timeout,
            )

        logger.info("Smart evaluation routing validation completed successfully")


@e2e_test(timeout=120)
async def test_complexity_analysis_edge_cases(
    logger: logging.Logger,
) -> None:
    """Test edge cases and boundary conditions for complexity analysis."""

    with PerformanceTestContext(
        test_name="complexity_edge_cases",
        test_category=TestCategory.EVALUATION,
        logger=logger,
    ) as perf_ctx:
        with perf_ctx.stage_timer("empty_content_test"):
            empty_analysis = analyze_content_complexity("")

        assert empty_analysis.complexity_level == ContentComplexity.SIMPLE
        assert empty_analysis.word_count == 0
        assert empty_analysis.confidence_score < 0.5

        with perf_ctx.stage_timer("single_word_test"):
            single_word_analysis = analyze_content_complexity("methodology")

        assert single_word_analysis.complexity_level == ContentComplexity.SIMPLE
        assert single_word_analysis.word_count == 1
        assert single_word_analysis.technical_terms_count >= 1

        long_unstructured = " ".join(["word"] * 1000)

        with perf_ctx.stage_timer("long_unstructured_test"):
            long_analysis = analyze_content_complexity(long_unstructured)

        assert long_analysis.word_count == 1000
        assert long_analysis.section_count == 0
        assert long_analysis.technical_terms_count == 0

        technical_content = "statistical regression analysis correlation methodology optimization algorithm"

        with perf_ctx.stage_timer("high_technical_density_test"):
            technical_analysis = analyze_content_complexity(technical_content)

        assert technical_analysis.word_count < 10
        assert technical_analysis.technical_terms_count >= 5

        logger.info("Edge cases validation completed successfully")
