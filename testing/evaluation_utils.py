import math
from typing import Any


def cosine_similarity(embedding_a: list[float], embedding_b: list[float]) -> float:
    if len(embedding_a) != len(embedding_b):
        msg = f"Embedding dimensions don't match: {len(embedding_a)} vs {len(embedding_b)}"
        raise ValueError(msg)

    dot_product = sum(x * y for x, y in zip(embedding_a, embedding_b, strict=False))
    norm_a = math.sqrt(sum(x**2 for x in embedding_a))
    norm_b = math.sqrt(sum(x**2 for x in embedding_b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def calculate_embedding_statistics(vectors: list[dict[str, Any]]) -> dict[str, float]:
    if not vectors:
        return {}

    dimensions = [len(v["embedding"]) for v in vectors]
    unique_dims = set(dimensions)

    norms = [math.sqrt(sum(x**2 for x in v["embedding"])) for v in vectors]

    content_lengths = [len(v["chunk"]["content"]) for v in vectors]

    return {
        "vector_count": len(vectors),
        "unique_dimensions": len(unique_dims),
        "avg_dimension": sum(dimensions) / len(dimensions),
        "avg_norm": sum(norms) / len(norms),
        "avg_content_length": sum(content_lengths) / len(content_lengths),
    }
