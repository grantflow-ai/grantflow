from unittest.mock import MagicMock, Mock

import pytest
from packages.db.src.tables import GrantingInstitutionSource, TextVector
from packages.shared_utils.src.exceptions import EvaluationError
from pytest_mock import MockFixture

from services.rag.src.utils.retrieval import (
    handle_retrieval,
    retrieve_documents,
)


@pytest.fixture
def mock_embeddings() -> list[list[float]]:
    return [[0.1, 0.2, 0.3, 0.4]]


@pytest.fixture
def mock_text_vectors() -> list[TextVector]:
    vector1 = Mock(spec=TextVector)
    vector1.chunk = {"content": "Test content 1", "page_number": 1}

    vector2 = Mock(spec=TextVector)
    vector2.chunk = {"content": "Test content 2", "page_number": 2}

    return [vector1, vector2]


async def test_handle_retrieval(
    mock_text_vectors: list[TextVector],
    mocker: MockFixture,
    trace_id: str,
) -> None:
    mock_generate_embeddings = mocker.patch("services.rag.src.utils.retrieval.generate_embeddings")
    mock_generate_embeddings.return_value = [[0.1, 0.2, 0.3]]

    mock_retrieve_vectors = mocker.patch("services.rag.src.utils.retrieval.retrieve_vectors_for_embedding")
    mock_retrieve_vectors.return_value = mock_text_vectors

    result = await handle_retrieval(
        application_id="test-app-id",
        max_results=10,
        search_queries=["test query"],
        trace_id=trace_id,
    )

    assert result == mock_text_vectors
    mock_generate_embeddings.assert_called_once_with(["test query"])
    mock_retrieve_vectors.assert_called_once()


async def test_handle_retrieval_with_organization_id(
    mock_text_vectors: list[TextVector],
    mocker: MockFixture,
    trace_id: str,
) -> None:
    mock_generate_embeddings = mocker.patch("services.rag.src.utils.retrieval.generate_embeddings")
    mock_generate_embeddings.return_value = [[0.1, 0.2, 0.3]]

    mock_retrieve_vectors = mocker.patch("services.rag.src.utils.retrieval.retrieve_vectors_for_embedding")
    mock_retrieve_vectors.return_value = mock_text_vectors

    result = await handle_retrieval(
        organization_id="test-org-id",
        max_results=10,
        search_queries=["test query"],
        trace_id=trace_id,
    )

    assert result == mock_text_vectors
    mock_retrieve_vectors.assert_called_once()
    assert mock_retrieve_vectors.call_args[1]["file_table_cls"] == GrantingInstitutionSource


async def test_retrieve_documents_basic(
    mock_text_vectors: list[TextVector],
    mocker: MockFixture,
    trace_id: str,
) -> None:
    mock_handle_retrieval = mocker.patch("services.rag.src.utils.retrieval.handle_retrieval")
    mock_handle_retrieval.return_value = mock_text_vectors

    mock_handle_create_queries = mocker.patch("services.rag.src.utils.retrieval.handle_create_search_queries")
    mock_handle_create_queries.return_value = ["generated query"]

    mock_post_process = mocker.patch("services.rag.src.utils.retrieval.post_process_documents")
    processed_docs = ["Processed content 1", "Processed content 2"]
    mock_post_process.return_value = processed_docs

    result = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test task",
        trace_id=trace_id,
    )

    assert result == processed_docs

    mock_handle_create_queries.assert_called_once()
    mock_handle_retrieval.assert_called_once()
    mock_post_process.assert_called_once()


