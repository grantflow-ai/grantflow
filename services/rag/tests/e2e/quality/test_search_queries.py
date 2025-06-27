import logging
import time
from datetime import UTC, datetime

import pytest
from anyio import Path
from packages.shared_utils.src.serialization import serialize
from services.rag.src.utils.search_queries import handle_create_search_queries
from testing import RESULTS_FOLDER, TEST_DATA_SOURCES
from testing.e2e_utils import E2ETestCategory, e2e_test
from testing.rag_ai_evaluation import evaluate_query_generation_quality
from testing.rag_evaluation import assess_query_quality, calculate_performance_metrics, save_evaluation_results


@e2e_test(category=E2ETestCategory.SMOKE, timeout=60)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_handle_create_search_queries(
    logger: logging.Logger,
    data_file: Path,
) -> None:
    logger.info("Running end-to-end test for search query generation")
    retrieval_file = RESULTS_FOLDER / f"retrieval_{data_file.name}_test_result.json"
    if not retrieval_file.exists():
        return

    start_time = time.time()

    context = retrieval_file.read_text()
    user_prompt = f"""
        The task is to test the RAG pipeline by testing that generating queries works.
        Identify and return effective queries from the provided content JSON array.

        {context}
        """

    queries = await handle_create_search_queries(user_prompt=user_prompt)

    end_time = time.time()

    assert 3 <= len(queries) <= 10

    quality_metrics = assess_query_quality(queries)
    performance = calculate_performance_metrics(start_time, end_time, "query_generation")
    ai_evaluation = await evaluate_query_generation_quality(context[:2000], queries)

    assert quality_metrics["diversity"] > 0.4
    assert quality_metrics["avg_length"] >= 3
    assert performance["within_threshold"]

    evaluation_results = {
        "test_type": "search_query_generation_enhanced",
        "data_file": str(data_file),
        "results": {
            "query_count": len(queries),
            "quality_metrics": quality_metrics,
            "ai_evaluation": ai_evaluation,
            "performance": performance,
            "generated_queries": queries,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    queries_result = RESULTS_FOLDER / f"queries_generation_{data_file.name}_test_result.json"
    if not queries_result.exists():
        queries_result.write_bytes(serialize(queries))

    evaluation_output = (
        RESULTS_FOLDER
        / "rag_evaluation"
        / f"query_generation_{data_file.name}_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    )
    save_evaluation_results(evaluation_results, evaluation_output)

    logger.info(
        "Query generation test completed for %s with %d queries, diversity: %.2f",
        data_file.name,
        len(queries),
        quality_metrics["diversity"],
    )
