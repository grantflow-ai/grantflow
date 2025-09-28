import re
from typing import Final

from packages.db.src.json_objects import GrantLongFormSection

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.dto import SourceGroundingMetrics
from services.rag.tests.utils.rouge_utils import calculate_rouge_l, calculate_rouge_n

CITATION_PATTERNS: Final[list[re.Pattern[str]]] = [
    re.compile(r"\[[^\]]+\]"),
    re.compile(r"\([^)]*\d{4}[^)]*\)"),
    re.compile(r"according to [^,.]{5,30}"),
    re.compile(r"as reported by [^,.]{5,30}"),
    re.compile(r"studies show", re.IGNORECASE),
    re.compile(r"research indicates", re.IGNORECASE),
    re.compile(r"findings suggest", re.IGNORECASE),
]

CONTEXT_REFERENCE_PHRASES: Final[set[str]] = {
    "previous research",
    "prior studies",
    "existing literature",
    "published findings",
    "documented evidence",
    "established research",
    "peer-reviewed studies",
    "scientific literature",
    "empirical evidence",
    "clinical trials",
    "systematic reviews",
    "meta-analyses",
}


def calculate_rouge_based_grounding(content: str, rag_context: list[DocumentDTO]) -> dict[str, float]:
    if not rag_context:
        return {
            "rouge_l_score": 0.0,
            "rouge_2_score": 0.0,
            "rouge_3_score": 0.0,
            "max_similarity": 0.0,
            "avg_similarity": 0.0,
        }

    context_texts = [doc["content"] for doc in rag_context if doc.get("content")]

    if not context_texts:
        return {
            "rouge_l_score": 0.0,
            "rouge_2_score": 0.0,
            "rouge_3_score": 0.0,
            "max_similarity": 0.0,
            "avg_similarity": 0.0,
        }

    rouge_l_scores = []
    rouge_2_scores = []
    rouge_3_scores = []

    for context_text in context_texts:
        rouge_l = calculate_rouge_l(context_text, content)
        rouge_2 = calculate_rouge_n(context_text, content, n=2)
        rouge_3 = calculate_rouge_n(context_text, content, n=3)

        rouge_l_scores.append(rouge_l)
        rouge_2_scores.append(rouge_2)
        rouge_3_scores.append(rouge_3)

    return {
        "rouge_l_score": max(rouge_l_scores) if rouge_l_scores else 0.0,
        "rouge_2_score": max(rouge_2_scores) if rouge_2_scores else 0.0,
        "rouge_3_score": max(rouge_3_scores) if rouge_3_scores else 0.0,
        "max_similarity": max(
            max(rouge_l_scores, default=0), max(rouge_2_scores, default=0), max(rouge_3_scores, default=0)
        ),
        "avg_similarity": sum(rouge_l_scores + rouge_2_scores + rouge_3_scores) / max(len(rouge_l_scores) * 3, 1),
    }


def calculate_keyword_coverage(content: str, keywords: list[str]) -> float:
    if not keywords:
        return 1.0

    content_lower = content.lower()
    matched_keywords = 0.0

    for keyword in keywords:
        keyword_lower = keyword.lower()
        if keyword_lower in content_lower:
            matched_keywords += 1.0
        elif len(keyword_lower.split()) > 1:
            keyword_words = keyword_lower.split()
            if all(word in content_lower for word in keyword_words):
                matched_keywords += 0.5

    return matched_keywords / len(keywords)


def calculate_topic_coverage(content: str, topics: list[str]) -> float:
    """Calculate how well the content covers the specified topics.

    Args:
        content: Text content to analyze
        topics: List of topics that should be covered

    Returns:
        Topic coverage score (0.0 to 1.0)
    """
    if not topics:
        return 1.0

    content_lower = content.lower()
    words_in_content = content_lower.split()
    covered_topics = 0.0

    for topic in topics:
        topic_lower = topic.lower()
        # Check for exact topic mention
        if topic_lower in content_lower:
            covered_topics += 1.0
        else:
            # Check for partial matches (individual words from multi-word topics)
            topic_words = topic_lower.split()
            if len(topic_words) > 1:
                # For multi-word topics, check if most words are present
                words_found = sum(1 for word in topic_words if word in words_in_content)
                if words_found >= len(topic_words) * 0.7:  # 70% of words present
                    covered_topics += 0.7
                elif words_found >= len(topic_words) * 0.5:  # 50% of words present
                    covered_topics += 0.5

    return covered_topics / len(topics)


def calculate_search_query_integration(content: str, search_queries: list[str]) -> float:
    if not search_queries:
        return 1.0

    content_lower = content.lower()
    total_integration = 0.0

    for query in search_queries:
        query_lower = query.lower()
        query_words = query_lower.split()

        matched_words = sum(1 for word in query_words if word in content_lower)
        query_integration = matched_words / len(query_words) if query_words else 0.0

        total_integration += query_integration

    return total_integration / len(search_queries)


