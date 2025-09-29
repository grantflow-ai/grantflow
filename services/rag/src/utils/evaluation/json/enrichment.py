"""Evaluation functions for objective enrichment quality."""

from typing import TYPE_CHECKING

from services.rag.src.dto import EnrichmentData

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import EnrichmentQualityMetrics


def evaluate_enrichment_quality(enrichment_data: EnrichmentData) -> "EnrichmentQualityMetrics":
    """Evaluate the quality of objective enrichment data.

    Args:
        enrichment_data: Enrichment data containing terms, questions, context, etc.

    Returns:
        Quality metrics for the enrichment
    """
    if not enrichment_data:
        return {
            "overall": 0.0,
            "value_added": 0.0,
            "term_relevance": 0.0,
            "question_utility": 0.0,
            "context_depth": 0.0,
            "search_query_quality": 0.0,
        }

    # Evaluate value added by enrichment
    value_added = _evaluate_value_added(enrichment_data)

    # Evaluate term relevance
    term_relevance = _evaluate_term_relevance(enrichment_data)

    # Evaluate question utility
    question_utility = _evaluate_question_utility(enrichment_data)

    # Evaluate context depth
    context_depth = _evaluate_context_depth(enrichment_data)

    # Evaluate search query quality
    search_query_quality = _evaluate_search_query_quality(enrichment_data)

    # Calculate overall score
    overall = (
        value_added * 0.25
        + term_relevance * 0.20
        + question_utility * 0.20
        + context_depth * 0.20
        + search_query_quality * 0.15
    )

    return {
        "overall": overall,
        "value_added": value_added,
        "term_relevance": term_relevance,
        "question_utility": question_utility,
        "context_depth": context_depth,
        "search_query_quality": search_query_quality,
    }


def _evaluate_value_added(enrichment_data: EnrichmentData) -> float:
    """Evaluate how much value the enrichment adds."""
    if not enrichment_data:
        return 0.0

    value_score = 0.0

    # Check if key enrichment fields are present and non-empty
    if enrichment_data.get("technical_terms"):
        terms = enrichment_data["technical_terms"]
        if isinstance(terms, list) and len(terms) >= 3:
            value_score += 0.25

    if enrichment_data.get("research_questions"):
        questions = enrichment_data["research_questions"]
        if isinstance(questions, list) and len(questions) >= 2:
            value_score += 0.25

    if enrichment_data.get("context") and len(str(enrichment_data["context"])) > 100:
        value_score += 0.25

    if enrichment_data.get("search_queries"):
        queries = enrichment_data["search_queries"]
        if isinstance(queries, list) and len(queries) >= 2:
            value_score += 0.25

    return min(1.0, value_score)


def _evaluate_term_relevance(enrichment_data: EnrichmentData) -> float:
    """Evaluate relevance of technical terms."""
    terms = enrichment_data.get("technical_terms", [])

    if not terms:
        return 0.0

    relevance_score = 0.0

    # Check term quality
    valid_terms = 0
    for term in terms:
        if isinstance(term, str):
            # Term should be meaningful length
            if 3 <= len(term) <= 50:
                valid_terms += 1

            # Check for scientific/technical indicators
            technical_indicators = [
                "-",
                "protein",
                "gene",
                "cell",
                "acid",
                "enzyme",
                "receptor",
                "pathway",
                "analysis",
                "method",
                "system",
            ]
            if any(indicator in term.lower() for indicator in technical_indicators):
                relevance_score += 0.1

    # Calculate term validity ratio
    if terms:
        validity_ratio = valid_terms / len(terms)
        relevance_score += validity_ratio * 0.5

    return min(1.0, relevance_score)


