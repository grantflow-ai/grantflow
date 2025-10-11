import time
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock

import pytest
from pytest_mock import MockerFixture

from services.rag.src.grant_application.enrich_terminology_stage import (
    _get_scientific_context as get_scientific_context,
)
from services.rag.src.grant_application.enrich_terminology_stage import (
    enrich_objective_with_wikidata,
)

if TYPE_CHECKING:
    from services.rag.src.grant_application.enrich_research_objective import (
        ObjectiveEnrichmentDTO,
    )


@pytest.fixture
def mock_httpx_response(mocker: MockerFixture) -> MagicMock:
    response = MagicMock()
    response.raise_for_status = MagicMock()
    return response


@pytest.fixture
def mock_httpx_client(mocker: MockerFixture) -> AsyncMock:
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    return client


async def test_wikidata_context_generation_performance(
    mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock
) -> None:
    test_terms = [
        "machine learning",
        "artificial intelligence",
        "neural networks",
        "deep learning",
        "computer vision",
        "natural language processing",
        "reinforcement learning",
        "genetic algorithms",
        "data science",
        "statistical learning",
    ]

    # Create search responses for each term
    search_responses = []
    for i, term in enumerate(test_terms):
        search_response = MagicMock()
        search_response.json.return_value = {
            "search": [{"id": f"Q{100 + i}", "label": term, "description": f"Description for {term}"}]
        }
        search_response.raise_for_status = MagicMock()
        search_responses.append(search_response)

    # Create batch details response
    details_response = MagicMock()
    details_response.json.return_value = {
        "entities": {
            f"Q{100 + i}": {
                "labels": {"en": {"value": term}},
                "descriptions": {"en": {"value": f"Description for {term}"}},
            }
            for i, term in enumerate(test_terms)
        }
    }
    details_response.raise_for_status = MagicMock()

    # 10 search calls + 1 batch details call
    mock_httpx_client.get = AsyncMock(side_effect=[*search_responses, details_response])

    with pytest.MonkeyPatch().context() as m:
        m.setattr(
            "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
            lambda: mock_httpx_client,
        )

        start_time = time.time()
        context = await get_scientific_context(test_terms, "benchmark-trace")
        end_time = time.time()

        processing_time_ms = (end_time - start_time) * 1000
        terms_per_second = len(test_terms) / (processing_time_ms / 1000) if processing_time_ms > 0 else 0

        assert processing_time_ms < 1000, f"Processing time too slow: {processing_time_ms:.2f}ms"
        assert terms_per_second > 1.0, f"Terms per second too low: {terms_per_second:.2f}"
        assert len(context) > 0, "No context generated"


async def test_objective_enrichment_performance(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    test_enrichment_data: ObjectiveEnrichmentDTO = {
        "research_objective": {
            "enriched": "",
            "queries": [],
            "terms": ["machine learning", "artificial intelligence", "neural networks"],
            "context": "",
            "instructions": "Test instructions",
            "description": "Test description",
            "questions": ["Question 1", "Question 2", "Question 3"],
        },
        "research_tasks": [
            {
                "enriched": "",
                "queries": [],
                "terms": ["deep learning", "computer vision"],
                "context": "",
                "instructions": "Task 1 instructions",
                "description": "Task 1 description",
                "questions": ["Task 1 Question 1", "Task 1 Question 2", "Task 1 Question 3"],
            },
            {
                "enriched": "",
                "queries": [],
                "terms": ["natural language processing", "reinforcement learning"],
                "context": "",
                "instructions": "Task 2 instructions",
                "description": "Task 2 description",
                "questions": ["Task 2 Question 1", "Task 2 Question 2", "Task 2 Question 3"],
            },
        ],
    }

    mock_httpx_response.json.return_value = {
        "results": {
            "bindings": [
                {
                    "item": {"value": "Q123"},
                    "label": {"value": "machine learning"},
                    "description": {"value": "Field of AI"},
                    "scientific_field": {"value": "Computer Science"},
                }
            ]
        }
    }
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)

        start_time = time.time()
        result = await enrich_objective_with_wikidata(test_enrichment_data, "benchmark-trace")
        end_time = time.time()

        processing_time_ms = (end_time - start_time) * 1000
        terms_count = len(result.get("terms", []))
        terms_per_second = terms_count / (processing_time_ms / 1000) if processing_time_ms > 0 else 0

        assert processing_time_ms < 2000, f"Processing time too slow: {processing_time_ms:.2f}ms"
        assert terms_per_second > 0.5, f"Terms per second too low: {terms_per_second:.2f}"
        assert len(result.get("context", "")) > 0, "No scientific context generated"


