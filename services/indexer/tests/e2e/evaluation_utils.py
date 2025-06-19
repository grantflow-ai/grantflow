import math
from pathlib import Path
from typing import Any, cast

from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.serialization import deserialize


def cosine_similarity(embedding_a: list[float], embedding_b: list[float]) -> float:
    dot_product = sum(x * y for x, y in zip(embedding_a, embedding_b, strict=False))
    norm_a = math.sqrt(sum(x**2 for x in embedding_a))
    norm_b = math.sqrt(sum(x**2 for x in embedding_b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def calculate_embedding_statistics(vectors: list[VectorDTO]) -> dict[str, float]:
    if not vectors:
        return {}

    dimensions = [len(v["embedding"]) for v in vectors]
    unique_dims = set(dimensions)

    norms = [math.sqrt(sum(x**2 for x in v["embedding"])) for v in vectors]

    content_lengths = [len(v["chunk"]["content"]) for v in vectors]

    avg_norm = sum(norms) / len(norms)
    avg_content_length = sum(content_lengths) / len(content_lengths)

    norm_variance = sum((norm - avg_norm) ** 2 for norm in norms) / len(norms)
    content_variance = sum((length - avg_content_length) ** 2 for length in content_lengths) / len(content_lengths)

    return {
        "vector_count": len(vectors),
        "unique_dimensions": len(unique_dims),
        "embedding_dimension": next(iter(unique_dims)) if len(unique_dims) == 1 else -1,
        "avg_embedding_norm": avg_norm,
        "embedding_norm_std": math.sqrt(norm_variance),
        "avg_content_length": avg_content_length,
        "content_length_std": math.sqrt(content_variance),
        "min_content_length": min(content_lengths),
        "max_content_length": max(content_lengths),
        "min_embedding_norm": min(norms),
        "max_embedding_norm": max(norms),
    }


def assess_chunk_quality(vectors: list[VectorDTO]) -> dict[str, Any]:
    if not vectors:
        return {"quality_score": 0.0, "issues": ["No vectors provided"]}

    issues = []
    quality_metrics = {}

    chunk_contents = [v["chunk"]["content"] for v in vectors]
    empty_chunks = sum(1 for content in chunk_contents if not content.strip())
    short_chunks = sum(1 for content in chunk_contents if len(content.strip()) < 50)

    if empty_chunks > 0:
        issues.append(f"{empty_chunks} empty chunks found")

    if short_chunks > len(vectors) * 0.2:
        issues.append(f"{short_chunks} chunks are very short (< 50 chars)")

    unique_contents = set(chunk_contents)
    duplicate_ratio = 1 - (len(unique_contents) / len(chunk_contents))

    if duplicate_ratio > 0.1:
        issues.append(f"High duplicate content ratio: {duplicate_ratio:.1%}")

    content_lengths = [len(content) for content in chunk_contents]
    avg_length = sum(content_lengths) / len(content_lengths)

    if avg_length < 200:
        issues.append(f"Average chunk length too short: {avg_length:.0f} chars")
    elif avg_length > 3000:
        issues.append(f"Average chunk length too long: {avg_length:.0f} chars")

    base_score = 1.0

    if empty_chunks > 0:
        base_score -= 0.3
    if duplicate_ratio > 0.1:
        base_score -= 0.2
    if short_chunks > len(vectors) * 0.2:
        base_score -= 0.2
    if avg_length < 200 or avg_length > 3000:
        base_score -= 0.3

    quality_metrics.update(
        {
            "quality_score": max(0.0, base_score),
            "duplicate_ratio": duplicate_ratio,
            "empty_chunks": empty_chunks,
            "short_chunks": short_chunks,
            "avg_chunk_length": avg_length,
            "total_chunks": len(vectors),
            "issues": issues,
        }
    )

    return quality_metrics


def assess_semantic_coherence(vectors: list[VectorDTO], sample_size: int = 10) -> dict[str, float]:
    if len(vectors) < 2:
        return {"coherence_score": 0.0, "avg_similarity": 0.0}

    step = max(1, len(vectors) // sample_size)
    similarities = []

    for i in range(0, min(len(vectors) - 1, sample_size * step), step):
        if i + 1 < len(vectors):
            sim = cosine_similarity(vectors[i]["embedding"], vectors[i + 1]["embedding"])
            similarities.append(sim)

    if not similarities:
        return {"coherence_score": 0.0, "avg_similarity": 0.0}

    avg_similarity = sum(similarities) / len(similarities)

    coherence_score = 1.0
    if avg_similarity < 0.3:
        coherence_score -= 0.4
    elif avg_similarity > 0.9:
        coherence_score -= 0.3

    return {
        "coherence_score": coherence_score,
        "avg_similarity": avg_similarity,
        "similarity_samples": len(similarities),
        "min_similarity": min(similarities),
        "max_similarity": max(similarities),
    }


def assess_coverage_quality(vectors: list[VectorDTO], original_text: str) -> dict[str, float]:
    if not vectors or not original_text.strip():
        return {"coverage_score": 0.0, "coverage_ratio": 0.0}

    total_chunk_chars = sum(len(v["chunk"]["content"]) for v in vectors)
    original_chars = len(original_text)

    coverage_ratio = total_chunk_chars / original_chars if original_chars > 0 else 0.0

    coverage_score = 1.0
    if coverage_ratio < 0.7:
        coverage_score -= 0.4
    elif coverage_ratio > 1.5:
        coverage_score -= 0.3

    return {
        "coverage_score": coverage_score,
        "coverage_ratio": coverage_ratio,
        "total_chunk_chars": total_chunk_chars,
        "original_chars": original_chars,
    }


def assess_embedding_quality(vectors: list[VectorDTO]) -> dict[str, Any]:
    if not vectors:
        return {"embedding_quality_score": 0.0, "issues": ["No vectors provided"]}

    issues = []

    dimensions = [len(v["embedding"]) for v in vectors]
    unique_dims = set(dimensions)

    if len(unique_dims) > 1:
        issues.append(f"Inconsistent embedding dimensions: {unique_dims}")

    expected_dim = 384
    if len(unique_dims) == 1 and next(iter(unique_dims)) != expected_dim:
        issues.append(f"Unexpected embedding dimension: {next(iter(unique_dims))}, expected {expected_dim}")

    norms = [math.sqrt(sum(x**2 for x in v["embedding"])) for v in vectors]
    avg_norm = sum(norms) / len(norms)

    if avg_norm < 0.1 or avg_norm > 3.0:
        issues.append(f"Unusual average embedding norm: {avg_norm:.3f}")

    zero_embeddings = sum(1 for norm in norms if norm < 0.01)
    if zero_embeddings > 0:
        issues.append(f"{zero_embeddings} near-zero embeddings found")

    quality_score = 1.0
    if len(unique_dims) > 1:
        quality_score -= 0.5
    if zero_embeddings > 0:
        quality_score -= 0.3
    if avg_norm < 0.1 or avg_norm > 3.0:
        quality_score -= 0.2

    return {
        "embedding_quality_score": max(0.0, quality_score),
        "avg_norm": avg_norm,
        "unique_dimensions": len(unique_dims),
        "zero_embeddings": zero_embeddings,
        "issues": issues,
    }


def comprehensive_quality_assessment(vectors: list[VectorDTO], original_text: str = "") -> dict[str, Any]:
    if not vectors:
        return {"overall_quality_score": 0.0, "assessment": "No vectors to assess"}

    chunk_quality = assess_chunk_quality(vectors)
    embedding_quality = assess_embedding_quality(vectors)
    coherence = assess_semantic_coherence(vectors)

    assessment = {
        "chunk_quality": chunk_quality,
        "embedding_quality": embedding_quality,
        "semantic_coherence": coherence,
        "statistics": calculate_embedding_statistics(vectors),
    }

    if original_text:
        coverage = assess_coverage_quality(vectors, original_text)
        assessment["coverage_quality"] = coverage

    scores = [
        chunk_quality.get("quality_score", 0.0),
        embedding_quality.get("embedding_quality_score", 0.0),
        coherence.get("coherence_score", 0.0),
    ]

    if original_text:
        coverage_score = float(assessment.get("coverage_quality", {}).get("coverage_score", 0.0))
        scores.append(coverage_score)

    overall_score = sum(scores) / len(scores) if scores else 0.0
    assessment["overall_quality_score"] = cast("Any", overall_score)

    all_issues: list[Any] = []
    all_issues.extend(chunk_quality.get("issues", []))
    all_issues.extend(embedding_quality.get("issues", []))

    assessment["all_issues"] = cast("Any", all_issues)
    assessment["has_issues"] = cast("Any", len(all_issues) > 0)

    return assessment


def load_fixture_vectors(fixture_file_path: str) -> list[VectorDTO]:
    try:
        with Path(fixture_file_path).open("rb") as f:
            data = deserialize(f.read(), dict[str, Any])

        rag_file_data = data.get("rag_file", {})
        text_vectors = rag_file_data.get("text_vectors", [])

        vectors = []
        for tv in text_vectors:
            vector_dto = cast(
                "VectorDTO",
                {
                    "rag_source_id": tv.get("rag_source_id", ""),
                    "chunk": tv.get("chunk", {"content": ""}),
                    "embedding": tv.get("embedding", []),
                },
            )
            vectors.append(vector_dto)

        return vectors
    except (FileNotFoundError, KeyError, ValueError):
        return []