async def test_retrieve_documents_with_guided_retrieval_insufficient(
    mocker: MockFixture,
    trace_id: str,
) -> None:
    mock_handle_retrieval = mocker.patch("services.rag.src.utils.retrieval.handle_retrieval")
    mock_text_vectors1 = [
        MagicMock(chunk={"content": "Content 1"}),
        MagicMock(chunk={"content": "Content 2"}),
    ]
    mock_text_vectors2 = [
        MagicMock(chunk={"content": "Better content 1"}),
        MagicMock(chunk={"content": "Better content 2"}),
    ]
    mock_handle_retrieval.side_effect = [mock_text_vectors1, mock_text_vectors2]

    mock_handle_create_queries = mocker.patch("services.rag.src.utils.retrieval.handle_create_search_queries")
    mock_handle_create_queries.return_value = ["original query"]

    mock_post_process = mocker.patch("services.rag.src.utils.retrieval.post_process_documents")
    processed_docs1 = ["Processed content 1", "Processed content 2"]
    processed_docs2 = ["Better processed 1", "Better processed 2"]
    mock_post_process.side_effect = [processed_docs1, processed_docs2]

    mock_completions_request = mocker.patch("services.rag.src.utils.retrieval.handle_completions_request")
    mock_completions_request.side_effect = [
        {
            "assessment": {
                "relevance_score": 5.0,
                "comprehensiveness_score": 4.0,
                "diversity_score": 3.0,
                "depth_score": 4.0,
                "freshness_score": 6.0,
                "overall_score": 4.4,
                "explanation": "The retrieved content lacks depth and diversity",
            },
            "optimization": {
                "information_gaps": ["Missing specific details"],
                "improved_queries": ["better query"],
                "query_strategies": "Be more specific",
            },
        },
        {
            "assessment": {
                "relevance_score": 9.0,
                "comprehensiveness_score": 8.0,
                "diversity_score": 8.0,
                "depth_score": 8.0,
                "freshness_score": 8.0,
                "overall_score": 8.2,
                "explanation": "Much better content now",
            },
            "optimization": {
                "information_gaps": [],
                "improved_queries": [],
                "query_strategies": "Current strategy is working well",
            },
        },
    ]

    result = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test task",
        with_guided_retrieval=True,
        trace_id=trace_id,
    )

    assert result == processed_docs2

    assert mock_handle_retrieval.call_count == 2
    assert mock_handle_retrieval.call_args_list[1][1]["search_queries"] == ["better query"]


async def test_retrieve_documents_guided_retrieval_max_attempts(
    mocker: MockFixture,
    trace_id: str,
) -> None:
    mock_handle_create_queries = mocker.patch("services.rag.src.utils.retrieval.handle_create_search_queries")
    mock_handle_create_queries.return_value = ["initial query"]

    mock_handle_retrieval = mocker.patch("services.rag.src.utils.retrieval.handle_retrieval")
    mock_handle_retrieval.return_value = [
        MagicMock(chunk={"content": "Content 1"}),
        MagicMock(chunk={"content": "Content 2"}),
    ]

    mock_post_process = mocker.patch("services.rag.src.utils.retrieval.post_process_documents")
    mock_post_process.return_value = [{"content": "Processed content 1"}, {"content": "Processed content 2"}]

    mock_completions_request = mocker.patch("services.rag.src.utils.retrieval.handle_completions_request")
    mock_completions_request.side_effect = EvaluationError("Insufficient context retrieved")

    with pytest.raises(EvaluationError, match="Insufficient context retrieved"):
        await retrieve_documents(
            application_id="test-app-id",
            task_description="Test task",
            with_guided_retrieval=True,
            trace_id=trace_id,
        )

    assert mock_handle_create_queries.call_count >= 1
    assert mock_handle_retrieval.call_count >= 1
    assert mock_post_process.call_count >= 1


async def test_retrieve_documents_with_hashable_types(
    mock_text_vectors: list[TextVector],
    mocker: MockFixture,
) -> None:
    mock_handle_retrieval = mocker.patch("services.rag.src.utils.retrieval.handle_retrieval")
    mock_handle_retrieval.return_value = mock_text_vectors

    mock_post_process = mocker.patch("services.rag.src.utils.retrieval.post_process_documents")
    processed_docs = ["Processed content 1", "Processed content 2"]
    mock_post_process.return_value = processed_docs

    result = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test task",
        search_queries=["test query", "another query"],
        trace_id="trace_id_1",
        form_inputs={"key": "value"},
        section_title="Test Section",
    )

    assert result == processed_docs
    mock_handle_retrieval.assert_called_once()
    mock_post_process.assert_called_once()


