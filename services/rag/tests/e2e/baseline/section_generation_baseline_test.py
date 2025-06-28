"""
Real E2E performance test for section generation with actual API calls.
Tests baseline performance for grant section text generation.
"""

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from services.rag.src.grant_application.generate_section_text import generate_section_text
from services.rag.src.utils.token_optimization import estimate_token_count
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    assert_performance_targets,
    create_performance_context,
)
from testing.e2e_utils import E2ETestCategory, e2e_test

if TYPE_CHECKING:
    from packages.db.src.json_objects import ResearchDeepDive


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=1800)
async def test_section_generation_real_baseline(logger: logging.Logger) -> None:
    """
    Establish real baseline performance for section generation with actual API calls.
    Tests current implementation performance across different section types.
    """

    with create_performance_context(
        test_name="section_generation_real_baseline",
        test_category=TestCategory.BASELINE,
        logger=logger,
        configuration={
            "test_type": "real_baseline_measurement",
            "operation": "section_text_generation",
            "sections_count": 3,
            "real_api_calls": True,
        },
        expected_patterns=["section", "generation", "baseline", "cancer", "car-t", "therapy"]
    ) as perf_ctx:

        logger.info("=== SECTION GENERATION REAL BASELINE TEST ===")


        application_id = "550e8400-e29b-41d4-a716-446655440030"

        form_inputs: ResearchDeepDive = {
            "project_title": "Enhanced CAR-T Cell Therapy for Solid Tumors",
            "project_summary": "Developing next-generation CAR-T cells with improved persistence and reduced toxicity",
        }


        research_plan_text = """
        # Research Work Plan

        ## Objective 1: CAR-T Cell Engineering
        Develop enhanced CAR-T cell constructs with optimized signaling domains for improved persistence.

        ### Task 1.1: CAR Design
        Design and synthesize novel CAR constructs with enhanced co-stimulatory domains.

        ### Task 1.2: Validation
        Validate CAR functionality in preclinical models.

        ## Objective 2: Manufacturing Optimization
        Optimize manufacturing processes for clinical-grade CAR-T cell production.

        ### Task 2.1: Process Development
        Develop scalable manufacturing protocols.

        ### Task 2.2: Quality Control
        Establish comprehensive quality control measures.
        """


        test_sections = [
            {
                "section": {
                    "id": "background-1",
                    "title": "Background and Significance",
                    "description": "Research background and clinical significance",
                    "order": 1,
                    "max_words": 800,
                    "generation_instructions": "Provide comprehensive background on CAR-T cell therapy challenges in solid tumors, including current limitations and the significance of this research.",
                    "keywords": ["CAR-T", "solid tumors", "immunotherapy", "cancer"],
                    "topics": ["Background", "Significance"],
                    "search_queries": [
                        "CAR-T cell therapy solid tumors challenges",
                        "immunotherapy resistance mechanisms",
                        "next-generation CAR-T cells"
                    ]
                },
                "section_type": "background"
            },
            {
                "section": {
                    "id": "methodology-2",
                    "title": "Research Methodology",
                    "description": "Detailed experimental approaches and methods",
                    "order": 2,
                    "max_words": 1000,
                    "generation_instructions": "Describe the research methodology for engineering enhanced CAR-T cells, including vector design, cell manufacturing, and validation approaches.",
                    "keywords": ["methodology", "CAR engineering", "manufacturing", "validation"],
                    "topics": ["Methodology", "Experimental Design"],
                    "search_queries": [
                        "CAR-T cell engineering methods",
                        "lentiviral vector design protocols",
                        "T cell expansion techniques"
                    ]
                },
                "section_type": "methodology"
            },
            {
                "section": {
                    "id": "innovation-3",
                    "title": "Innovation and Impact",
                    "description": "Innovation aspects and expected impact",
                    "order": 3,
                    "max_words": 600,
                    "generation_instructions": "Highlight the innovative aspects of the enhanced CAR-T cell approach and its potential impact on cancer treatment.",
                    "keywords": ["innovation", "impact", "novel approach", "therapeutic benefit"],
                    "topics": ["Innovation", "Clinical Impact"],
                    "search_queries": [
                        "innovative CAR-T cell designs",
                        "next-generation cellular therapies",
                        "cancer immunotherapy breakthroughs"
                    ]
                },
                "section_type": "innovation"
            }
        ]

        section_results = []
        total_generation_time = 0


        for test_item in test_sections:
            section = test_item["section"]
            section_type = test_item["section_type"]

            logger.info("Testing section generation", section_type=section_type)

            with perf_ctx.stage_timer(f"{section_type}_generation"):
                section_start = datetime.now(UTC)

                try:

                    section_text = await generate_section_text(
                        application_id=application_id,
                        grant_section=section,
                        form_inputs=form_inputs,
                        dependencies={},
                        research_plan_text=research_plan_text,
                    )

                    section_duration = (datetime.now(UTC) - section_start).total_seconds()
                    total_generation_time += section_duration


                    perf_ctx.add_llm_call(1)


                    text_length = len(section_text)
                    word_count = len(section_text.split())
                    estimated_tokens = estimate_token_count(section_text)

                    section_results.append({
                        "section_type": section_type,
                        "duration": section_duration,
                        "success": True,
                        "text_length": text_length,
                        "word_count": word_count,
                        "estimated_tokens": estimated_tokens,
                        "words_per_second": word_count / section_duration if section_duration > 0 else 0,
                        "tokens_per_second": estimated_tokens / section_duration if section_duration > 0 else 0,
                        "requested_max_words": section["max_words"],
                        "word_compliance": word_count <= section["max_words"]
                    })

                    logger.info(
                        "Section generated successfully",
                        section_type=section_type,
                        duration_seconds=section_duration,
                        word_count=word_count,
                        estimated_tokens=estimated_tokens,
                        words_per_second=section_results[-1]["words_per_second"],
                    )

                except Exception as e:
                    section_duration = (datetime.now(UTC) - section_start).total_seconds()
                    total_generation_time += section_duration

                    section_results.append({
                        "section_type": section_type,
                        "duration": section_duration,
                        "success": False,
                        "error": str(e),
                    })

                    logger.error("Section generation failed", exc_info=e)


        successful_sections = [r for r in section_results if r["success"]]
        avg_section_time = sum(r["duration"] for r in successful_sections) / len(successful_sections) if successful_sections else 0
        total_words = sum(r.get("word_count", 0) for r in successful_sections)
        total_tokens = sum(r.get("estimated_tokens", 0) for r in successful_sections)
        avg_words_per_second = sum(r.get("words_per_second", 0) for r in successful_sections) / len(successful_sections) if successful_sections else 0


        performance_grade = "A" if avg_section_time < 45 else "B" if avg_section_time < 90 else "C"
        throughput_grade = "High" if avg_words_per_second > 15 else "Medium" if avg_words_per_second > 8 else "Low"

        analysis_content = f"""
        # Section Generation Real Baseline Performance

        ## Test Configuration
        - Application ID: {application_id}
        - Sections Tested: {len(test_sections)}
        - Section Types: {', '.join(s['section_type'] for s in test_sections)}
        - Domain: CAR-T Cell Therapy for Solid Tumors
        - Real API Calls: Yes

        ## Overall Performance Results
        - **Total Generation Time**: {total_generation_time:.2f} seconds
        - **Average per Section**: {avg_section_time:.2f} seconds
        - **Successful Sections**: {len(successful_sections)}/{len(test_sections)}
        - **Total Words Generated**: {total_words:,}
        - **Total Estimated Tokens**: {total_tokens:,}
        - **LLM API Calls**: {len(test_sections)}

        ## Section-by-Section Performance
        {chr(10).join([
            f"### {r['section_type'].capitalize()} Section" + chr(10) +
            f"- Duration: {r['duration']:.2f}s" + chr(10) +
            f"- Words: {r.get('word_count', 0):,} (max: {r.get('requested_max_words', 'N/A')})" + chr(10) +
            f"- Tokens: {r.get('estimated_tokens', 0):,}" + chr(10) +
            f"- Generation Rate: {r.get('words_per_second', 0):.1f} words/sec" + chr(10) +
            f"- Word Limit Compliance: {'✅ Yes' if r.get('word_compliance', False) else '❌ Exceeded' if 'word_compliance' in r else 'N/A'}" + chr(10) +
            f"- Status: {'✅ Success' if r['success'] else '❌ Failed'}"
            for r in section_results
        ])}

        ## Performance Analysis
        - **Average Generation Rate**: {avg_words_per_second:.1f} words/second
        - **Token Processing**: {total_tokens / total_generation_time if total_generation_time > 0 else 0:.1f} tokens/second
        - **Throughput Grade**: {throughput_grade}
        - **Overall Performance**: {performance_grade}

        ## Quality Metrics
        - **Word Compliance Rate**: {sum(1 for r in successful_sections if r.get('word_compliance', False)) / len(successful_sections) * 100 if successful_sections else 0:.1f}%
        - **Average Word Efficiency**: {sum(r.get('word_count', 0) / r.get('requested_max_words', 1) for r in successful_sections) / len(successful_sections) * 100 if successful_sections else 0:.1f}%
        - **Content Richness**: {'High' if total_words > 2000 else 'Medium' if total_words > 1000 else 'Low'}

        ## Bottleneck Analysis
        - **Slowest Section**: {max(successful_sections, key=lambda x: x['duration'])['section_type'] if successful_sections else 'N/A'} ({max([r['duration'] for r in successful_sections]) if successful_sections else 0:.2f}s)
        - **Fastest Section**: {min(successful_sections, key=lambda x: x['duration'])['section_type'] if successful_sections else 'N/A'} ({min([r['duration'] for r in successful_sections]) if successful_sections else 0:.2f}s)
        - **Performance Variance**: {max([r['duration'] for r in successful_sections]) - min([r['duration'] for r in successful_sections]) if len(successful_sections) > 1 else 0:.2f}s spread
        - **Primary Bottleneck**: {'LLM API latency' if avg_section_time > 60 else 'Token generation' if avg_section_time > 30 else 'Acceptable performance'}

        ## Real-World Performance Targets
        - **Target per Section**: < 60s (Current: {avg_section_time:.1f}s)
        - **Target Throughput**: > 12 words/second (Current: {avg_words_per_second:.1f})
        - **Meets Performance Goals**: {'✅ Yes' if avg_section_time < 60 and avg_words_per_second > 12 else '❌ Optimization needed'}

        ## Optimization Opportunities
        - **Prompt Efficiency**: {'Optimize prompt length' if total_tokens / len(successful_sections) > 2000 else 'Current prompts efficient'}
        - **Parallel Processing**: {'High value' if total_generation_time > 150 else 'Medium value' if total_generation_time > 90 else 'Low priority'}
        - **Caching Strategy**: {'Implement retrieval caching' if avg_section_time > 45 else 'Current approach adequate'}

        ## Next Steps
        - **Focus Area**: {'Prompt optimization' if avg_section_time > 60 else 'Parallel processing' if len(test_sections) > 3 else 'Fine-tuning'}
        - **Expected Improvement**: {'30-40% with optimization' if avg_section_time > 60 else '15-25% with fine-tuning'}
        """

        section_analysis = [
            "Test Configuration",
            "Overall Performance Results",
            "Section-by-Section Performance",
            "Performance Analysis",
            "Quality Metrics",
            "Bottleneck Analysis",
            "Real-World Performance Targets",
            "Optimization Opportunities",
            "Next Steps"
        ]

        perf_ctx.set_content(analysis_content, section_analysis)


        if avg_section_time > 90:
            perf_ctx.add_warning(f"Slow section generation: {avg_section_time:.1f}s average")
        if avg_words_per_second < 8:
            perf_ctx.add_warning(f"Low throughput: {avg_words_per_second:.1f} words/second")
        if len(successful_sections) < len(test_sections):
            perf_ctx.add_warning(f"Section generation failures: {len(test_sections) - len(successful_sections)}")

    assert perf_ctx.result is not None, "Performance result should be created"
    assert_performance_targets(perf_ctx.result, min_grade="C")

    return perf_ctx.result