def assess_context_citation_density(content: str, rag_context: list[DocumentDTO]) -> float:
    if not content.strip():
        return 0.0

    content_lower = content.lower()
    citation_indicators = 0.0
    verified_citations = 0.0

    for pattern in CITATION_PATTERNS:
        matches = pattern.findall(content)
        citation_indicators += float(len(matches))

    for phrase in CONTEXT_REFERENCE_PHRASES:
        if phrase in content_lower:
            citation_indicators += 1.0

    if rag_context:
        context_text = " ".join(doc["content"] for doc in rag_context if doc.get("content")).lower()

        for pattern in CITATION_PATTERNS:
            matches = pattern.findall(content)
            for match in matches:
                match_clean = match.strip("[]()").lower()
                if any(word in context_text for word in match_clean.split() if len(word) > 3):
                    verified_citations += 1.0

        if verified_citations > 0:
            citation_indicators += verified_citations * 0.5

    word_count = len(content.split())
    citation_density = (citation_indicators / max(word_count, 1)) * 100

    if 2 <= citation_density <= 8:
        return 1.0
    if 1 <= citation_density < 2 or 8 < citation_density <= 12:
        return 0.7
    if citation_density > 0:
        return 0.4
    return 0.0


def analyze_content_source_overlap(content: str, rag_context: list[DocumentDTO]) -> dict[str, float]:
    if not rag_context:
        return {"exact_phrase_overlap": 0.0, "semantic_concept_overlap": 0.0, "unique_content_ratio": 1.0}

    source_content = " ".join([doc["content"] for doc in rag_context if doc.get("content")])

    if not source_content:
        return {"exact_phrase_overlap": 0.0, "semantic_concept_overlap": 0.0, "unique_content_ratio": 1.0}

    content_phrases = _extract_phrases(content, min_length=3, max_length=5)
    source_phrases = _extract_phrases(source_content, min_length=3, max_length=5)

    if content_phrases:
        exact_overlaps = len(content_phrases.intersection(source_phrases))
        exact_phrase_overlap = exact_overlaps / len(content_phrases)
    else:
        exact_phrase_overlap = 0.0

    content_words = {word.lower() for word in content.split() if len(word) > 4}
    source_words = {word.lower() for word in source_content.split() if len(word) > 4}

    if content_words:
        semantic_overlaps = len(content_words.intersection(source_words))
        semantic_concept_overlap = semantic_overlaps / len(content_words)
    else:
        semantic_concept_overlap = 0.0

    unique_content_ratio = 1.0 - min(exact_phrase_overlap * 0.7 + semantic_concept_overlap * 0.3, 1.0)

    return {
        "exact_phrase_overlap": exact_phrase_overlap,
        "semantic_concept_overlap": semantic_concept_overlap,
        "unique_content_ratio": unique_content_ratio,
    }


def _extract_phrases(text: str, min_length: int = 3, max_length: int = 5) -> set[str]:
    words = text.lower().split()
    phrases = set()

    for length in range(min_length, max_length + 1):
        for i in range(len(words) - length + 1):
            phrase = " ".join(words[i : i + length])
            if any(len(word) > 3 for word in phrase.split()):
                phrases.add(phrase)

    return phrases


async def evaluate_source_grounding_advanced(
    content: str, rag_context: list[DocumentDTO], section_config: GrantLongFormSection
) -> SourceGroundingMetrics:
    if not content.strip():
        return SourceGroundingMetrics(
            rouge_l_score=0.0,
            rouge_2_score=0.0,
            rouge_3_score=0.0,
            ngram_overlap_weighted=0.0,
            keyword_coverage=0.0,
            search_query_integration=0.0,
            context_citation_density=0.0,
            overall=0.0,
        )

    rouge_metrics = calculate_rouge_based_grounding(content, rag_context)

    keyword_coverage = calculate_keyword_coverage(content, section_config["keywords"])
    topic_coverage = calculate_topic_coverage(content, section_config.get("topics", []))
    search_query_integration = calculate_search_query_integration(content, section_config["search_queries"])

    context_citation_density = assess_context_citation_density(content, rag_context)

    overlap_analysis = analyze_content_source_overlap(content, rag_context)

    ngram_overlap_weighted = (
        rouge_metrics["rouge_2_score"] * 0.4
        + rouge_metrics["rouge_3_score"] * 0.4
        + overlap_analysis["semantic_concept_overlap"] * 0.2
    )

    # Adjust weights to include topic coverage
    overall = (
        rouge_metrics["rouge_l_score"] * 0.18
        + rouge_metrics["rouge_2_score"] * 0.14
        + rouge_metrics["rouge_3_score"] * 0.14
        + ngram_overlap_weighted * 0.18
        + keyword_coverage * 0.13
        + topic_coverage * 0.10
        + search_query_integration * 0.08
        + context_citation_density * 0.05
    )

    return SourceGroundingMetrics(
        rouge_l_score=rouge_metrics["rouge_l_score"],
        rouge_2_score=rouge_metrics["rouge_2_score"],
        rouge_3_score=rouge_metrics["rouge_3_score"],
        ngram_overlap_weighted=ngram_overlap_weighted,
        keyword_coverage=keyword_coverage,
        search_query_integration=search_query_integration,
        context_citation_density=context_citation_density,
        overall=overall,
    )
