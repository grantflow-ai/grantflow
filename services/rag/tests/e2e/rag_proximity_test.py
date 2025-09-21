import logging
import time
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, patch

from packages.db.src.json_objects import CFPSectionAnalysis, GrantLongFormSection
from packages.db.src.utils import retrieve_application
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.performance_framework import TestDomain, TestExecutionSpeed, performance_test
from testing.rag_evaluation import save_evaluation_results

from services.rag.src.grant_application.generate_section_text import (
    _format_cfp_requirements_for_section,
    _generate_single_section_with_context,
    generate_section_text,
)
from services.rag.src.utils.retrieval import retrieve_documents


def calculate_rouge_l(reference_text: str, generated_text: str) -> float:
    if not reference_text or not generated_text:
        return 0.0

    ref_tokens = reference_text.lower().split()
    gen_tokens = generated_text.lower().split()

    if not ref_tokens or not gen_tokens:
        return 0.0

    def lcs_length(x: list[str], y: list[str]) -> int:
        m, n = len(x), len(y)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if x[i - 1] == y[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

        return dp[m][n]

    lcs_len = lcs_length(ref_tokens, gen_tokens)

    if lcs_len == 0:
        return 0.0

    precision = lcs_len / len(gen_tokens)
    recall = lcs_len / len(ref_tokens)

    if precision + recall == 0:
        return 0.0

    return (2 * precision * recall) / (precision + recall)


def calculate_rouge_n(reference_text: str, generated_text: str, n: int = 2) -> float:
    if not reference_text or not generated_text:
        return 0.0

    ref_tokens = reference_text.lower().split()
    gen_tokens = generated_text.lower().split()

    if len(ref_tokens) < n or len(gen_tokens) < n:
        return 0.0

    def create_ngrams(tokens: list[str], n: int) -> set[tuple[str, ...]]:
        return {tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}

    ref_ngrams = create_ngrams(ref_tokens, n)
    gen_ngrams = create_ngrams(gen_tokens, n)

    if not ref_ngrams or not gen_ngrams:
        return 0.0

    overlap = len(ref_ngrams & gen_ngrams)
    precision = overlap / len(gen_ngrams)
    recall = overlap / len(ref_ngrams)

    if precision + recall == 0:
        return 0.0

    return (2 * precision * recall) / (precision + recall)


def parse_word_limit_from_cfp_constraint(constraint_description: str) -> dict[str, int | None]:
    import re

    description = constraint_description.lower()

    min_words = None
    max_words = None

    max_patterns = [
        r"(\d+)\s*words?\s*maximum",
        r"(\d+)\s*words?\s*max",
        r"maximum\s*of\s*(\d+)\s*words?",
        r"maximum\s*(\d+)\s*words?",
        r"max\s*(\d+)\s*words?",
        r"up\s*to\s*(\d+)\s*words?",
        r"no\s*more\s*than\s*(\d+)\s*words?",
        r"(\d+)\s*words?\s*limit",
        r"(\d+)\s*words?\s*or\s*less",
    ]

    min_patterns = [
        r"(\d+)\s*words?\s*minimum",
        r"(\d+)\s*words?\s*min",
        r"minimum\s*of\s*(\d+)\s*words?",
        r"minimum\s*(\d+)\s*words?",
        r"min\s*(\d+)\s*words?",
        r"at\s*least\s*(\d+)\s*words?",
        r"no\s*fewer\s*than\s*(\d+)\s*words?",
    ]

    for pattern in max_patterns:
        match = re.search(pattern, description)
        if match:
            max_words = int(match.group(1))
            break

    for pattern in min_patterns:
        match = re.search(pattern, description)
        if match:
            min_words = int(match.group(1))
            break

    range_pattern = r"(\d+)\s*[-]\s*(\d+)\s*words?"
    range_match = re.search(range_pattern, description)
    if range_match:
        min_words = int(range_match.group(1))
        max_words = int(range_match.group(2))

    return {
        "min_words": min_words,
        "max_words": max_words,
    }


def extract_section_word_limits(
    section: GrantLongFormSection, cfp_analysis: CFPSectionAnalysis | None
) -> dict[str, int | None]:
    section_title = section.get("title", "").lower()

    template_max_words = section.get("max_words")

    cfp_min_words = None
    cfp_max_words = None

    if cfp_analysis and cfp_analysis.get("length_constraints"):
        for constraint in cfp_analysis["length_constraints"]:
            constraint_section = constraint.get("description", "").lower()

            if (
                section_title in constraint_section
                or any(word in constraint_section for word in section_title.split())
                or constraint.get("quote", "").lower().find(section_title) != -1
            ):
                if constraint.get("description"):
                    word_limits = parse_word_limit_from_cfp_constraint(constraint["description"])
                    if word_limits["min_words"] is not None:
                        cfp_min_words = word_limits["min_words"]
                    if word_limits["max_words"] is not None:
                        cfp_max_words = word_limits["max_words"]

                quote_limits = parse_word_limit_from_cfp_constraint(constraint.get("quote", ""))
                if quote_limits["min_words"] is not None:
                    cfp_min_words = quote_limits["min_words"]
                if quote_limits["max_words"] is not None:
                    cfp_max_words = quote_limits["max_words"]

    final_max_words = cfp_max_words or template_max_words
    final_min_words = cfp_min_words

    return {
        "min_words": final_min_words,
        "max_words": final_max_words,
        "cfp_min_words": cfp_min_words,
        "cfp_max_words": cfp_max_words,
        "template_max_words": template_max_words,
    }


def calculate_length_compliance_score(
    actual_word_count: int,
    min_words: int | None,
    max_words: int | None,
) -> dict[str, Any]:
    compliance_status = "PASS"
    grade = "A"
    compliance_percentage = 100.0
    issues = []

    if min_words is not None and actual_word_count < min_words:
        compliance_status = "FAIL"
        grade = "F"
        shortage = min_words - actual_word_count
        issues.append(f"Below minimum by {shortage} words")
        compliance_percentage = (actual_word_count / min_words) * 100 if min_words > 0 else 0

    if max_words is not None and actual_word_count > max_words:
        compliance_status = "FAIL"
        grade = "F"
        excess = actual_word_count - max_words
        issues.append(f"Exceeds maximum by {excess} words")
        compliance_percentage = (max_words / actual_word_count) * 100 if actual_word_count > 0 else 0

    if compliance_status == "PASS" and max_words is not None:
        utilization_percentage = (actual_word_count / max_words) * 100

        if utilization_percentage >= 80:
            grade = "A"
            compliance_percentage = 100.0
        elif utilization_percentage >= 60:
            grade = "B"
            compliance_percentage = 85.0
        else:
            grade = "F"
            compliance_status = "FAIL"
            issues.append(f"Word count too low: {utilization_percentage:.1f}% of maximum")
            compliance_percentage = utilization_percentage

    return {
        "compliance_status": compliance_status,
        "grade": grade,
        "compliance_percentage": compliance_percentage,
        "utilization_percentage": (actual_word_count / max_words) * 100 if max_words else None,
        "issues": issues,
        "actual_word_count": actual_word_count,
        "min_words": min_words,
        "max_words": max_words,
    }


def extract_section_requirements_text(section: GrantLongFormSection, cfp_analysis: CFPSectionAnalysis | None) -> str:
    section_title = section.get("title", "")
    generation_instructions = section.get("generation_instructions", "")
    keywords = " ".join(section.get("keywords", []))
    search_queries = " ".join(section.get("search_queries", []))

    cfp_requirements = _format_cfp_requirements_for_section(section_title, cfp_analysis)

    return f"""
    Section: {section_title}
    Instructions: {generation_instructions}
    Keywords: {keywords}
    Search Context: {search_queries}
    {cfp_requirements}
    """.strip()


async def measure_section_rag_proximity(
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


async def measure_rag_writing_proximity(
    section: GrantLongFormSection,
    retrieved_context: str,
    research_objectives: list[Any],
    cfp_analysis: CFPSectionAnalysis | None = None,
) -> dict[str, Any]:
    section_title = section.get("title", "Unknown Section")

    generation_start = time.time()
    generated_text = await _generate_single_section_with_context(
        section=section,
        research_deep_dives=research_objectives,
        shared_context=retrieved_context,
        cfp_analysis=cfp_analysis,
    )
    generation_time = time.time() - generation_start

    rag_to_writing_rouge_l = calculate_rouge_l(retrieved_context, generated_text)
    rag_to_writing_rouge_2 = calculate_rouge_n(retrieved_context, generated_text, n=2)

    section_requirements = extract_section_requirements_text(section, cfp_analysis)
    section_to_writing_rouge_l = calculate_rouge_l(section_requirements, generated_text)
    section_to_writing_rouge_2 = calculate_rouge_n(section_requirements, generated_text, n=2)

    return {
        "section_title": section_title,
        "generated_text_length": len(generated_text),
        "generated_word_count": len(generated_text.split()),
        "generation_time_seconds": generation_time,
        "rag_to_writing_rouge_l": rag_to_writing_rouge_l,
        "rag_to_writing_rouge_2": rag_to_writing_rouge_2,
        "section_to_writing_rouge_l": section_to_writing_rouge_l,
        "section_to_writing_rouge_2": section_to_writing_rouge_2,
        "generated_text_sample": generated_text[:500] + "..." if len(generated_text) > 500 else generated_text,
    }


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.RETRIEVAL, timeout=900)
async def test_section_rag_proximity_analysis(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    logger.info("🔍 Starting section RAG proximity analysis using ROUGE metrics")

    start_time = time.time()

    async with async_session_maker() as session:
        application = await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        if not application.grant_template or not application.grant_template.grant_sections:
            raise ValueError("Application must have grant template with sections")

        research_objectives = application.research_objectives or []
        cfp_analysis = application.grant_template.cfp_section_analysis

        grant_sections = application.grant_template.grant_sections
        long_form_sections = [
            section for section in grant_sections if isinstance(section, dict) and section.get("max_words", 0) > 100
        ]

        if not long_form_sections:
            raise ValueError("No substantial long-form sections found")

        logger.info(
            "Found %d long-form sections for proximity analysis",
            len(long_form_sections),
        )

    proximity_results = []

    for section in long_form_sections[:3]:
        section_title = section.get("title", "Unknown")
        logger.info("Analyzing proximity for section: %s", section_title)

        section_rag_metrics = await measure_section_rag_proximity(
            section=section,
            application_id=melanoma_alliance_full_application_id,
            cfp_analysis=cfp_analysis,
        )

        retrieved_context = "\n".join(
            await retrieve_documents(
                application_id=melanoma_alliance_full_application_id,
                search_queries=section.get("search_queries", [section_title])[:8],
                task_description=f"Generate content for {section_title} section",
                max_tokens=8000,
            )
        )

        rag_writing_metrics = await measure_rag_writing_proximity(
            section=section,
            retrieved_context=retrieved_context,
            research_objectives=research_objectives,
            cfp_analysis=cfp_analysis,
        )

        combined_metrics = {
            **section_rag_metrics,
            **rag_writing_metrics,
            "pipeline_efficiency": {
                "section_to_rag_information_retention": section_rag_metrics["section_to_rag_rouge_l"],
                "rag_to_writing_utilization": rag_writing_metrics["rag_to_writing_rouge_l"],
                "end_to_end_preservation": rag_writing_metrics["section_to_writing_rouge_l"],
                "information_flow_score": (
                    section_rag_metrics["section_to_rag_rouge_l"] * 0.3
                    + rag_writing_metrics["rag_to_writing_rouge_l"] * 0.4
                    + rag_writing_metrics["section_to_writing_rouge_l"] * 0.3
                ),
            },
        }

        proximity_results.append(combined_metrics)

        logger.info(
            "Section %s - ROUGE-L scores: Req→RAG=%.3f, RAG→Text=%.3f, Req→Text=%.3f",
            section_title,
            section_rag_metrics["section_to_rag_rouge_l"],
            rag_writing_metrics["rag_to_writing_rouge_l"],
            rag_writing_metrics["section_to_writing_rouge_l"],
        )

    total_time = time.time() - start_time

    aggregate_metrics = {
        "sections_analyzed": len(proximity_results),
        "avg_section_to_rag_rouge_l": sum(r["section_to_rag_rouge_l"] for r in proximity_results)
        / len(proximity_results),
        "avg_rag_to_writing_rouge_l": sum(r["rag_to_writing_rouge_l"] for r in proximity_results)
        / len(proximity_results),
        "avg_section_to_writing_rouge_l": sum(r["section_to_writing_rouge_l"] for r in proximity_results)
        / len(proximity_results),
        "avg_information_flow_score": sum(r["pipeline_efficiency"]["information_flow_score"] for r in proximity_results)
        / len(proximity_results),
        "total_analysis_time": total_time,
    }

    assert aggregate_metrics["avg_section_to_rag_rouge_l"] > 0.05, "Section to RAG proximity too low"
    assert aggregate_metrics["avg_rag_to_writing_rouge_l"] > 0.10, "RAG to writing proximity too low"
    assert aggregate_metrics["avg_section_to_writing_rouge_l"] > 0.08, "End-to-end proximity too low"
    assert total_time < 900, "Analysis took too long"

    evaluation_results = {
        "test_type": "rag_proximity_analysis",
        "application_id": melanoma_alliance_full_application_id,
        "methodology": {
            "rouge_metrics": ["ROUGE-L", "ROUGE-2"],
            "measurement_points": [
                "section_requirements → retrieval",
                "retrieval → generation",
                "section_requirements → generation",
            ],
            "sections_analyzed": len(proximity_results),
        },
        "aggregate_metrics": aggregate_metrics,
        "section_details": proximity_results,
        "quality_thresholds": {
            "min_section_to_rag_rouge_l": 0.05,
            "min_rag_to_writing_rouge_l": 0.10,
            "min_section_to_writing_rouge_l": 0.08,
            "min_information_flow_score": 0.08,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "proximity_analysis.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info(
        "✅ RAG proximity analysis completed - Avg flow score: %.3f",
        aggregate_metrics["avg_information_flow_score"],
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_APPLICATION, timeout=1200)
async def test_full_pipeline_proximity_assessment(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    logger.info("🚀 Starting comprehensive RAG pipeline proximity assessment")

    start_time = time.time()

    async with async_session_maker() as session:
        application = await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        if not application.grant_template or not application.grant_template.grant_sections:
            raise ValueError("Application must have grant template with sections")

        research_objectives = application.research_objectives or []
        cfp_analysis = application.grant_template.cfp_section_analysis

        grant_sections = application.grant_template.grant_sections
        long_form_sections = [
            section for section in grant_sections if isinstance(section, dict) and section.get("max_words", 0) > 100
        ]

    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
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
        "avg_section_to_rag_proximity": sum(m["section_to_rag_rouge_l"] for m in pipeline_proximity_metrics)
        / len(pipeline_proximity_metrics)
        if pipeline_proximity_metrics
        else 0,
        "avg_rag_to_writing_proximity": sum(m["rag_to_writing_rouge_l"] for m in pipeline_proximity_metrics)
        / len(pipeline_proximity_metrics)
        if pipeline_proximity_metrics
        else 0,
        "avg_end_to_end_proximity": sum(m["section_to_writing_rouge_l"] for m in pipeline_proximity_metrics)
        / len(pipeline_proximity_metrics)
        if pipeline_proximity_metrics
        else 0,
        "avg_information_preservation": sum(m["information_preservation_score"] for m in pipeline_proximity_metrics)
        / len(pipeline_proximity_metrics)
        if pipeline_proximity_metrics
        else 0,
        "total_words_generated": sum(m["generated_word_count"] for m in pipeline_proximity_metrics),
    }

    assert overall_metrics["avg_section_to_rag_proximity"] > 0.05, "Pipeline section to RAG proximity insufficient"
    assert overall_metrics["avg_rag_to_writing_proximity"] > 0.10, "Pipeline RAG to writing proximity insufficient"
    assert overall_metrics["avg_end_to_end_proximity"] > 0.08, "Pipeline end-to-end proximity insufficient"
    assert overall_metrics["avg_information_preservation"] > 0.08, "Overall information preservation too low"
    assert overall_metrics["total_sections_processed"] >= 3, "Insufficient sections processed"

    comprehensive_results = {
        "test_type": "full_pipeline_proximity_assessment",
        "application_id": melanoma_alliance_full_application_id,
        "methodology": {
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
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "full_pipeline_proximity.json"
    save_evaluation_results(comprehensive_results, output_path)

    logger.info(
        "✅ Full pipeline proximity assessment completed",
        extra={
            "sections_processed": overall_metrics["total_sections_processed"],
            "avg_preservation_score": f"{overall_metrics['avg_information_preservation']:.3f}",
            "pipeline_time": f"{pipeline_time:.1f}s",
            "total_time": f"{total_time:.1f}s",
        },
    )


@performance_test(execution_speed=TestExecutionSpeed.SMOKE, domain=TestDomain.RETRIEVAL, timeout=300)
async def test_rouge_implementation_validation(
    logger: logging.Logger,
) -> None:
    logger.info("🧪 Validating ROUGE implementation with known test cases")

    test_cases = [
        {
            "name": "identical_texts",
            "reference": "The quick brown fox jumps over the lazy dog",
            "candidate": "The quick brown fox jumps over the lazy dog",
            "expected_rouge_l": 1.0,
            "expected_rouge_2": 1.0,
        },
        {
            "name": "completely_different",
            "reference": "The quick brown fox jumps over the lazy dog",
            "candidate": "Artificial intelligence helps medical research advancement",
            "expected_rouge_l": 0.0,
            "expected_rouge_2": 0.0,
        },
        {
            "name": "partial_overlap",
            "reference": "melanoma research immunotherapy treatment approaches",
            "candidate": "novel immunotherapy approaches for melanoma treatment development",
            "expected_rouge_l_range": (0.2, 0.6),
            "expected_rouge_2_range": (0.0, 0.2),
        },
        {
            "name": "subset_relationship",
            "reference": "brain metastases melanoma immunotherapy research",
            "candidate": "melanoma research",
            "expected_rouge_l_range": (0.3, 0.7),
            "expected_rouge_2_range": (0.0, 0.4),
        },
    ]

    for test_case in test_cases:
        rouge_l_score = calculate_rouge_l(test_case["reference"], test_case["candidate"])
        rouge_2_score = calculate_rouge_n(test_case["reference"], test_case["candidate"], n=2)

        logger.info(
            "Test case '%s': ROUGE-L=%.3f, ROUGE-2=%.3f",
            test_case["name"],
            rouge_l_score,
            rouge_2_score,
        )

        if "expected_rouge_l" in test_case:
            assert abs(rouge_l_score - test_case["expected_rouge_l"]) < 0.01, (
                f"ROUGE-L score {rouge_l_score} doesn't match expected {test_case['expected_rouge_l']} "
                f"for test case '{test_case['name']}'"
            )

        if "expected_rouge_2" in test_case:
            assert abs(rouge_2_score - test_case["expected_rouge_2"]) < 0.01, (
                f"ROUGE-2 score {rouge_2_score} doesn't match expected {test_case['expected_rouge_2']} "
                f"for test case '{test_case['name']}'"
            )

        if "expected_rouge_l_range" in test_case:
            min_val, max_val = test_case["expected_rouge_l_range"]
            assert min_val <= rouge_l_score <= max_val, (
                f"ROUGE-L score {rouge_l_score} not in expected range {test_case['expected_rouge_l_range']} "
                f"for test case '{test_case['name']}'"
            )

        if "expected_rouge_2_range" in test_case:
            min_val, max_val = test_case["expected_rouge_2_range"]
            assert min_val <= rouge_2_score <= max_val, (
                f"ROUGE-2 score {rouge_2_score} not in expected range {test_case['expected_rouge_2_range']} "
                f"for test case '{test_case['name']}'"
            )

    logger.info("✅ All ROUGE implementation validation tests passed")


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.GRANT_APPLICATION, timeout=900)
async def test_section_length_compliance_analysis(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    logger.info("📏 Starting section length compliance analysis using CFP requirements")

    start_time = time.time()

    async with async_session_maker() as session:
        application = await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        if not application.grant_template or not application.grant_template.grant_sections:
            raise ValueError("Application must have grant template with sections")

        research_objectives = application.research_objectives or []
        cfp_analysis = application.grant_template.cfp_section_analysis

        grant_sections = application.grant_template.grant_sections
        long_form_sections = [
            section for section in grant_sections if isinstance(section, dict) and section.get("max_words", 0) > 100
        ]

        if not long_form_sections:
            raise ValueError("No substantial long-form sections found")

        logger.info(
            "Found %d long-form sections for length compliance analysis",
            len(long_form_sections),
        )

    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
        section_texts = await generate_section_text(
            sections=long_form_sections,
            research_deep_dives=research_objectives,
            application_id=melanoma_alliance_full_application_id,
            cfp_analysis=cfp_analysis,
        )

    length_compliance_results = []
    overall_compliance_status = "PASS"
    failed_sections = []

    for section in long_form_sections:
        section_id = section.get("id", section.get("title", "unknown"))
        section_title = section.get("title", "Unknown Section")
        generated_text = section_texts.get(section_id, "")

        if not generated_text:
            logger.warning("No generated text found for section: %s", section_title)
            continue

        actual_word_count = len(generated_text.split())

        word_limits = extract_section_word_limits(section, cfp_analysis)

        compliance_score = calculate_length_compliance_score(
            actual_word_count=actual_word_count,
            min_words=word_limits["min_words"],
            max_words=word_limits["max_words"],
        )

        section_result = {
            "section_id": section_id,
            "section_title": section_title,
            "word_limits": word_limits,
            "compliance_score": compliance_score,
            "generated_text_sample": generated_text[:300] + "..." if len(generated_text) > 300 else generated_text,
        }

        length_compliance_results.append(section_result)

        if compliance_score["compliance_status"] == "FAIL":
            overall_compliance_status = "FAIL"
            failed_sections.append(
                {
                    "section": section_title,
                    "grade": compliance_score["grade"],
                    "issues": compliance_score["issues"],
                }
            )

        logger.info(
            "Section %s - Words: %d, Limits: min=%s max=%s, Grade: %s, Status: %s",
            section_title,
            actual_word_count,
            word_limits["min_words"],
            word_limits["max_words"],
            compliance_score["grade"],
            compliance_score["compliance_status"],
        )

    total_time = time.time() - start_time

    grade_distribution = {}
    for result in length_compliance_results:
        grade = result["compliance_score"]["grade"]
        grade_distribution[grade] = grade_distribution.get(grade, 0) + 1

    aggregate_metrics = {
        "sections_analyzed": len(length_compliance_results),
        "overall_compliance_status": overall_compliance_status,
        "failed_sections_count": len(failed_sections),
        "grade_distribution": grade_distribution,
        "avg_compliance_percentage": sum(
            r["compliance_score"]["compliance_percentage"] for r in length_compliance_results
        )
        / len(length_compliance_results)
        if length_compliance_results
        else 0,
        "sections_with_cfp_limits": sum(
            1 for r in length_compliance_results if r["word_limits"]["cfp_max_words"] is not None
        ),
        "sections_with_template_only_limits": sum(
            1
            for r in length_compliance_results
            if r["word_limits"]["cfp_max_words"] is None and r["word_limits"]["template_max_words"] is not None
        ),
        "total_analysis_time": total_time,
    }

    assert overall_compliance_status == "PASS" or aggregate_metrics["avg_compliance_percentage"] >= 70, (
        f"Overall length compliance failed: {failed_sections}"
    )
    assert aggregate_metrics["sections_analyzed"] >= 3, "Insufficient sections analyzed"
    assert total_time < 900, "Analysis took too long"

    evaluation_results = {
        "test_type": "section_length_compliance_analysis",
        "application_id": melanoma_alliance_full_application_id,
        "methodology": {
            "compliance_criteria": {
                "grade_A": "≥80% of maximum word limit",
                "grade_B": "60-80% of maximum word limit",
                "grade_F": "<60% of maximum OR exceeds maximum OR below minimum",
            },
            "word_limit_sources": ["CFP analysis length_constraints", "Grant template max_words"],
            "parsing_patterns": ["X words maximum", "maximum of X words", "X-Y words range"],
        },
        "aggregate_metrics": aggregate_metrics,
        "section_details": length_compliance_results,
        "failed_sections": failed_sections,
        "compliance_summary": {
            "total_sections": len(length_compliance_results),
            "passing_sections": len(length_compliance_results) - len(failed_sections),
            "grade_A_count": grade_distribution.get("A", 0),
            "grade_B_count": grade_distribution.get("B", 0),
            "grade_F_count": grade_distribution.get("F", 0),
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "length_compliance_analysis.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info(
        "✅ Length compliance analysis completed - Status: %s, Avg compliance: %.1f%%",
        overall_compliance_status,
        aggregate_metrics["avg_compliance_percentage"],
    )


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_APPLICATION, timeout=1500)
async def test_integrated_proximity_and_length_assessment(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    logger.info("🔄 Starting integrated ROUGE proximity and length compliance assessment")

    start_time = time.time()

    async with async_session_maker() as session:
        application = await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        if not application.grant_template or not application.grant_template.grant_sections:
            raise ValueError("Application must have grant template with sections")

        research_objectives = application.research_objectives or []
        cfp_analysis = application.grant_template.cfp_section_analysis

        grant_sections = application.grant_template.grant_sections
        long_form_sections = [
            section for section in grant_sections if isinstance(section, dict) and section.get("max_words", 0) > 100
        ]

    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
        pipeline_start = time.time()
        section_texts = await generate_section_text(
            sections=long_form_sections,
            research_deep_dives=research_objectives,
            application_id=melanoma_alliance_full_application_id,
            cfp_analysis=cfp_analysis,
        )
        pipeline_time = time.time() - pipeline_start

    integrated_results = []

    for section in long_form_sections:
        section_id = section.get("id", section.get("title", "unknown"))
        section_title = section.get("title", "Unknown Section")
        generated_text = section_texts.get(section_id, "")

        if not generated_text:
            continue

        section_requirements = extract_section_requirements_text(section, cfp_analysis)

        retrieval_results = await retrieve_documents(
            application_id=melanoma_alliance_full_application_id,
            search_queries=section.get("search_queries", [section_title])[:8],
            task_description=f"Generate content for {section_title}",
            max_tokens=8000,
        )
        retrieved_context = "\n".join(retrieval_results)

        proximity_metrics = {
            "section_to_rag_rouge_l": calculate_rouge_l(section_requirements, retrieved_context),
            "rag_to_writing_rouge_l": calculate_rouge_l(retrieved_context, generated_text),
            "section_to_writing_rouge_l": calculate_rouge_l(section_requirements, generated_text),
        }

        word_limits = extract_section_word_limits(section, cfp_analysis)
        actual_word_count = len(generated_text.split())
        length_compliance = calculate_length_compliance_score(
            actual_word_count=actual_word_count,
            min_words=word_limits["min_words"],
            max_words=word_limits["max_words"],
        )

        combined_quality_score = (
            proximity_metrics["section_to_rag_rouge_l"] * 15
            + proximity_metrics["rag_to_writing_rouge_l"] * 25
            + proximity_metrics["section_to_writing_rouge_l"] * 30
            + (length_compliance["compliance_percentage"] / 100) * 30
        )

        section_assessment = (
            "EXCELLENT"
            if combined_quality_score >= 80
            else "GOOD"
            if combined_quality_score >= 60
            else "ADEQUATE"
            if combined_quality_score >= 40
            else "POOR"
        )

        integrated_result = {
            "section_id": section_id,
            "section_title": section_title,
            "proximity_metrics": proximity_metrics,
            "length_compliance": length_compliance,
            "word_limits": word_limits,
            "combined_quality_score": combined_quality_score,
            "section_assessment": section_assessment,
            "actual_word_count": actual_word_count,
            "retrieval_document_count": len(retrieval_results),
        }

        integrated_results.append(integrated_result)

        logger.info(
            "Section %s - Quality: %.1f (%s), ROUGE: %.3f, Length: %s (%d words)",
            section_title,
            combined_quality_score,
            section_assessment,
            proximity_metrics["section_to_writing_rouge_l"],
            length_compliance["grade"],
            actual_word_count,
        )

    total_time = time.time() - start_time

    overall_metrics = {
        "total_sections_processed": len(integrated_results),
        "pipeline_generation_time": pipeline_time,
        "total_analysis_time": total_time,
        "avg_combined_quality_score": sum(r["combined_quality_score"] for r in integrated_results)
        / len(integrated_results)
        if integrated_results
        else 0,
        "avg_proximity_rouge_l": sum(r["proximity_metrics"]["section_to_writing_rouge_l"] for r in integrated_results)
        / len(integrated_results)
        if integrated_results
        else 0,
        "avg_length_compliance": sum(r["length_compliance"]["compliance_percentage"] for r in integrated_results)
        / len(integrated_results)
        if integrated_results
        else 0,
        "assessment_distribution": {
            "excellent": sum(1 for r in integrated_results if r["section_assessment"] == "EXCELLENT"),
            "good": sum(1 for r in integrated_results if r["section_assessment"] == "GOOD"),
            "adequate": sum(1 for r in integrated_results if r["section_assessment"] == "ADEQUATE"),
            "poor": sum(1 for r in integrated_results if r["section_assessment"] == "POOR"),
        },
    }

    assert overall_metrics["avg_combined_quality_score"] >= 50, "Overall quality score too low"
    assert overall_metrics["avg_proximity_rouge_l"] >= 0.08, "Overall proximity insufficient"
    assert overall_metrics["avg_length_compliance"] >= 70, "Overall length compliance insufficient"
    assert overall_metrics["assessment_distribution"]["poor"] <= 1, "Too many poor quality sections"

    comprehensive_results = {
        "test_type": "integrated_proximity_and_length_assessment",
        "application_id": melanoma_alliance_full_application_id,
        "methodology": {
            "combined_quality_formula": "15% section_to_rag + 25% rag_to_writing + 30% section_to_writing + 30% length_compliance",
            "quality_thresholds": {
                "excellent": "≥80",
                "good": "60-80",
                "adequate": "40-60",
                "poor": "<40",
            },
        },
        "overall_metrics": overall_metrics,
        "section_results": integrated_results,
        "performance_benchmarks": {
            "minimum_quality_score": 50,
            "minimum_proximity_rouge": 0.08,
            "minimum_length_compliance": 70,
            "maximum_poor_sections": 1,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "integrated_assessment.json"
    save_evaluation_results(comprehensive_results, output_path)

    logger.info(
        "✅ Integrated assessment completed - Quality: %.1f, Proximity: %.3f, Compliance: %.1f%%",
        overall_metrics["avg_combined_quality_score"],
        overall_metrics["avg_proximity_rouge_l"],
        overall_metrics["avg_length_compliance"],
    )
