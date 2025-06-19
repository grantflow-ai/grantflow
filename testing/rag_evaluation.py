import json
import logging
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


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


def calculate_retrieval_diversity(documents: list[str]) -> float:
    if len(documents) <= 1:
        return 0.0

    words = []
    for doc in documents:
        doc_words = set(doc.lower().split())
        words.append(doc_words)

    similarities = []
    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            intersection = len(words[i] & words[j])
            union = len(words[i] | words[j])
            jaccard = intersection / union if union > 0 else 0
            similarities.append(jaccard)

    avg_similarity = sum(similarities) / len(similarities)
    return 1.0 - avg_similarity


def assess_query_quality(queries: list[str]) -> dict[str, Any]:
    if not queries:
        return {"diversity": 0.0, "avg_length": 0, "keyword_coverage": 0.0}

    lengths = [len(query.split()) for query in queries]
    avg_length = sum(lengths) / len(lengths)

    all_words = []
    for query in queries:
        words = [word.lower().strip(".,!?") for word in query.split()]
        all_words.extend(words)

    word_counts = Counter(all_words)
    unique_words = len(word_counts)
    total_words = len(all_words)

    diversity = unique_words / total_words if total_words > 0 else 0.0

    return {
        "diversity": diversity,
        "avg_length": avg_length,
        "keyword_coverage": unique_words,
        "query_count": len(queries),
    }


def validate_cfp_extraction_structure(extraction_result: dict[str, Any]) -> dict[str, bool]:
    checks = {
        "has_organization_id": "organization_id" in extraction_result,
        "has_content": "content" in extraction_result and isinstance(extraction_result["content"], list),
        "has_cfp_subject": "cfp_subject" in extraction_result,
        "content_not_empty": (
            "content" in extraction_result
            and isinstance(extraction_result["content"], list)
            and len(extraction_result["content"]) > 0
        ),
    }

    if checks["content_not_empty"]:
        content_items = extraction_result["content"]
        checks["content_has_titles"] = all("title" in item for item in content_items)
        checks["content_has_subtitles"] = all("subtitles" in item for item in content_items)
        checks["subtitles_are_lists"] = all(isinstance(item.get("subtitles"), list) for item in content_items)
    else:
        checks.update(
            {
                "content_has_titles": False,
                "content_has_subtitles": False,
                "subtitles_are_lists": False,
            }
        )

    return checks


def assess_grant_template_quality(sections: list[dict[str, Any]]) -> dict[str, Any]:
    if not sections:
        return {
            "section_count": 0,
            "has_required_fields": False,
            "avg_content_length": 0,
            "section_diversity": 0.0,
        }

    required_fields = ["id", "title", "content"]
    has_required_fields = all(all(field in section for field in required_fields) for section in sections)

    content_lengths = []
    titles = []

    for section in sections:
        if section.get("content"):
            content_lengths.append(len(str(section["content"])))
        if section.get("title"):
            titles.append(section["title"].lower())

    avg_content_length = sum(content_lengths) / len(content_lengths) if content_lengths else 0

    unique_titles = len(set(titles))
    section_diversity = unique_titles / len(titles) if titles else 0.0

    return {
        "section_count": len(sections),
        "has_required_fields": has_required_fields,
        "avg_content_length": avg_content_length,
        "section_diversity": section_diversity,
        "title_uniqueness": unique_titles,
    }


def validate_grant_application_structure(application_content: str) -> dict[str, Any]:
    if not application_content:
        return {
            "has_content": False,
            "word_count": 0,
            "has_structure": False,
            "citation_count": 0,
        }

    word_count = len(application_content.split())

    sections = re.findall(r"#{1,3}\s+[^\n]+", application_content)
    has_structure = len(sections) >= 2

    citations = re.findall(r"\[[^\]]+\]|\([^)]*\d{4}[^)]*\)", application_content)
    citation_count = len(citations)

    return {
        "has_content": True,
        "word_count": word_count,
        "has_structure": has_structure,
        "section_count": len(sections),
        "citation_count": citation_count,
        "avg_section_length": word_count / len(sections) if sections else word_count,
    }


def calculate_performance_metrics(start_time: float, end_time: float, operation: str) -> dict[str, Any]:
    execution_time = end_time - start_time

    performance_thresholds = {
        "retrieval": 5.0,
        "query_generation": 10.0,
        "cfp_extraction": 60.0,
        "template_generation": 180.0,
        "application_generation": 300.0,
        "section_extraction": 180.0,
    }

    threshold = performance_thresholds.get(operation, 60.0)
    within_threshold = execution_time <= threshold

    return {
        "execution_time": execution_time,
        "threshold": threshold,
        "within_threshold": within_threshold,
        "performance_score": min(1.0, threshold / execution_time) if execution_time > 0 else 1.0,
    }


def save_evaluation_results(results: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        with output_path.open("w") as f:
            json.dump(results, f, indent=2, default=str)
        logger.info("Evaluation results saved to %s", output_path)
    except (OSError, ValueError) as e:
        logger.error("Failed to save evaluation results: %s", e)
        raise


def load_test_fixture(fixture_path: Path) -> Any:
    try:
        with fixture_path.open("r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error("Failed to load test fixture from %s: %s", fixture_path, e)
        raise
