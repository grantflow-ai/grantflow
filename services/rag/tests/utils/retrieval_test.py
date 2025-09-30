from typing import TYPE_CHECKING
from unittest.mock import Mock

import pytest
from packages.db.src.tables import GrantingInstitutionSource, TextVector
from packages.shared_utils.src.extraction import Entity, Keyword
from pytest_mock import MockFixture

if TYPE_CHECKING:
    from kreuzberg._types import Metadata

from services.rag.src.utils.retrieval import (
    calculate_document_metadata_score,
    handle_retrieval,
    retrieve_documents,
)


def _create_enriched_metadata(**kwargs: object) -> "Metadata":
    """Create enriched metadata that satisfies type checker while testing runtime behavior."""
    return kwargs  # type: ignore[return-value]


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


def test_calculate_document_metadata_score_none_metadata() -> None:
    """Test metadata scoring with None metadata returns penalty score."""
    score = calculate_document_metadata_score(None, ["cancer research", "immunotherapy"])
    assert score == 0.7


def test_calculate_document_metadata_score_empty_metadata() -> None:
    """Test metadata scoring with empty metadata."""
    metadata = _create_enriched_metadata(keywords=[], entities=[], document_type="")
    score = calculate_document_metadata_score(metadata, ["cancer research"])
    assert 0.5 <= score <= 1.0
    assert score == 0.5  # No matches, base score


def test_calculate_document_metadata_score_keyword_match() -> None:
    """Test metadata scoring with keyword overlap."""
    metadata = _create_enriched_metadata(
        keywords=[Keyword(keyword="cancer", score=0.9), Keyword(keyword="immunotherapy", score=0.85)],
        entities=[],
        document_type="article",
    )
    score = calculate_document_metadata_score(metadata, ["cancer research", "treatment"])
    assert 0.5 <= score <= 1.0
    # Should have keyword match for "cancer"
    assert score > 0.5


def test_calculate_document_metadata_score_entity_match() -> None:
    """Test metadata scoring with entity overlap."""
    metadata = _create_enriched_metadata(
        keywords=[],
        entities=[Entity(type="ORG", text="NIH"), Entity(type="PERSON", text="Dr. Smith")],
        document_type="article",
    )
    score = calculate_document_metadata_score(metadata, ["NIH funding", "Smith"])
    assert 0.5 <= score <= 1.0
    # Should have entity matches
    assert score > 0.5


def test_calculate_document_metadata_score_scientific_boost() -> None:
    """Test metadata scoring with scientific document type boost."""
    metadata = _create_enriched_metadata(
        keywords=[],
        entities=[],
        document_type="research paper",
    )
    score = calculate_document_metadata_score(metadata, ["test query"])
    assert 0.5 <= score <= 1.0
    # Should get boost from research document type
    expected_score = 0.5 + (0.3 * 0.5)  # Base + (doc_type_weight * 0.5)
    assert abs(score - expected_score) < 0.01


def test_calculate_document_metadata_score_all_factors() -> None:
    """Test metadata scoring with keyword, entity, and doc type matches."""
    metadata = _create_enriched_metadata(
        keywords=[
            Keyword(keyword="cancer", score=0.9),
            Keyword(keyword="immunotherapy", score=0.85),
            Keyword(keyword="treatment", score=0.8),
        ],
        entities=[Entity(type="ORG", text="NIH"), Entity(type="DISEASE", text="glioblastoma")],
        document_type="scientific article",
    )
    score = calculate_document_metadata_score(metadata, ["cancer immunotherapy", "NIH", "glioblastoma treatment"])
    assert 0.5 <= score <= 1.0
    # Should score high with multiple matches across all categories
    assert score > 0.8


def test_calculate_document_metadata_score_string_keywords() -> None:
    """Test metadata scoring handles string keywords (legacy format)."""
    # Legacy format uses plain strings instead of TypedDict
    metadata = {"keywords": ["cancer", "research", "treatment"], "entities": [], "document_type": "article"}
    score = calculate_document_metadata_score(metadata, ["cancer treatment"])  # type: ignore[arg-type]
    assert 0.5 <= score <= 1.0
    assert score > 0.5


def test_calculate_document_metadata_score_string_entities() -> None:
    """Test metadata scoring handles string entities (legacy format)."""
    # Legacy format uses plain strings instead of TypedDict
    metadata = {"keywords": [], "entities": ["NIH", "Dr. Smith"], "document_type": "article"}
    score = calculate_document_metadata_score(metadata, ["NIH funding"])  # type: ignore[arg-type]
    assert 0.5 <= score <= 1.0
    assert score > 0.5


def test_calculate_document_metadata_score_case_insensitive() -> None:
    """Test metadata scoring is case insensitive."""
    metadata = _create_enriched_metadata(
        keywords=[Keyword(keyword="Cancer", score=0.9), Keyword(keyword="IMMUNOTHERAPY", score=0.85)],
        entities=[Entity(type="ORG", text="NIH")],
        document_type="article",
    )
    score = calculate_document_metadata_score(metadata, ["cancer RESEARCH", "nih funding"])
    assert 0.5 <= score <= 1.0
    assert score > 0.5


def test_calculate_document_metadata_score_no_query_terms() -> None:
    """Test metadata scoring with empty search queries."""
    metadata = _create_enriched_metadata(
        keywords=[Keyword(keyword="cancer", score=0.9)],
        entities=[Entity(type="ORG", text="NIH")],
        document_type="research",
    )
    score = calculate_document_metadata_score(metadata, [])
    assert 0.5 <= score <= 1.0
    # Should only get doc_type boost
    expected_score = 0.5 + (0.3 * 0.5)
    assert abs(score - expected_score) < 0.01


def test_calculate_document_metadata_score_punctuation_handling() -> None:
    """Test metadata scoring handles punctuation in queries properly."""
    metadata = _create_enriched_metadata(
        keywords=[Keyword(keyword="cancer", score=0.9), Keyword(keyword="immunotherapy", score=0.85)],
        entities=[],
        document_type="article",
    )
    # Query with punctuation should still match
    score = calculate_document_metadata_score(metadata, ["cancer, immunotherapy", "cancer-related"])
    assert 0.5 <= score <= 1.0
    assert score > 0.5  # Should match both "cancer" and "immunotherapy"


def test_calculate_document_metadata_score_custom_weights() -> None:
    """Test metadata scoring with custom weights."""
    metadata = _create_enriched_metadata(
        keywords=[Keyword(keyword="cancer", score=0.9)],
        entities=[Entity(type="ORG", text="NIH")],
        document_type="research",
    )
    # Custom weights: emphasize keywords more
    custom_weights = {"keywords": 0.7, "entities": 0.2, "doc_type": 0.1}
    score_custom = calculate_document_metadata_score(metadata, ["cancer"], weights=custom_weights)

    # Default weights for comparison
    score_default = calculate_document_metadata_score(metadata, ["cancer"])

    assert 0.5 <= score_custom <= 1.0
    assert 0.5 <= score_default <= 1.0
    # Custom should differ from default (verifies weights are used)
    assert score_custom != score_default


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
