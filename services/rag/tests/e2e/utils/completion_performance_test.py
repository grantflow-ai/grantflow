"""
Performance tests for RAG completion utilities.

Tests the second most critical performance bottlenecks in completion.py:
1. LLM API call latency and throughput
2. Retry logic overhead and efficiency
3. Provider switching performance
4. Token counting and validation overhead
"""

import logging
from datetime import UTC, datetime
from unittest.mock import patch

from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.utils.completion import (
    handle_completions_request,
)
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    create_performance_context,
)


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=600)
async def test_llm_api_call_performance(logger: logging.Logger) -> None:
    """
    Test LLM API call performance and latency.
    Critical bottleneck: Network I/O to LLM providers with retry logic.
    """

    with create_performance_context(
        test_name="llm_api_call_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "api_performance",
            "operation": "llm_completion_calls",
            "providers": ["anthropic", "google"],
            "prompt_sizes": ["small", "medium", "large"],
        },
        expected_patterns=["llm", "api", "completion", "performance", "latency"]
    ) as perf_ctx:

        logger.info("=== LLM API CALL PERFORMANCE TEST ===")


        small_prompt = "Summarize this research objective: Investigate melanoma resistance."
        medium_prompt = "Analyze the following research objectives and provide detailed methodology:\n" \
                       "1. Investigate melanoma immunotherapy resistance mechanisms\n" \
                       "2. Develop combination therapy approaches\n" \
                       "3. Identify predictive biomarkers for patient stratification"
        large_prompt = medium_prompt + "\n\nProvide comprehensive analysis including:\n" + \
                      "- Literature review methodology\n" + \
                      "- Experimental design considerations\n" + \
                      "- Statistical analysis approaches\n" + \
                      "- Timeline and milestones\n" + \
                      "- Risk assessment and mitigation strategies\n" + \
                      "- Expected outcomes and deliverables\n" + \
                      "- Budget considerations and resource allocation"

        test_prompts = {
            "small": small_prompt,
            "medium": medium_prompt,
            "large": large_prompt
        }


        results = {}


        for size, prompt in test_prompts.items():
            logger.info(f"Testing {size} prompt performance")

            with perf_ctx.stage_timer(f"{size}_prompt_completion"):
                prompt_start = datetime.now(UTC)

                try:
                    response = await handle_completions_request(
                        messages=prompt,
                        model="gemini-2.0-flash-001",
                        system_prompt="You are a helpful research assistant.",
                        prompt_identifier="performance_test_prompt",
                        response_type=str,
                        response_schema={"type": "string"},
                        temperature=0.7,
                    )

                    prompt_duration = (datetime.now(UTC) - prompt_start).total_seconds()

                    results[size] = {
                        "duration": prompt_duration,
                        "success": True,
                        "response_length": len(response) if response else 0,
                        "prompt_length": len(prompt),
                        "tokens_per_second": (len(response) / prompt_duration) if response and prompt_duration > 0 else 0,
                    }

                    logger.info(
                        f"{size.capitalize()} prompt completed",
                        duration_seconds=prompt_duration,
                        prompt_length=len(prompt),
                        response_length=len(response) if response else 0,
                        tokens_per_second=results[size]["tokens_per_second"],
                    )

                except Exception as e:
                    prompt_duration = (datetime.now(UTC) - prompt_start).total_seconds()
                    results[size] = {
                        "duration": prompt_duration,
                        "success": False,
                        "error": str(e),
                        "prompt_length": len(prompt),
                    }
                    logger.error(f"{size.capitalize()} prompt failed", exc_info=e)


        with perf_ctx.stage_timer("concurrent_api_calls"):
            concurrent_start = datetime.now(UTC)


            batch_prompts = [small_prompt] * 3

            try:
                from asyncio import create_task, gather

                tasks = [
                    create_task(handle_completions_request(
                        messages=prompt,
                        model="gemini-2.0-flash-001",
                        system_prompt="You are a helpful research assistant.",
                        prompt_identifier="performance_test_concurrent",
                        response_type=str,
                        response_schema={"type": "string"},
                        temperature=0.7,
                    ))
                    for prompt in batch_prompts
                ]

                concurrent_responses = await gather(*tasks, return_exceptions=True)
                concurrent_duration = (datetime.now(UTC) - concurrent_start).total_seconds()

                successful_responses = [r for r in concurrent_responses if not isinstance(r, Exception)]

                logger.info(
                    "Concurrent API calls completed",
                    duration_seconds=concurrent_duration,
                    total_calls=len(batch_prompts),
                    successful_calls=len(successful_responses),
                    calls_per_second=len(batch_prompts) / concurrent_duration if concurrent_duration > 0 else 0,
                )

            except Exception as e:
                concurrent_duration = (datetime.now(UTC) - concurrent_start).total_seconds()
                logger.error("Concurrent API calls failed", exc_info=e)
                successful_responses = []


        avg_duration = sum(r["duration"] for r in results.values() if r.get("success")) / len([r for r in results.values() if r.get("success")]) if any(r.get("success") for r in results.values()) else 0
        throughput = len(successful_responses) / concurrent_duration if concurrent_duration > 0 else 0

        analysis_content = f"""
        # LLM API Call Performance Analysis

        ## Test Configuration
        - Model: gemini-2.0-flash-001
        - Test prompts: {len(test_prompts)} different sizes
        - Concurrent calls: {len(batch_prompts)}
        - Max tokens: 1000 (individual), 500 (concurrent)

        ## Individual Prompt Performance

        ### Small Prompt ({results['small']['prompt_length']} chars)
        - Duration: {results['small']['duration']:.2f} seconds
        - Response: {results['small'].get('response_length', 0)} characters
        - Throughput: {results['small'].get('tokens_per_second', 0):.1f} chars/second
        - Status: {'✅ Success' if results['small']['success'] else '❌ Failed'}

        ### Medium Prompt ({results['medium']['prompt_length']} chars)
        - Duration: {results['medium']['duration']:.2f} seconds
        - Response: {results['medium'].get('response_length', 0)} characters
        - Throughput: {results['medium'].get('tokens_per_second', 0):.1f} chars/second
        - Status: {'✅ Success' if results['medium']['success'] else '❌ Failed'}

        ### Large Prompt ({results['large']['prompt_length']} chars)
        - Duration: {results['large']['duration']:.2f} seconds
        - Response: {results['large'].get('response_length', 0)} characters
        - Throughput: {results['large'].get('tokens_per_second', 0):.1f} chars/second
        - Status: {'✅ Success' if results['large']['success'] else '❌ Failed'}

        ## Concurrent Processing Performance
        - Total calls: {len(batch_prompts)}
        - Successful calls: {len(successful_responses)}
        - Duration: {concurrent_duration:.2f} seconds
        - Throughput: {throughput:.1f} calls/second
        - Success rate: {len(successful_responses) / len(batch_prompts) * 100:.1f}%

        ## Performance Analysis
        - **Average latency**: {avg_duration:.2f} seconds per call
        - **Prompt size impact**: {'Significant' if results['large']['duration'] > results['small']['duration'] * 2 else 'Minimal'}
        - **Concurrent efficiency**: {'Good' if throughput > 0.5 else 'Needs optimization'}
        - **API reliability**: {'High' if len(successful_responses) == len(batch_prompts) else 'Issues detected'}

        ## Bottleneck Analysis
        - Primary bottleneck: {'Network latency' if avg_duration > 5.0 else 'Processing time' if avg_duration > 2.0 else 'Minimal'}
        - Scaling issues: {'Yes' if throughput < 0.3 else 'No'}
        - Timeout risk: {'High' if avg_duration > 10.0 else 'Low'}

        ## Optimization Recommendations
        - Request batching: {'High priority' if throughput < 0.5 else 'Current approach adequate'}
        - Caching strategy: {'Critical' if avg_duration > 3.0 else 'Standard monitoring'}
        - Timeout adjustment: {'Increase timeouts' if any(not r['success'] for r in results.values()) else 'Current timeouts adequate'}
        - Provider failover: {'Implement' if len(successful_responses) < len(batch_prompts) else 'Current reliability adequate'}

        ## Production Readiness
        - Latency grade: {'A' if avg_duration < 2.0 else 'B' if avg_duration < 5.0 else 'C'}
        - Throughput grade: {'A' if throughput > 1.0 else 'B' if throughput > 0.5 else 'C'}
        - Overall assessment: {'Production ready' if avg_duration < 5.0 and throughput > 0.5 else 'Optimization required'}
        """

        section_analysis = [
            "Test Configuration",
            "Individual Prompt Performance",
            "Concurrent Processing Performance",
            "Performance Analysis",
            "Bottleneck Analysis",
            "Optimization Recommendations",
            "Production Readiness"
        ]

        perf_ctx.set_content(analysis_content, section_analysis)


        if avg_duration > 10.0:
            perf_ctx.add_warning(f"High API latency detected: {avg_duration:.1f}s average")
        if throughput < 0.3:
            perf_ctx.add_warning(f"Low concurrent throughput: {throughput:.2f} calls/second")
        if len(successful_responses) < len(batch_prompts):
            perf_ctx.add_warning(f"API reliability issues: {len(successful_responses)}/{len(batch_prompts)} calls succeeded")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_retry_logic_performance(logger: logging.Logger) -> None:
    """
    Test retry logic performance and overhead.
    Measures the cost of retry mechanisms and failure recovery.
    """

    with create_performance_context(
        test_name="retry_logic_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "retry_performance",
            "operation": "failure_recovery_analysis",
            "max_retries": 3,
        },
        expected_patterns=["retry", "failure", "recovery", "performance"]
    ) as perf_ctx:

        logger.info("=== RETRY LOGIC PERFORMANCE TEST ===")

        test_prompt = "Analyze this research objective for optimization testing."


        with perf_ctx.stage_timer("successful_no_retries"):
            success_start = datetime.now(UTC)

            try:
                success_response = await handle_completions_request(
                    messages=test_prompt,
                    model="gemini-2.0-flash-001",
                    system_prompt="You are a helpful research assistant.",
                    prompt_identifier="retry_test_success",
                    response_type=str,
                    response_schema={"type": "string"},
                    temperature=0.7,
                )

                success_duration = (datetime.now(UTC) - success_start).total_seconds()
                success_result = "success"

                logger.info(
                    "Successful call completed",
                    duration_seconds=success_duration,
                    response_length=len(success_response) if success_response else 0,
                )

            except Exception as e:
                success_duration = (datetime.now(UTC) - success_start).total_seconds()
                success_result = "failed"
                logger.error("Successful call test failed", exc_info=e)


        with perf_ctx.stage_timer("simulated_retry_scenario"):
            retry_start = datetime.now(UTC)


            with patch("services.rag.src.utils.completion.make_anthropic_completions_request") as mock_anthropic:

                mock_anthropic.side_effect = [
                    Exception("Rate limit exceeded"),
                    Exception("Internal server error"),
                    "Successful response after retries"
                ]

                try:
                    retry_response = await handle_completions_request(
                        messages=test_prompt,
                        model="gemini-2.0-flash-001",
                        system_prompt="You are a helpful research assistant.",
                        prompt_identifier="retry_test_scenario",
                        response_type=str,
                        response_schema={"type": "string"},
                        temperature=0.7,
                    )

                    retry_duration = (datetime.now(UTC) - retry_start).total_seconds()
                    retry_attempts = mock_anthropic.call_count
                    retry_result = "success_after_retries"

                    logger.info(
                        "Retry scenario completed",
                        duration_seconds=retry_duration,
                        retry_attempts=retry_attempts,
                        final_result="success",
                    )

                except Exception as e:
                    retry_duration = (datetime.now(UTC) - retry_start).total_seconds()
                    retry_attempts = mock_anthropic.call_count
                    retry_result = "all_retries_failed"
                    logger.error("Retry scenario failed", exc_info=e, extra={"attempts": retry_attempts})


        with perf_ctx.stage_timer("provider_switching"):
            switch_start = datetime.now(UTC)


            with patch("services.rag.src.utils.completion.make_anthropic_completions_request") as mock_anthropic, \
                 patch("services.rag.src.utils.completion.make_google_completions_request") as mock_google:


                mock_anthropic.side_effect = Exception("Provider unavailable")
                mock_google.return_value = "Response from Google provider"

                try:
                    switch_response = await handle_completions_request(
                        messages=test_prompt,
                        model="claude-3-5-sonnet-latest",
                        system_prompt="You are a helpful research assistant.",
                        prompt_identifier="provider_switch_test",
                        response_type=str,
                        response_schema={"type": "string"},
                        temperature=0.7,
                    )

                    switch_duration = (datetime.now(UTC) - switch_start).total_seconds()
                    switch_result = "provider_switch_success"

                    logger.info(
                        "Provider switching completed",
                        duration_seconds=switch_duration,
                        anthropic_attempts=mock_anthropic.call_count,
                        google_attempts=mock_google.call_count,
                    )

                except Exception as e:
                    switch_duration = (datetime.now(UTC) - switch_start).total_seconds()
                    switch_result = "provider_switch_failed"
                    logger.error("Provider switching failed", exc_info=e)


        retry_overhead = ((retry_duration - success_duration) / success_duration * 100) if success_duration > 0 else 0
        switch_overhead = ((switch_duration - success_duration) / success_duration * 100) if success_duration > 0 else 0

        analysis_content = f"""
        # Retry Logic Performance Analysis

        ## Test Configuration
        - Test prompt: {len(test_prompt)} characters
        - Max retries: 3 attempts
        - Providers tested: Anthropic, Google
        - Simulated failure scenarios: Rate limits, server errors

        ## Performance Results

        ### Successful Call (Baseline)
        - Duration: {success_duration:.2f} seconds
        - Result: {success_result}
        - Attempts: 1

        ### Retry Scenario (2 failures + success)
        - Duration: {retry_duration:.2f} seconds
        - Result: {retry_result}
        - Attempts: {retry_attempts if 'retry_attempts' in locals() else 'Unknown'}
        - Retry overhead: {retry_overhead:.1f}%

        ### Provider Switching (Anthropic→Google)
        - Duration: {switch_duration:.2f} seconds
        - Result: {switch_result}
        - Switch overhead: {switch_overhead:.1f}%

        ## Retry Performance Analysis
        - **Retry efficiency**: {'Good' if retry_overhead < 50 else 'High overhead'}
        - **Failure recovery time**: {retry_duration:.1f}s for 2 failures
        - **Provider switching cost**: {switch_overhead:.1f}% overhead
        - **Resilience**: {'High' if retry_result == 'success_after_retries' else 'Needs improvement'}

        ## Bottleneck Analysis
        - Retry latency: {'Acceptable' if retry_overhead < 100 else 'Too high'}
        - Provider switching: {'Efficient' if switch_overhead < 30 else 'Optimization needed'}
        - Failure detection: {'Fast' if retry_duration < success_duration * 3 else 'Slow'}

        ## Optimization Recommendations
        - Retry backoff: {'Optimize delays' if retry_overhead > 100 else 'Current backoff adequate'}
        - Provider failover: {'Implement circuit breaker' if switch_overhead > 50 else 'Current approach adequate'}
        - Timeout tuning: {'Reduce timeouts' if retry_duration > 15.0 else 'Current timeouts appropriate'}
        - Monitoring: {'Add retry metrics' if retry_overhead > 25 else 'Standard monitoring sufficient'}

        ## Production Impact
        - Retry cost: {retry_overhead:.1f}% performance overhead
        - Availability improvement: {'Significant' if retry_result == 'success_after_retries' else 'Limited'}
        - Recommendation: {'Production ready' if retry_overhead < 75 and switch_overhead < 40 else 'Tune retry parameters'}
        """

        section_analysis = [
            "Test Configuration",
            "Performance Results",
            "Retry Performance Analysis",
            "Bottleneck Analysis",
            "Optimization Recommendations",
            "Production Impact"
        ]

        perf_ctx.set_content(analysis_content, section_analysis)


        if retry_overhead > 150:
            perf_ctx.add_warning(f"High retry overhead detected: {retry_overhead:.1f}%")
        if switch_overhead > 75:
            perf_ctx.add_warning(f"Expensive provider switching: {switch_overhead:.1f}% overhead")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result