async def test_retrieve_documents_caching_with_different_kwargs(
    mock_text_vectors: list[TextVector],
    mocker: MockFixture,
) -> None:
    mock_handle_retrieval = mocker.patch("services.rag.src.utils.retrieval.handle_retrieval")
    mock_handle_retrieval.return_value = mock_text_vectors

    mock_post_process = mocker.patch("services.rag.src.utils.retrieval.post_process_documents")
    processed_docs = ["Processed content 1", "Processed content 2"]
    mock_post_process.return_value = processed_docs

    result1 = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test task",
        search_queries=["test query"],
        trace_id="trace_id_1",
        section_title="Section 1",
        form_inputs={"key": "value"},
    )

    result2 = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test task",
        search_queries=["test query"],
        trace_id="trace_id_2",
        section_title="Section 2",
        form_inputs={"key": "different_value"},
    )

    assert result1 == result2 == processed_docs

    assert mock_handle_retrieval.call_count == 2
    assert mock_post_process.call_count == 2


async def test_retrieve_documents_cache_hit(
    mock_text_vectors: list[TextVector],
    mocker: MockFixture,
) -> None:
    mock_handle_retrieval = mocker.patch("services.rag.src.utils.retrieval.handle_retrieval")
    mock_handle_retrieval.return_value = mock_text_vectors

    mock_post_process = mocker.patch("services.rag.src.utils.retrieval.post_process_documents")
    processed_docs = ["Cached content 1", "Cached content 2"]
    mock_post_process.return_value = processed_docs

    result1 = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test caching",
        search_queries=["cache test"],
        trace_id="trace_id_1",
    )

    result2 = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test caching",
        search_queries=["cache test"],
        trace_id="trace_id_2",
    )

    assert result1 == result2 == processed_docs

    assert mock_handle_retrieval.call_count == 1
    assert mock_post_process.call_count == 1


async def test_retrieve_documents_cache_miss_different_params(
    mock_text_vectors: list[TextVector],
    mocker: MockFixture,
) -> None:
    mock_handle_retrieval = mocker.patch("services.rag.src.utils.retrieval.handle_retrieval")
    mock_handle_retrieval.return_value = mock_text_vectors

    mock_post_process = mocker.patch("services.rag.src.utils.retrieval.post_process_documents")
    processed_docs = ["Content 1", "Content 2"]
    mock_post_process.return_value = processed_docs

    result1 = await retrieve_documents(
        application_id="test-app-id-1",
        task_description="Test caching",
        search_queries=["cache test"],
        trace_id="trace_id_1",
    )

    result2 = await retrieve_documents(
        application_id="test-app-id-2",
        task_description="Test caching",
        search_queries=["cache test"],
        trace_id="trace_id_2",
    )

    assert result1 == result2 == processed_docs

    assert mock_handle_retrieval.call_count == 2
    assert mock_post_process.call_count == 2


async def test_retrieve_documents_cache_ttl_expiration(
    mock_text_vectors: list[TextVector],
    mocker: MockFixture,
) -> None:
    mock_handle_retrieval = mocker.patch("services.rag.src.utils.retrieval.handle_retrieval")
    mock_handle_retrieval.return_value = mock_text_vectors

    mock_post_process = mocker.patch("services.rag.src.utils.retrieval.post_process_documents")
    processed_docs = ["Content 1", "Content 2"]
    mock_post_process.return_value = processed_docs

    mock_time = mocker.patch("services.rag.src.utils.retrieval.time.time")
    mock_time.side_effect = [
        1000.0,
        1000.0,
        1000.0,
        1400.0,
        1400.0,
        1400.0,
    ]

    result1 = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test TTL",
        search_queries=["ttl test"],
        trace_id="trace_id_1",
    )

    result2 = await retrieve_documents(
        application_id="test-app-id",
        task_description="Test TTL",
        search_queries=["ttl test"],
        trace_id="trace_id_2",
    )

    assert result1 == result2 == processed_docs

    assert mock_handle_retrieval.call_count == 2
    assert mock_post_process.call_count == 2
