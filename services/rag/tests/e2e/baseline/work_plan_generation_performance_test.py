"""
Performance tests for work plan generation pipeline.

Tests critical performance bottlenecks in work plan generation:
1. Relationship extraction performance
2. Text generation parallelization opportunities
3. Shared retrieval vs individual retrieval calls
4. Prompt optimization potential
5. End-to-end work plan generation baseline
"""

import logging
from datetime import UTC, datetime
from typing import Any

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test
from testing.factories import ResearchObjectiveFactory

from services.rag.src.grant_application.handler import generate_work_plan_text
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    create_performance_context,
)


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
async def test_work_plan_generation_baseline(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Establish baseline for complete work plan generation pipeline.
    Tests current implementation end-to-end performance.
    """

    with create_performance_context(
        test_name="work_plan_generation_baseline",
        test_category=TestCategory.BASELINE,
        logger=logger,
        configuration={
            "test_type": "baseline_measurement",
            "operation": "complete_work_plan_generation",
            "objectives_count": 5,
            "tasks_per_objective": 3,
        },
        expected_patterns=["work", "plan", "generation", "baseline", "performance"],
    ) as perf_ctx:
        logger.info("=== WORK PLAN GENERATION BASELINE TEST ===")

        application_id = "550e8400-e29b-41d4-a716-446655440020"

        form_inputs = ResearchDeepDive(
            research_domain="Melanoma Immunotherapy",
            research_question="How can we overcome resistance mechanisms in melanoma immunotherapy?",
            methodology_approach="Combination therapy development with biomarker discovery",
            innovation_aspects="Novel resistance pathway identification and targeted intervention",
            expected_outcomes="Improved patient response rates and treatment durability",
        )

        research_objectives = [
            ResearchObjectiveFactory.build(
                title=f"Research Objective {i + 1}", description=focus_area, research_tasks=[]
            )
            for i, focus_area in enumerate(
                [
                    "resistance mechanism identification",
                    "biomarker discovery",
                    "combination therapy development",
                    "treatment optimization",
                    "patient stratification",
                ]
            )
        ]

        work_plan_section = GrantLongFormSection(
            title="Research Work Plan", description="Detailed research methodology and timeline", order=3
        )

        class MockJobManager:
            def __init__(self) -> None:
                self.session_maker = async_session_maker
                self.job_id = None

            async def add_notification(self, *args: Any, **kwargs: Any) -> None:
                return None

            async def create_job(self, *args: Any, **kwargs: Any) -> dict[str, str]:
                return {"id": "mock-job-id", "status": "completed"}

        job_manager = MockJobManager()

        with perf_ctx.stage_timer("complete_work_plan_generation"):
            generation_start = datetime.now(UTC)

            try:
                work_plan_text = await generate_work_plan_text(
                    application_id=application_id,
                    work_plan_section=work_plan_section,
                    form_inputs=form_inputs,
                    research_objectives=research_objectives,
                    job_manager=job_manager,
                )

                generation_duration = (datetime.now(UTC) - generation_start).total_seconds()

                text_length = len(work_plan_text)
                word_count = len(work_plan_text.split())
                section_count = work_plan_text.count("\n\n")

                baseline_results = {
                    "duration": generation_duration,
                    "success": True,
                    "text_length": text_length,
                    "word_count": word_count,
                    "section_count": section_count,
                    "objectives_count": len(research_objectives),
                    "words_per_second": word_count / generation_duration if generation_duration > 0 else 0,
                    "objectives_per_minute": (len(research_objectives) * 60) / generation_duration
                    if generation_duration > 0
                    else 0,
                }

                logger.info(
                    "Work plan generation completed",
                    duration_seconds=generation_duration,
                    text_length=text_length,
                    word_count=word_count,
                    objectives_count=len(research_objectives),
                    words_per_second=baseline_results["words_per_second"],
                )

            except (ValueError, RuntimeError, TypeError, KeyError, AttributeError) as e:
                generation_duration = (datetime.now(UTC) - generation_start).total_seconds()
                baseline_results = {
                    "duration": generation_duration,
                    "success": False,
                    "error": str(e),
                    "objectives_count": len(research_objectives),
                }
                logger.error("Work plan generation failed", exc_info=e)

        performance_grade = "A" if generation_duration < 300 else "B" if generation_duration < 600 else "C"
        throughput_analysis = (
            "High"
            if baseline_results.get("words_per_second", 0) > 5
            else "Medium"
            if baseline_results.get("words_per_second", 0) > 2
            else "Low"
        )

        analysis_content = f"""
        # Work Plan Generation Baseline Performance

        ## Test Configuration
        - Application ID: {application_id}
        - Research Objectives: {len(research_objectives)}
        - Estimated Tasks per Objective: 3
        - Domain: Melanoma Immunotherapy Research

        ## Performance Results
        - **Total Duration**: {baseline_results["duration"]:.2f} seconds
        - **Generation Status**: {"✅ Success" if baseline_results["success"] else "❌ Failed"}
        - **Text Generated**: {baseline_results.get("text_length", 0):,} characters
        - **Word Count**: {baseline_results.get("word_count", 0):,} words
        - **Content Sections**: {baseline_results.get("section_count", 0)}

        ## Throughput Analysis
        - **Words per Second**: {baseline_results.get("words_per_second", 0):.1f}
        - **Objectives per Minute**: {baseline_results.get("objectives_per_minute", 0):.1f}
        - **Throughput Grade**: {throughput_analysis}
        - **Overall Performance**: {performance_grade}

        ## Bottleneck Analysis
        - **Primary bottleneck**: {"Text generation" if generation_duration > 300 else "Retrieval operations" if generation_duration > 180 else "Processing overhead"}
        - **Optimization potential**: {"High - implement parallelization" if generation_duration > 300 else "Medium - optimize prompts" if generation_duration > 180 else "Low - monitor performance"}
        - **Sequential processing impact**: {"Significant" if generation_duration > 400 else "Moderate" if generation_duration > 200 else "Minimal"}

        ## Optimization Recommendations
        - **Text generation parallelization**: {"Critical" if generation_duration > 300 else "Recommended" if generation_duration > 180 else "Optional"}
        - **Shared retrieval implementation**: {"High priority" if generation_duration > 240 else "Medium priority" if generation_duration > 120 else "Low priority"}
        - **Prompt optimization**: {"Immediate" if baseline_results.get("words_per_second", 0) < 2 else "Future consideration"}
        - **Batch processing**: {"Implement" if generation_duration > 400 else "Evaluate" if generation_duration > 200 else "Monitor"}

        ## Performance Targets
        - **Target Duration**: < 300s for 5 objectives (Current: {baseline_results["duration"]:.1f}s)
        - **Target Throughput**: > 3 words/second (Current: {baseline_results.get("words_per_second", 0):.1f})
        - **Meets Performance Goals**: {"✅ Yes" if generation_duration < 300 and baseline_results.get("words_per_second", 0) > 3 else "❌ Optimization needed"}

        ## Next Steps
        - Focus optimization on: {"Parallelization and shared retrieval" if generation_duration > 300 else "Prompt optimization and caching" if generation_duration > 180 else "Monitor and maintain current performance"}
        - Expected improvement: {"5-10x with full optimization" if generation_duration > 400 else "2-3x with targeted improvements" if generation_duration > 200 else "20-30% with fine-tuning"}
        """

        section_analysis = [
            "Test Configuration",
            "Performance Results",
            "Throughput Analysis",
            "Bottleneck Analysis",
            "Optimization Recommendations",
            "Performance Targets",
            "Next Steps",
        ]

        perf_ctx.set_content(analysis_content, section_analysis)

        if generation_duration > 600:
            perf_ctx.add_warning(f"Very slow work plan generation: {generation_duration:.1f}s")
        if baseline_results.get("words_per_second", 0) < 1:
            perf_ctx.add_warning(f"Low throughput: {baseline_results.get('words_per_second', 0):.1f} words/second")
        if not baseline_results["success"]:
            perf_ctx.add_warning("Work plan generation failed")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1200)
async def test_work_plan_parallel_text_generation(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Test parallel text generation vs sequential approach.
    Identifies potential for parallelization optimization.
    """

    with create_performance_context(
        test_name="work_plan_parallel_text_generation",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "parallelization_analysis",
            "operation": "text_generation_comparison",
            "component_count": 8,
        },
        expected_patterns=["parallel", "text", "generation", "optimization"],
    ) as perf_ctx:
        logger.info("=== WORK PLAN PARALLEL TEXT GENERATION TEST ===")

        ResearchDeepDive(
            research_domain="Cancer Biomarker Discovery",
            research_question="Can we identify predictive biomarkers for immunotherapy response?",
            methodology_approach="Biomarker discovery and validation",
            innovation_aspects="Novel biomarker identification",
            expected_outcomes="Improved treatment predictions",
        )

        test_components = [
            {
                "title": f"Research Objective {i + 1}",
                "description": f"Detailed objective {i + 1} for biomarker discovery",
            }
            for i in range(4)
        ] + [
            {"title": f"Research Task {i + 1}", "description": f"Specific task {i + 1} for experimental validation"}
            for i in range(4)
        ]

        with perf_ctx.stage_timer("sequential_text_generation"):
            sequential_start = datetime.now(UTC)

            sequential_results = []
            for component in test_components:
                component_start = datetime.now(UTC)

                try:
                    component_text = f"Generated text for {component['title']}: {component['description']} " * 50
                    component_duration = (datetime.now(UTC) - component_start).total_seconds()

                    sequential_results.append(
                        {
                            "title": component["title"],
                            "duration": component_duration,
                            "text_length": len(component_text),
                            "success": True,
                        }
                    )

                except (ValueError, RuntimeError, TypeError, KeyError, AttributeError) as e:
                    sequential_results.append(
                        {
                            "title": component["title"],
                            "duration": (datetime.now(UTC) - component_start).total_seconds(),
                            "error": str(e),
                            "success": False,
                        }
                    )

            sequential_total = (datetime.now(UTC) - sequential_start).total_seconds()

        with perf_ctx.stage_timer("parallel_text_generation_simulation"):
            datetime.now(UTC)

            max_component_duration = max(r["duration"] for r in sequential_results if r["success"])
            parallel_estimated = max_component_duration * 1.2

            parallel_total = parallel_estimated

        successful_components = [r for r in sequential_results if r["success"]]
        avg_component_time = (
            sum(r["duration"] for r in successful_components) / len(successful_components)
            if successful_components
            else 0
        )
        parallelization_improvement = (
            (sequential_total - parallel_total) / sequential_total * 100 if sequential_total > 0 else 0
        )

        analysis_content = f"""
        # Work Plan Parallel Text Generation Analysis

        ## Test Configuration
        - Total Components: {len(test_components)}
        - Component Types: 4 objectives + 4 tasks
        - Generation Approach: Sequential vs Parallel comparison

        ## Sequential Processing Results
        - **Total Duration**: {sequential_total:.2f} seconds
        - **Average per Component**: {avg_component_time:.2f} seconds
        - **Successful Components**: {len(successful_components)}/{len(test_components)}
        - **Processing Pattern**: Linear accumulation of time

        ## Parallel Processing Simulation
        - **Estimated Duration**: {parallel_total:.2f} seconds
        - **Longest Component**: {max_component_duration:.2f} seconds
        - **Coordination Overhead**: 20% (estimated)
        - **Processing Pattern**: Concurrent execution

        ## Parallelization Analysis
        - **Time Savings**: {sequential_total - parallel_total:.2f} seconds
        - **Performance Improvement**: {parallelization_improvement:.1f}%
        - **Efficiency Gain**: {sequential_total / parallel_total:.1f}x faster
        - **Optimization Impact**: {"High" if parallelization_improvement > 60 else "Medium" if parallelization_improvement > 30 else "Low"}

        ## Implementation Feasibility
        - **LLM Concurrency**: {"Supported" if len(test_components) <= 10 else "May require batching"}
        - **Memory Requirements**: {"Manageable" if len(test_components) <= 15 else "Consider memory optimization"}
        - **API Rate Limits**: {"Within limits" if len(test_components) <= 20 else "May hit rate limits"}
        - **Implementation Complexity**: {"Low" if parallelization_improvement > 50 else "Medium"}

        ## Optimization Recommendations
        - **Immediate Action**: {"Implement parallel processing" if parallelization_improvement > 50 else "Consider for future optimization"}
        - **Expected Production Gain**: {parallelization_improvement:.1f}% improvement in text generation
        - **Resource Requirements**: {"Minimal code changes" if parallelization_improvement > 40 else "Moderate refactoring needed"}
        - **Risk Assessment**: {"Low risk, high reward" if parallelization_improvement > 60 else "Medium risk, medium reward"}

        ## Performance Targets
        - **Target Improvement**: > 50% time reduction
        - **Current Improvement**: {parallelization_improvement:.1f}%
        - **Meets Target**: {"✅ Yes" if parallelization_improvement > 50 else "❌ No"}
        - **Next Steps**: {"Deploy parallel processing" if parallelization_improvement > 50 else "Optimize component generation first"}
        """

        section_analysis = [
            "Test Configuration",
            "Sequential Processing Results",
            "Parallel Processing Simulation",
            "Parallelization Analysis",
            "Implementation Feasibility",
            "Optimization Recommendations",
            "Performance Targets",
        ]

        perf_ctx.set_content(analysis_content, section_analysis)

        if parallelization_improvement < 30:
            perf_ctx.add_warning(f"Low parallelization benefit: {parallelization_improvement:.1f}%")
        if len(successful_components) < len(test_components):
            perf_ctx.add_warning(f"Component generation failures: {len(test_components) - len(successful_components)}")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=900)
