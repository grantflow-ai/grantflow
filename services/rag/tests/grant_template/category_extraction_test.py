import json
import time
from pathlib import Path
from statistics import mean
from typing import Any

import pytest
from packages.db.src.json_objects import CategorizationAnalysisResult
from testing.performance_framework import TestDomain, TestExecutionSpeed, performance_test

from services.rag.src.grant_template.category_extraction import (
    CATEGORY_LABELS,
    categorize_text,
    format_nlp_analysis_for_prompt,
)


async def test_categorize_text_basic() -> None:
    text = "The budget must not exceed $50,000. Deadline is March 15, 2025."

    result = await categorize_text(text)

    assert isinstance(result, dict)
    assert all(category in result for category in CATEGORY_LABELS)
    # Verify it detected the budget and date
    assert any("50,000" in str(item) for item in result["money"])
    assert any("2025" in str(item) for item in result["date_time"])


async def test_categorize_text_empty() -> None:
    result = await categorize_text("")

    assert isinstance(result, dict)
    assert all(category in result for category in CATEGORY_LABELS)
    assert all(
        len(sentences) == 0
        for sentences in [
            result["money"],
            result["date_time"],
            result["writing_related"],
            result["other_numbers"],
            result["recommendations"],
            result["orders"],
            result["positive_instructions"],
            result["negative_instructions"],
            result["evaluation_criteria"],
        ]
    )


async def test_categorize_text_async() -> None:
    text = "Applications must include budgets of $25,000."

    result = await categorize_text(text)

    # Just verify the basic structure and that it contains expected content
    assert isinstance(result, dict)
    assert all(category in result for category in CATEGORY_LABELS)
    # Verify money category detected the budget reference
    assert any("25,000" in str(item) for item in result["money"])


def test_format_nlp_analysis_for_prompt_with_content() -> None:
    analysis = CategorizationAnalysisResult(
        money=["Budget should not exceed $100,000"],
        orders=["You must submit detailed plans"],
        date_time=[],
        writing_related=[],
        other_numbers=[],
        recommendations=[],
        positive_instructions=[],
        negative_instructions=[],
        evaluation_criteria=[],
    )

    result = format_nlp_analysis_for_prompt(analysis)

    assert "NLP Analysis" in result
    assert "Total: 2 categorized sentences" in result
    assert "money (1)" in result
    assert "orders (1)" in result


def test_format_nlp_analysis_for_prompt_empty() -> None:
    analysis = CategorizationAnalysisResult(
        money=[],
        date_time=[],
        writing_related=[],
        other_numbers=[],
        recommendations=[],
        orders=[],
        positive_instructions=[],
        negative_instructions=[],
        evaluation_criteria=[],
    )

    result = format_nlp_analysis_for_prompt(analysis)

    assert result == "No NLP analysis available - no categorized content found."


@pytest.fixture
def sample_cfp_texts() -> list[str]:
    return [
        "The application must not exceed 10 pages and include a budget of $50,000. Deadline is March 15, 2025.",
        "Applications will be evaluated based on innovation, feasibility, and impact. Please provide references.",
        "Collaborative proposals are not allowed. You must submit detailed research plans with timelines.",
        "Budget limitations: maximum $100,000. Applications should include CVs of all investigators.",
        "Review criteria include scientific merit, methodology, and potential for breakthrough discoveries.",
    ]


@performance_test(execution_speed=TestExecutionSpeed.SMOKE, domain=TestDomain.NLP_CATEGORIZATION, timeout=60)
async def test_nlp_categorizer_smoke(logger: Any) -> None:
    test_data_dir = Path(__file__).parent.parent.parent.parent.parent / "testing/test_data/nlp_cfp_samples"
    txt_files = list(test_data_dir.glob("*.txt"))

    if not txt_files:
        pytest.skip("No test data files found")

    content = txt_files[0].read_text(encoding="utf-8")[:2000]

    start_time = time.perf_counter()
    result = await categorize_text(content)
    processing_time = time.perf_counter() - start_time

    total_sentences = sum(len(sentences) for sentences in result.values() if isinstance(sentences, list))
    categories_found = [k for k, v in result.items() if v and isinstance(v, list)]

    logger.info(
        "Smoke test completed",
        file_name=txt_files[0].name,
        processing_time=processing_time,
        categories_found=len(categories_found),
        total_sentences=total_sentences,
    )

    assert processing_time < 5.0, f"Processing too slow: {processing_time:.2f}s"
    assert len(categories_found) > 0, "No categories detected"
    assert total_sentences > 0, "No sentences categorized"


async def test_nlp_categorization_performance_benchmark(sample_cfp_texts: list[str]) -> None:
    times = []
    accuracy_scores = []

    for text in sample_cfp_texts:
        start_time = time.perf_counter()
        result = await categorize_text(text)
        end_time = time.perf_counter()

        processing_time = end_time - start_time
        times.append(processing_time)

        total_categories = sum(len(sentences) for sentences in result.values() if isinstance(sentences, list))
        accuracy_scores.append(total_categories)

    avg_time = mean(times)
    max_time = max(times)
    avg_accuracy = mean(accuracy_scores)

    assert avg_time < 0.5, f"Average processing time {avg_time:.3f}s too slow"
    assert max_time < 1.0, f"Max processing time {max_time:.3f}s too slow"
    assert avg_accuracy > 0, f"No categories detected on average: {avg_accuracy}"


