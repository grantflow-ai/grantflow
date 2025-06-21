import logging
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from packages.db.src.utils import retrieve_application
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.e2e_utils import E2ETestCategory, e2e_test
from testing.rag_ai_evaluation import (
    evaluate_cfp_extraction_accuracy,
    evaluate_query_generation_quality,
    evaluate_retrieval_relevance,
)
from testing.rag_evaluation import (
    assess_grant_template_quality,
    assess_query_quality,
    calculate_performance_metrics,
    calculate_retrieval_diversity,
    save_evaluation_results,
    validate_cfp_extraction_structure,
)

from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from services.rag.src.grant_template.handler import extract_and_enrich_sections
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries
from services.rag.tests.e2e.utils import create_rag_sources_from_cfp_file


@e2e_test(category=E2ETestCategory.SMOKE, timeout=180)
async def test_retrieval_smoke(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
    mocker: MockerFixture,
) -> None:
    start_time = time.time()

    async with async_session_maker() as session:
        await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        results = await retrieve_documents(
            rerank=True,
            application_id=melanoma_alliance_full_application_id,
            task_description="Test retrieval functionality",
            search_queries=["melanoma research", "cancer treatment", "immunotherapy"],
        )

    end_time = time.time()
    performance = calculate_performance_metrics(start_time, end_time, "retrieval")

    assert len(results) > 0, "Should retrieve at least some documents"
    assert len(results) <= 100, "Should not exceed maximum retrieval limit"
    assert all(isinstance(result, str) for result in results), "All results should be strings"
    assert all(len(result.strip()) > 0 for result in results), "All results should have content"

    assert performance["execution_time"] < 600, "Should complete within 10 minutes"

    logger.info(
        "Retrieval smoke test completed in %.2f seconds with %d results", performance["execution_time"], len(results)
    )


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=600)
async def test_retrieval_quality_assessment(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    start_time = time.time()

    async with async_session_maker() as session:
        await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        task_description = "Grant application for melanoma research involving brain metastases and immunotherapy"

        results = await retrieve_documents(
            rerank=True,
            application_id=melanoma_alliance_full_application_id,
            task_description=task_description,
        )

    end_time = time.time()

    diversity_score = calculate_retrieval_diversity(results)
    performance = calculate_performance_metrics(start_time, end_time, "retrieval")

    assert len(results) > 0
    assert len(results) <= 100
    assert diversity_score > 0.2
    assert performance["execution_time"] < 600

    evaluation_results = {
        "test_type": "retrieval_quality_assessment",
        "application_id": melanoma_alliance_full_application_id,
        "results": {
            "document_count": len(results),
            "diversity_score": diversity_score,
            "performance": performance,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "retrieval_quality.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info("Retrieval quality assessment completed with diversity score: %.2f", diversity_score)


@e2e_test(category=E2ETestCategory.SEMANTIC_EVALUATION, timeout=600)
async def test_retrieval_semantic_evaluation(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    start_time = time.time()

    async with async_session_maker() as session:
        await retrieve_application(application_id=melanoma_alliance_full_application_id, session=session)

        task_description = "Research melanoma treatment and immunotherapy approaches"

        results = await retrieve_documents(
            rerank=True,
            application_id=melanoma_alliance_full_application_id,
            task_description=task_description,
        )

    end_time = time.time()

    ai_evaluation = await evaluate_retrieval_relevance(task_description, results)

    diversity_score = calculate_retrieval_diversity(results)
    performance = calculate_performance_metrics(start_time, end_time, "retrieval")

    assert len(results) > 0
    assert len(results) <= 100
    assert diversity_score > 0.1

    if ai_evaluation["evaluation_enabled"]:
        assert ai_evaluation["avg_relevance"] >= 2.5

    evaluation_results = {
        "test_type": "retrieval_semantic_evaluation",
        "application_id": melanoma_alliance_full_application_id,
        "query": task_description,
        "results": {
            "document_count": len(results),
            "diversity_score": diversity_score,
            "ai_evaluation": ai_evaluation,
            "performance": performance,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "retrieval_semantic.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info("Semantic evaluation completed with AI relevance: %.2f", ai_evaluation.get("avg_relevance", 0))


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=600)
@pytest.mark.parametrize("cfp_name", ["melanoma_alliance", "nih"])
async def test_query_generation_quality(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    cfp_name: str,
    melanoma_alliance_full_application_id: str,
) -> None:
    start_time = time.time()

    template_id = str(uuid4())
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name=f"{cfp_name}.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    context = f"Generated test data for {cfp_name} CFP with {len(source_ids)} sources"

    queries = await handle_create_search_queries(
        user_prompt=f"Generate effective search queries for {cfp_name} grant research: {context}"
    )

    end_time = time.time()

    quality_metrics = assess_query_quality(queries)
    performance = calculate_performance_metrics(start_time, end_time, "query_generation")
    ai_evaluation = await evaluate_query_generation_quality(context, queries)

    assert 3 <= len(queries) <= 10
    assert quality_metrics["diversity"] > 0.3
    assert quality_metrics["avg_length"] >= 2
    assert performance["execution_time"] < 600

    evaluation_results = {
        "test_type": "query_generation_quality",
        "cfp_name": cfp_name,
        "results": {
            "query_count": len(queries),
            "quality_metrics": quality_metrics,
            "ai_evaluation": ai_evaluation,
            "performance": performance,
            "generated_queries": queries,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / f"query_quality_{cfp_name}.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info("Query generation quality test completed for %s with %d queries", cfp_name, len(queries))


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=600)
@pytest.mark.parametrize("cfp_name", ["melanoma_alliance", "standard_awards"])
async def test_cfp_extraction_quality(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    cfp_name: str,
    melanoma_alliance_full_application_id: str,
) -> None:
    start_time = time.time()

    template_id = str(uuid4())
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name=f"{cfp_name}.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    extraction_result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    end_time = time.time()

    extraction_dict = {
        "organization_id": extraction_result.get("organization_id"),
        "content": [
            {"title": item.get("title", ""), "subtitles": item.get("subtitles", [])}
            for item in extraction_result.get("content", [])
        ],
        "cfp_subject": extraction_result.get("cfp_subject", ""),
    }

    structure_validation = validate_cfp_extraction_structure(extraction_dict)
    performance = calculate_performance_metrics(start_time, end_time, "cfp_extraction")

    cfp_file_path = Path(__file__).parent.parent / "fixtures" / f"{cfp_name}.md"
    original_cfp = ""
    if cfp_file_path.exists():
        original_cfp = cfp_file_path.read_text()

    ai_evaluation = await evaluate_cfp_extraction_accuracy(original_cfp, extraction_dict)

    assert all(structure_validation.values())
    assert len(extraction_result.get("content", [])) >= 1
    assert performance["execution_time"] < 600

    evaluation_results = {
        "test_type": "cfp_extraction_quality",
        "cfp_name": cfp_name,
        "results": {
            "structure_validation": structure_validation,
            "content_count": len(extraction_result.get("content", [])),
            "organization_identified": extraction_result.get("organization_id") is not None,
            "ai_evaluation": ai_evaluation,
            "performance": performance,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / f"cfp_extraction_{cfp_name}.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info("CFP extraction quality test completed for %s", cfp_name)


@e2e_test(category=E2ETestCategory.E2E_FULL, timeout=600)
async def test_grant_template_generation_full_pipeline(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    start_time = time.time()

    template_id = str(uuid4())
    source_ids = await create_rag_sources_from_cfp_file(
        cfp_file_name="melanoma_alliance.md",
        grant_template_id=template_id,
        session_maker=async_session_maker,
        grant_application_id=melanoma_alliance_full_application_id,
    )

    extraction_result = await handle_extract_cfp_data_from_rag_sources(
        source_ids=source_ids,
        organization_mapping=organization_mapping,
        session_maker=async_session_maker,
    )

    mock_job_manager = MagicMock()
    mock_job_manager.add_notification = AsyncMock()

    sections = await extract_and_enrich_sections(
        cfp_content=extraction_result["content"],
        cfp_subject=extraction_result["cfp_subject"],
        organization=None,
        parent_id=uuid4(),
        job_manager=mock_job_manager,
    )

    end_time = time.time()

    sections_dict = [
        {
            "id": getattr(section, "id", ""),
            "title": getattr(section, "title", ""),
            "content": getattr(section, "content", ""),
        }
        for section in sections
    ]

    template_quality = assess_grant_template_quality(sections_dict)
    performance = calculate_performance_metrics(start_time, end_time, "template_generation")

    assert template_quality["section_count"] >= 1
    assert template_quality["has_required_fields"]
    assert template_quality["avg_content_length"] > 50
    assert template_quality["section_diversity"] > 0.5
    assert performance["execution_time"] < 600

    evaluation_results = {
        "test_type": "grant_template_full_pipeline",
        "results": {
            "template_quality": template_quality,
            "performance": performance,
            "source_count": len(source_ids),
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

    output_path = RESULTS_FOLDER / "rag_evaluation" / "template_generation_full.json"
    save_evaluation_results(evaluation_results, output_path)

    logger.info("Grant template generation completed with %d sections", template_quality["section_count"])
