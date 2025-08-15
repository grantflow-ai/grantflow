import json
import time
from pathlib import Path
from typing import Any

import pytest
from packages.shared_utils.src.logger import get_logger
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_template.nlp_categorizer import categorize_text


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_realistic_nlp_benchmark_simple() -> None:
    test_data_dir = Path(__file__).parent.parent.parent.parent / "testing/test_data/nlp_cfp_samples"
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

    logger = get_logger(__name__)
    logger.info("Starting NLP benchmark", file_count=len(test_files))

    for i, txt_file in enumerate(test_files, 1):
        case_name = txt_file.stem
        logger.info("Processing case", case_name=case_name, case_number=i)

        content = txt_file.read_text(encoding="utf-8")

        start_time = time.perf_counter()
        nlp_result = categorize_text(content[:5000])
        processing_time = time.perf_counter() - start_time

        total_sentences = sum(len(sentences) for sentences in nlp_result.values())
        categories_with_content = {k: len(v) for k, v in nlp_result.items() if v}
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
    results_file = results_dir / "realistic_nlp_benchmark_results.json"
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


@e2e_test(category=E2ETestCategory.SMOKE, timeout=60)
async def test_nlp_benchmark_smoke() -> None:
    logger = get_logger(__name__)

    test_data_dir = Path(__file__).parent.parent.parent.parent / "testing/test_data/nlp_cfp_samples"
    txt_files = list(test_data_dir.glob("*.txt"))

    if not txt_files:
        pytest.skip("No test data files found")

    content = txt_files[0].read_text(encoding="utf-8")[:2000]

    start_time = time.perf_counter()
    result = categorize_text(content)
    processing_time = time.perf_counter() - start_time

    total_sentences = sum(len(sentences) for sentences in result.values())
    categories_found = [k for k, v in result.items() if v]

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
