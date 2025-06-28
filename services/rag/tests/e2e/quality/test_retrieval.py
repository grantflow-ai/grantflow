import logging
import time
from datetime import UTC, datetime
from typing import Any

from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.serialization import serialize
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.e2e_utils import E2ETestCategory, e2e_test
from testing.rag_ai_evaluation import evaluate_retrieval_relevance
from testing.rag_evaluation import calculate_performance_metrics, calculate_retrieval_diversity, save_evaluation_results

from services.rag.src.utils.retrieval import retrieve_documents


@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_document_retrieval(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    logger.info("Running end-to-end test for documents retrieval")
    start_time = time.time()

    async with async_session_maker() as session:
        application = await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        task_description = f"""
            The task is to test the RAG pipeline by testing that retrieval works.

            Application ID: {application.id}
            Title: {application.title}
            Grant Template: {application.grant_template.id if application.grant_template else "N/A"}
            """

        results = await retrieve_documents(
            application_id=melanoma_alliance_full_application_id,
            task_description=task_description,
        )

    end_time = time.time()

    assert len(results) > 0
    assert len(results) <= 100
    assert all(isinstance(result, str) for result in results)

    diversity_score = calculate_retrieval_diversity(results)
    performance = calculate_performance_metrics(start_time, end_time, "retrieval")
    ai_evaluation = await evaluate_retrieval_relevance(task_description, results)

    assert diversity_score > 0.2
    assert performance["within_threshold"], (
        f"Retrieval took {performance['execution_time']:.2f}s, exceeded threshold of {performance['threshold']}s"
    )

    evaluation_results = {
        "test_type": "document_retrieval_enhanced",
        "application_id": melanoma_alliance_full_application_id,
        "results": {
            "document_count": len(results),
            "diversity_score": diversity_score,
            "ai_evaluation": ai_evaluation,
            "performance": performance,
            "documents": results,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    retrival_results = (
        RESULTS_FOLDER
        / melanoma_alliance_full_application_id
        / f"retrieval_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    )
    retrival_results.parent.mkdir(parents=True, exist_ok=True)
    retrival_results.write_bytes(serialize(results))

    evaluation_output = (
        RESULTS_FOLDER / "rag_evaluation" / f"retrieval_evaluation_{datetime.now(UTC).strftime('%d_%m_%Y_%H_%M')}.json"
    )
    save_evaluation_results(evaluation_results, evaluation_output)

    logger.info(
        "Retrieval test completed with diversity: %.2f, performance: %.2fs",
        diversity_score,
        performance["execution_time"],
    )
