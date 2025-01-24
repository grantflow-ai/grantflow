from typing import Final

from numpy import argsort, array, zeros
from sklearn.metrics.pairwise import cosine_similarity

from src.db.tables import TextVector

ELEMENT_TYPE_WEIGHTS: Final[dict[str, float]] = {
    "paragraph": 1.0,
    "table_cell": 0.8,
    "formula": 0.7,
    "figure": 0.5,
    "raw": 0.5,
    "sectionHeading": 1.2,
    "title": 1.3,
    "footnote": 0.6,
}

ROLE_WEIGHTS: Final[dict[str, float]] = {
    "header": 1.2,
    "body": 1.0,
    "footer": 0.6,
    "pageHeader": 1.2,
    "pageFooter": 0.5,
    "formulaBlock": 0.8,
    "pageNumber": 0.3,
}

PAGE_WEIGHT: Final[float] = 0.15
CONFIDENCE_WEIGHT: Final[float] = 0.2


def rerank_documents(
    *,
    query_embeddings: list[list[float]],
    vectors: list[TextVector],
) -> list[TextVector]:
    """Rerank the documents based on the query embeddings and the vector metadata.

    Args:
        query_embeddings: The query embeddings.
        vectors: The list of text vectors.

    Returns:
        The reranked list of text vectors.
    """
    if not vectors:
        return []

    query_embeddings_array = array(query_embeddings)
    if query_embeddings_array.ndim == 1:
        query_embeddings_array = query_embeddings_array.reshape(1, -1)

    doc_embeddings = array([vector.embedding for vector in vectors])
    content_scores_matrix = cosine_similarity(query_embeddings_array, doc_embeddings)
    content_scores = content_scores_matrix.mean(axis=0)  # Aggregate across query embeddings

    layout_scores = zeros(len(vectors))
    for i, text_vector in enumerate(vectors):
        element_type = text_vector.chunk.get("element_type", "raw")
        layout_scores[i] += ELEMENT_TYPE_WEIGHTS.get(element_type, 0.5)

        role = text_vector.chunk.get("role", "body")
        layout_scores[i] += ROLE_WEIGHTS.get(role, 1.0)

        page_number = text_vector.chunk.get("page_number", 1)
        layout_scores[i] += max(0, PAGE_WEIGHT * (1 / page_number))

        confidence = text_vector.chunk.get("confidence", 1.0)
        layout_scores[i] += CONFIDENCE_WEIGHT * confidence

    combined_scores = content_scores + layout_scores
    sorted_indices = argsort(combined_scores)[::-1]

    return [vectors[i] for i in sorted_indices]