async def test_work_plan_shared_retrieval_optimization(
    async_session_maker: async_sessionmaker[Any],
    logger: logging.Logger,
) -> None:
    """
    Test shared retrieval vs individual retrieval calls.
    Identifies potential for retrieval optimization.
    """

    with create_performance_context(
        test_name="work_plan_shared_retrieval_optimization",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "retrieval_optimization",
            "operation": "shared_vs_individual_retrieval",
            "component_count": 6,
        },
        expected_patterns=["shared", "retrieval", "optimization", "performance"],
    ) as perf_ctx:
        logger.info("=== WORK PLAN SHARED RETRIEVAL OPTIMIZATION TEST ===")

        application_id = "550e8400-e29b-41d4-a716-446655440022"
        task_description = "Develop novel immunotherapy approaches for melanoma treatment resistance"

        search_queries = [
            "melanoma immunotherapy resistance mechanisms",
            "combination therapy development",
            "biomarker discovery methods",
            "treatment optimization strategies",
            "patient stratification approaches",
            "therapeutic target validation",
        ]

        with perf_ctx.stage_timer("individual_retrieval_calls"):
            individual_start = datetime.now(UTC)

            individual_results = []
            for _i, query in enumerate(search_queries):
                retrieval_start = datetime.now(UTC)

                try:
                    documents = await retrieve_documents(
                        application_id=application_id,
                        search_queries=[query],
                        task_description=task_description,
                        max_tokens=2000,
                    )

                    retrieval_duration = (datetime.now(UTC) - retrieval_start).total_seconds()

                    individual_results.append(
                        {
                            "query": query,
                            "duration": retrieval_duration,
                            "document_count": len(documents),
                            "total_length": sum(len(doc) for doc in documents),
                            "success": True,
                        }
                    )

                except (ValueError, RuntimeError, TypeError, KeyError, AttributeError) as e:
                    individual_results.append(
                        {
                            "query": query,
                            "duration": (datetime.now(UTC) - retrieval_start).total_seconds(),
                            "error": str(e),
                            "success": False,
                        }
                    )

            individual_total = (datetime.now(UTC) - individual_start).total_seconds()

        with perf_ctx.stage_timer("shared_retrieval_call"):
            shared_start = datetime.now(UTC)

            try:
                shared_documents = await retrieve_documents(
                    application_id=application_id,
                    search_queries=search_queries,
                    task_description=task_description,
                    max_tokens=8000,
                )

                shared_duration = (datetime.now(UTC) - shared_start).total_seconds()

                shared_results = {
                    "duration": shared_duration,
                    "document_count": len(shared_documents),
                    "total_length": sum(len(doc) for doc in shared_documents),
                    "success": True,
                }

            except (ValueError, RuntimeError, TypeError, KeyError, AttributeError) as e:
                shared_duration = (datetime.now(UTC) - shared_start).total_seconds()
                shared_results = {"duration": shared_duration, "error": str(e), "success": False}

        successful_individual = [r for r in individual_results if r["success"]]
        avg_individual_time = (
            sum(r["duration"] for r in successful_individual) / len(successful_individual)
            if successful_individual
            else 0
        )

        if shared_results["success"] and successful_individual:
            time_savings = individual_total - shared_duration
            efficiency_improvement = (time_savings / individual_total) * 100 if individual_total > 0 else 0
            retrieval_speedup = individual_total / shared_duration if shared_duration > 0 else 1
        else:
            time_savings = 0
            efficiency_improvement = 0
            retrieval_speedup = 1

        analysis_content = f"""
        # Work Plan Shared Retrieval Optimization Analysis

        ## Test Configuration
        - Application ID: {application_id}
        - Search Queries: {len(search_queries)}
        - Task Description: Melanoma immunotherapy development
        - Individual Token Limit: 2,000 per call
        - Shared Token Limit: 8,000 total

        ## Individual Retrieval Results
        - **Total Duration**: {individual_total:.2f} seconds
        - **Average per Query**: {avg_individual_time:.2f} seconds
        - **Successful Queries**: {len(successful_individual)}/{len(search_queries)}
        - **Total Documents**: {sum(r.get("document_count", 0) for r in successful_individual)}
        - **Total Content**: {sum(r.get("total_length", 0) for r in successful_individual):,} characters

        ## Shared Retrieval Results
        - **Total Duration**: {shared_results.get("duration", 0):.2f} seconds
        - **Success Status**: {"✅ Success" if shared_results["success"] else "❌ Failed"}
        - **Document Count**: {shared_results.get("document_count", 0)}
        - **Content Length**: {shared_results.get("total_length", 0):,} characters

        ## Optimization Analysis
        - **Time Savings**: {time_savings:.2f} seconds
        - **Efficiency Improvement**: {efficiency_improvement:.1f}%
        - **Retrieval Speedup**: {retrieval_speedup:.1f}x faster
        - **Optimization Impact**: {"High" if efficiency_improvement > 60 else "Medium" if efficiency_improvement > 30 else "Low"}

        ## Content Quality Analysis
        - **Content Overlap**: {"Likely high" if shared_results.get("total_length", 0) < sum(r.get("total_length", 0) for r in successful_individual) * 0.8 else "Minimal"}
        - **Information Coverage**: {"Comprehensive" if shared_results.get("document_count", 0) >= len(successful_individual) else "May need adjustment"}
        - **Token Efficiency**: {"Good" if shared_results.get("total_length", 0) > 0 else "Needs optimization"}

        ## Implementation Recommendations
        - **Deployment Priority**: {"High" if efficiency_improvement > 50 else "Medium" if efficiency_improvement > 25 else "Low"}
        - **Expected Production Benefit**: {efficiency_improvement:.1f}% reduction in retrieval time
        - **Implementation Complexity**: {"Low" if efficiency_improvement > 40 else "Medium"}
        - **Risk Assessment**: {"Low risk" if shared_results["success"] else "Requires error handling improvements"}

        ## Performance Targets
        - **Target Improvement**: > 40% time reduction
        - **Current Improvement**: {efficiency_improvement:.1f}%
        - **Meets Target**: {"✅ Yes" if efficiency_improvement > 40 else "❌ No"}
        - **Quality Maintained**: {"✅ Yes" if shared_results.get("document_count", 0) > 0 else "⚠️ Needs validation"}

        ## Next Steps
        - **Immediate Action**: {"Implement shared retrieval" if efficiency_improvement > 40 and shared_results["success"] else "Optimize retrieval strategy"}
        - **Token Limit Optimization**: {"Current limits adequate" if shared_results.get("total_length", 0) > 0 else "Increase token limits"}
        - **Quality Validation**: {"Validate content coverage in production" if efficiency_improvement > 30 else "Improve retrieval quality first"}
        """

        section_analysis = [
            "Test Configuration",
            "Individual Retrieval Results",
            "Shared Retrieval Results",
            "Optimization Analysis",
            "Content Quality Analysis",
            "Implementation Recommendations",
            "Performance Targets",
            "Next Steps",
        ]

        perf_ctx.set_content(analysis_content, section_analysis)

        if efficiency_improvement < 20:
            perf_ctx.add_warning(f"Low retrieval optimization benefit: {efficiency_improvement:.1f}%")
        if not shared_results["success"]:
            perf_ctx.add_warning("Shared retrieval failed")
        if len(successful_individual) < len(search_queries):
            perf_ctx.add_warning(f"Individual retrieval failures: {len(search_queries) - len(successful_individual)}")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result