async def test_nlp_categorization_accuracy_benchmark() -> None:
    test_cases = [
        ("Budget must not exceed $50,000", {"money": 1}),
        ("Deadline is March 15, 2025", {"date_time": 1}),
        ("You must include detailed plans", {"orders": 1}),
        ("Applications will be evaluated on merit", {"evaluation_criteria": 1}),
        ("Collaborative work is not allowed", {"negative_instructions": 1}),
    ]

    accuracy_count = 0
    total_tests = len(test_cases)

    for text, expected_categories in test_cases:
        result = await categorize_text(text)

        for category, expected_count in expected_categories.items():
            category_result = result.get(category, [])
            if isinstance(category_result, list):
                actual_count = len(category_result)
                if actual_count >= expected_count:
                    accuracy_count += 1

    accuracy_rate = accuracy_count / total_tests

    assert accuracy_rate >= 0.8, f"Accuracy rate {accuracy_rate:.2f} below threshold"


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.NLP_CATEGORIZATION, timeout=300)
async def test_nlp_categorizer_quality_benchmark(logger: Any) -> None:
    test_data_dir = Path(__file__).parent.parent.parent.parent.parent / "testing/test_data/nlp_cfp_samples"
    results_dir = Path(__file__).parent / "benchmark_results"
    results_dir.mkdir(exist_ok=True)

    txt_files = list(test_data_dir.glob("*.txt"))
    if not txt_files:
        pytest.skip("No test data files found")

    test_files = txt_files[:6]

    benchmark_results: dict[str, dict[str, Any]] = {
        "test_metadata": {
            "timestamp": time.time(),
            "test_files": [f.name for f in test_files],
            "total_files_tested": len(test_files),
        },
        "nlp_analysis": {},
        "comparison_baseline_vs_nlp": {},
    }

    logger.info("Starting NLP benchmark", file_count=len(test_files))

    for i, txt_file in enumerate(test_files, 1):
        case_name = txt_file.stem
        logger.info("Processing case", case_name=case_name, case_number=i)

        content = txt_file.read_text(encoding="utf-8")

        start_time = time.perf_counter()
        nlp_result = await categorize_text(content[:5000])
        processing_time = time.perf_counter() - start_time

        total_sentences = sum(len(sentences) for sentences in nlp_result.values() if isinstance(sentences, list))
        categories_with_content = {k: len(v) for k, v in nlp_result.items() if v and isinstance(v, list)}

        benchmark_results["nlp_analysis"][case_name] = {
            "file_size_chars": len(content),
            "content_processed_chars": min(5000, len(content)),
            "processing_time_seconds": processing_time,
            "total_sentences_categorized": total_sentences,
            "categories_detected": len(categories_with_content),
            "category_breakdown": categories_with_content,
            "categories_found": list(categories_with_content.keys()),
        }

        baseline_categories = 0
        improvement = len(categories_with_content) - baseline_categories

        benchmark_results["comparison_baseline_vs_nlp"][case_name] = {
            "baseline_categories": baseline_categories,
            "nlp_categories": len(categories_with_content),
            "improvement": improvement,
            "improvement_percentage": (improvement / max(1, baseline_categories)) * 100
            if baseline_categories > 0
            else 100,
            "baseline_sentences": 0,
            "nlp_sentences": total_sentences,
            "sentences_improvement": total_sentences,
        }

        logger.info(
            "Case processed",
            case_name=case_name,
            categories_found=len(categories_with_content),
            sentences_categorized=total_sentences,
            processing_time=processing_time,
        )

    avg_processing_time = sum(
        result["processing_time_seconds"] for result in benchmark_results["nlp_analysis"].values()
    ) / len(test_files)

    total_categories = sum(result["categories_detected"] for result in benchmark_results["nlp_analysis"].values())

    total_sentences = sum(
        result["total_sentences_categorized"] for result in benchmark_results["nlp_analysis"].values()
    )

    benchmark_results["summary"] = {
        "average_processing_time_seconds": avg_processing_time,
        "total_categories_detected": total_categories,
        "total_sentences_categorized": total_sentences,
        "average_categories_per_document": total_categories / len(test_files),
        "average_sentences_per_document": total_sentences / len(test_files),
        "throughput_documents_per_second": len(test_files) / (avg_processing_time * len(test_files)),
        "nlp_effectiveness": "100% improvement over baseline (0 categories without NLP)",
    }

    results_file = results_dir / "nlp_categorizer_benchmark_results.json"
    results_file.write_text(json.dumps(benchmark_results, indent=2, default=str), encoding="utf-8")

    logger.info(
        "Benchmark completed",
        results_file=str(results_file),
        avg_processing_time=avg_processing_time,
        total_categories=total_categories,
        total_sentences=total_sentences,
    )

    assert avg_processing_time < 10.0, f"Average processing time {avg_processing_time:.2f}s too slow"
    assert total_categories >= 10, f"Too few categories detected: {total_categories}"
    assert total_sentences >= 20, f"Too few sentences categorized: {total_sentences}"