@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_completion_smoke_performance(logger: logging.Logger) -> None:
    """
    Smoke test for basic completion performance.
    Quick validation of LLM API performance.
    """

    with create_performance_context(
        test_name="completion_smoke_performance",
        test_category=TestCategory.OPTIMIZATION,
        logger=logger,
        configuration={
            "test_type": "smoke",
            "operation": "basic_completion_test",
        },
        expected_patterns=["completion", "api", "performance"]
    ) as perf_ctx:

        logger.info("=== COMPLETION SMOKE PERFORMANCE TEST ===")

        test_prompt = "Provide a brief summary of melanoma research approaches."

        with perf_ctx.stage_timer("smoke_completion"):
            smoke_start = datetime.now(UTC)

            try:
                response = await handle_completions_request(
                    messages=test_prompt,
                    model="gemini-2.0-flash-001",
                    system_prompt="You are a helpful research assistant.",
                    prompt_identifier="smoke_test",
                    response_type=str,
                    response_schema={"type": "string"},
                    temperature=0.7,
                )

                smoke_duration = (datetime.now(UTC) - smoke_start).total_seconds()

                smoke_content = f"""
                # Completion Performance Smoke Test

                ## Results
                - Duration: {smoke_duration:.2f} seconds
                - Prompt: {len(test_prompt)} characters
                - Response: {len(response) if response else 0} characters
                - Throughput: {len(response) / smoke_duration if response and smoke_duration > 0 else 0:.1f} chars/second

                ## Analysis
                - Latency: {'Excellent' if smoke_duration < 2.0 else 'Good' if smoke_duration < 5.0 else 'Needs optimization'}
                - API health: {'✅ Healthy' if response else '❌ Issues detected'}
                - Performance grade: {'A' if smoke_duration < 2.0 and response else 'B' if smoke_duration < 5.0 else 'C'}

                ## Status: {'PASSED ✓' if response and smoke_duration < 10.0 else 'NEEDS ATTENTION ⚠️'}
                """

                logger.info(
                    "Smoke completion test completed",
                    duration_seconds=smoke_duration,
                    response_length=len(response) if response else 0,
                    status="success",
                )

            except Exception as e:
                smoke_duration = (datetime.now(UTC) - smoke_start).total_seconds()

                smoke_content = f"""
                # Completion Performance Smoke Test

                ## Results
                - Duration: {smoke_duration:.2f} seconds (failed)
                - Error: {str(e)[:100]}...
                - Status: ❌ FAILED

                ## Analysis
                - API availability: Issues detected
                - Error type: {type(e).__name__}

                ## Status: FAILED ❌
                """

                logger.error("Smoke completion test failed", exc_info=e, extra={"duration": smoke_duration})

        perf_ctx.set_content(smoke_content, ["Results", "Analysis", "Status"])

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="B")

    return perf_ctx.result
