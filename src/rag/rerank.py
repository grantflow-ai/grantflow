from typing import Final

from numpy import argsort, array, zeros
from sklearn.metrics.pairwise import cosine_similarity

from src.db.tables import TextVector

ELEMENT_TYPE_WEIGHTS: Final[dict[str, float]] = {
    "paragraph": 1.0,
    "table_cell": 1.0,
    "formula": 1.0,
    "figure": 1.0,
    "raw": 1.0,
    "sectionHeading": 1.0,
    "title": 1.0,
    "footnote": 1.0,
}

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

        confidence = text_vector.chunk.get("confidence", 1.0)
        layout_scores[i] += CONFIDENCE_WEIGHT * confidence

    combined_scores = content_scores + layout_scores
    sorted_indices = argsort(combined_scores)[::-1]

    return [vectors[i] for i in sorted_indices]