async def test_wiki_enhancement_scalability(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    term_counts = [5, 10, 20]
    scalability_results = []

    mock_httpx_response.json.return_value = {
        "results": {
            "bindings": [
                {
                    "item": {"value": "Q123"},
                    "label": {"value": "test"},
                    "description": {"value": "test description"},
                    "scientific_field": {"value": "Test Science"},
                }
            ]
        }
    }
    mock_httpx_client.get = AsyncMock(return_value=mock_httpx_response)

    with pytest.MonkeyPatch().context() as m:
        m.setattr("httpx.AsyncClient", lambda **kwargs: mock_httpx_client)

        for term_count in term_counts:
            test_terms = [f"term_{i}" for i in range(term_count)]

            start_time = time.time()
            context = await get_scientific_context(test_terms, "benchmark-trace")
            end_time = time.time()

            processing_time_ms = (end_time - start_time) * 1000
            terms_per_second = term_count / (processing_time_ms / 1000) if processing_time_ms > 0 else 0

            scalability_results.append(
                {
                    "term_count": term_count,
                    "processing_time_ms": processing_time_ms,
                    "terms_per_second": terms_per_second,
                    "context_length": len(context),
                }
            )

    for _result in scalability_results:
        pass

    for result in scalability_results:
        assert result["processing_time_ms"] < result["term_count"] * 100, (
            f"Processing time scales poorly with {result['term_count']} terms"
        )


async def test_batch_processing_efficiency(mock_httpx_client: AsyncMock, mock_httpx_response: MagicMock) -> None:
    test_terms = [f"term_{i}" for i in range(15)]

    # Create search responses for each term (15 search calls)
    search_responses = []
    for i in range(15):
        search_response = MagicMock()
        search_response.json.return_value = {
            "search": [{"id": f"Q{200 + i}", "label": f"term_{i}", "description": f"Description for term {i}"}]
        }
        search_response.raise_for_status = MagicMock()
        search_responses.append(search_response)

    # Create batch details response (1 call for all 15 entities)
    details_response = MagicMock()
    details_response.json.return_value = {
        "entities": {
            f"Q{200 + i}": {
                "labels": {"en": {"value": f"term_{i}"}},
                "descriptions": {"en": {"value": f"Description for term {i}"}},
            }
            for i in range(15)
        }
    }
    details_response.raise_for_status = MagicMock()

    # 15 search calls + 1 batch details call = 16 total
    mock_httpx_client.get = AsyncMock(side_effect=[*search_responses, details_response])

    with pytest.MonkeyPatch().context() as m:
        m.setattr(
            "services.rag.src.grant_application.enrich_terminology_stage.get_wikimedia_client",
            lambda: mock_httpx_client,
        )

        start_time = time.time()
        await get_scientific_context(test_terms, "benchmark-trace")
        end_time = time.time()

        processing_time_ms = (end_time - start_time) * 1000

        # With new API: 15 search calls + 1 batch details call = 16 total
        assert mock_httpx_client.get.call_count == 16, (
            f"Expected 16 calls (15 searches + 1 batch), got {mock_httpx_client.get.call_count} calls"
        )
        assert processing_time_ms < 1500, f"Batch processing too slow: {processing_time_ms:.2f}ms"
