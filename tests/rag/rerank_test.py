from typing import cast

import pytest
from numpy.random import default_rng

from src.constants import EMBEDDING_DIMENSIONS
from src.db.tables import TextVector
from src.rag.rerank import rerank_documents
from tests.factories import TextVectorFactory

rng = default_rng()


@pytest.fixture
def mock_text_vectors() -> list[TextVector]:
    return [
        TextVectorFactory.build(
            chunk={"element_type": "paragraph", "role": "body", "page_number": 1, "confidence": 0.95},
        ),
        TextVectorFactory.build(
            chunk={"element_type": "table_cell", "role": "header", "page_number": 2, "confidence": 0.85},
        ),
        TextVectorFactory.build(
            chunk={"element_type": "figure", "role": "footer", "page_number": 3, "confidence": 0.75},
        ),
    ]


@pytest.fixture
def query_embeddings() -> list[list[float]]:
    return [cast(list[float], rng.random(EMBEDDING_DIMENSIONS).tolist())]


def test_rerank_documents_empty_vectors(query_embeddings: list[list[float]]) -> None:
    result = rerank_documents(query_embeddings=query_embeddings, vectors=[])
    assert result == [], "Empty input vectors should return an empty list."


def test_rerank_documents_basic_case(query_embeddings: list[list[float]], mock_text_vectors: list[TextVector]) -> None:
    result = rerank_documents(query_embeddings=query_embeddings, vectors=mock_text_vectors)
    assert len(result) == len(mock_text_vectors)
    assert result[0].chunk["element_type"] == "paragraph", "Paragraphs should have the highest priority."
    assert result[-1].chunk["element_type"] == "figure", "Figures should have the lowest priority."