def _evaluate_question_utility(enrichment_data: EnrichmentData) -> float:
    """Evaluate utility of research questions."""
    questions = enrichment_data.get("research_questions", [])

    if not questions:
        return 0.0

    utility_score = 0.0

    # Question starters that indicate good research questions
    good_starters = ["how", "what", "why", "when", "where", "which", "does", "can", "will", "is there", "are there"]

    valid_questions = 0
    for question in questions:
        if isinstance(question, str):
            # Should end with question mark
            if question.strip().endswith("?"):
                valid_questions += 1
                utility_score += 0.1

            # Should start with question word
            question_lower = question.lower().strip()
            if any(question_lower.startswith(starter) for starter in good_starters):
                utility_score += 0.1

            # Should be reasonable length
            if 20 <= len(question) <= 200:
                utility_score += 0.05

    # Calculate validity ratio
    if questions:
        validity_ratio = valid_questions / len(questions)
        utility_score += validity_ratio * 0.3

    return min(1.0, utility_score)


def _evaluate_context_depth(enrichment_data: EnrichmentData) -> float:
    """Evaluate depth of contextual information."""
    context = enrichment_data.get("context", "")

    if not context:
        return 0.0

    context_str = str(context)
    depth_score = 0.0

    # Check context length
    if len(context_str) >= 500:
        depth_score += 0.3
    elif len(context_str) >= 200:
        depth_score += 0.2
    elif len(context_str) >= 100:
        depth_score += 0.1

    # Check for structured information (paragraphs)
    paragraphs = context_str.split("\n\n")
    if len(paragraphs) >= 3:
        depth_score += 0.2

    # Check for scientific/technical content
    technical_terms = [
        "research",
        "study",
        "analysis",
        "method",
        "results",
        "hypothesis",
        "experiment",
        "data",
        "evidence",
        "findings",
    ]
    term_count = sum(1 for term in technical_terms if term in context_str.lower())
    if term_count >= 5:
        depth_score += 0.3
    elif term_count >= 3:
        depth_score += 0.2

    # Check for citations or references
    if any(indicator in context_str for indicator in ["et al", "2019", "2020", "2021", "2022", "2023", "2024"]):
        depth_score += 0.2

    return min(1.0, depth_score)


def _evaluate_search_query_quality(enrichment_data: EnrichmentData) -> float:
    """Evaluate quality of search queries."""
    queries = enrichment_data.get("search_queries", [])

    if not queries:
        return 0.0

    quality_score = 0.0

    for query in queries:
        if isinstance(query, str):
            # Query should be meaningful length
            if 10 <= len(query) <= 100:
                quality_score += 0.2

            # Should contain multiple terms (not just single word)
            if len(query.split()) >= 3:
                quality_score += 0.2

            # Should contain technical/specific terms
            if any(char in query for char in ['"', "AND", "OR", "+"]):
                quality_score += 0.1

    # Diversity check - queries should be different
    if len(queries) > 1:
        unique_queries = len(set(queries))
        diversity_ratio = unique_queries / len(queries)
        quality_score += diversity_ratio * 0.3

    return min(1.0, quality_score / len(queries)) if queries else 0.0


def check_enrichment_completeness(enrichment_data: EnrichmentData) -> dict[str, bool]:
    """Check completeness of enrichment data.

    Returns:
        Dictionary of completeness checks
    """
    has_terms = bool(enrichment_data.get("technical_terms"))
    has_questions = bool(enrichment_data.get("research_questions"))
    has_context = bool(enrichment_data.get("context"))
    has_queries = bool(enrichment_data.get("search_queries"))

    min_terms = False
    min_questions = False

    if has_terms:
        terms = enrichment_data["technical_terms"]
        min_terms = isinstance(terms, list) and len(terms) >= 3

    if has_questions:
        questions = enrichment_data["research_questions"]
        min_questions = isinstance(questions, list) and len(questions) >= 2

    return {
        "has_enrichment": bool(enrichment_data),
        "has_technical_terms": has_terms,
        "has_research_questions": has_questions,
        "has_context": has_context,
        "has_search_queries": has_queries,
        "minimum_terms": min_terms,
        "minimum_questions": min_questions,
    }
