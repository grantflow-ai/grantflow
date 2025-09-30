from typing import TYPE_CHECKING, Final

from services.rag.src.dto import EnrichmentData

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import EnrichmentQualityMetrics

TECHNICAL_TERM_INDICATORS: Final = frozenset(
    {
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
    }
)

RESEARCH_DEPTH_TERMS: Final = frozenset(
    {
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
    }
)

CITATION_INDICATORS: Final = ("et al", "2019", "2020", "2021", "2022", "2023", "2024")


def evaluate_enrichment_quality(
    enrichment_data: EnrichmentData,
    keywords: list[str] | None = None,
    topics: list[str] | None = None,
) -> "EnrichmentQualityMetrics":
    if not enrichment_data:
        return {
            "overall": 0.0,
            "value_added": 0.0,
            "term_relevance": 0.0,
            "question_utility": 0.0,
            "context_depth": 0.0,
            "search_query_quality": 0.0,
        }

    value_added = _evaluate_value_added(enrichment_data)

    term_relevance = _evaluate_term_relevance(enrichment_data, keywords, topics)

    question_utility = _evaluate_question_utility(enrichment_data)

    context_depth = _evaluate_context_depth(enrichment_data)

    search_query_quality = _evaluate_search_query_quality(enrichment_data, keywords, topics)

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
    if not enrichment_data:
        return 0.0

    value_score = 0.0

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


def _evaluate_term_relevance(
    enrichment_data: EnrichmentData,
    keywords: list[str] | None,
    topics: list[str] | None,
) -> float:
    terms = enrichment_data.get("technical_terms", [])

    if not terms:
        return 0.0

    relevance_score = 0.0

    valid_terms = 0
    for term in terms:
        if not isinstance(term, str):
            continue

        if 3 <= len(term) <= 50:
            valid_terms += 1

        if any(indicator in term.lower() for indicator in TECHNICAL_TERM_INDICATORS):
            relevance_score += 0.1

    if terms:
        validity_ratio = valid_terms / len(terms)
        relevance_score += validity_ratio * 0.5

    if keywords or topics:
        all_reference_terms = []
        if keywords:
            all_reference_terms.extend(keywords)
        if topics:
            all_reference_terms.extend(topics)

        aligned_terms = 0
        for term in terms:
            for ref_term in all_reference_terms:
                if ref_term.lower() in str(term).lower() or str(term).lower() in ref_term.lower():
                    aligned_terms += 1
                    break

        if aligned_terms > 0:
            alignment_bonus = min(0.25, aligned_terms / max(len(terms), 1) * 0.5)
            relevance_score = min(1.0, relevance_score + alignment_bonus)

    return min(1.0, relevance_score)


def _evaluate_question_utility(enrichment_data: EnrichmentData) -> float:
    questions = enrichment_data.get("research_questions", [])

    if not questions:
        return 0.0

    utility_score = 0.0

    good_starters = ["how", "what", "why", "when", "where", "which", "does", "can", "will", "is there", "are there"]

    valid_questions = 0
    for question in questions:
        if isinstance(question, str):
            if question.strip().endswith("?"):
                valid_questions += 1
                utility_score += 0.1

            question_lower = question.lower().strip()
            if any(question_lower.startswith(starter) for starter in good_starters):
                utility_score += 0.1

            if 20 <= len(question) <= 200:
                utility_score += 0.05

    if questions:
        validity_ratio = valid_questions / len(questions)
        utility_score += validity_ratio * 0.3

    return min(1.0, utility_score)


def _evaluate_context_depth(enrichment_data: EnrichmentData) -> float:
    context = enrichment_data.get("context", "")

    if not context:
        return 0.0

    context_str = str(context)
    depth_score = 0.0

    if len(context_str) >= 500:
        depth_score += 0.3
    elif len(context_str) >= 200:
        depth_score += 0.2
    elif len(context_str) >= 100:
        depth_score += 0.1

    paragraphs = context_str.split("\n\n")
    if len(paragraphs) >= 3:
        depth_score += 0.2

    term_count = sum(1 for term in RESEARCH_DEPTH_TERMS if term in context_str.lower())
    if term_count >= 5:
        depth_score += 0.3
    elif term_count >= 3:
        depth_score += 0.2

    if any(indicator in context_str for indicator in CITATION_INDICATORS):
        depth_score += 0.2

    return min(1.0, depth_score)


def _evaluate_search_query_quality(
    enrichment_data: EnrichmentData,
    keywords: list[str] | None,
    topics: list[str] | None,
) -> float:
    queries = enrichment_data.get("search_queries", [])

    if not queries:
        return 0.0

    quality_score = 0.0

    for query in queries:
        if isinstance(query, str):
            if 10 <= len(query) <= 100:
                quality_score += 0.2

            if len(query.split()) >= 3:
                quality_score += 0.2

            if any(char in query for char in ['"', "AND", "OR", "+"]):
                quality_score += 0.1

    if len(queries) > 1:
        unique_queries = len(set(queries))
        diversity_ratio = unique_queries / len(queries)
        quality_score += diversity_ratio * 0.3

    if keywords or topics:
        all_reference_terms = []
        if keywords:
            all_reference_terms.extend(keywords)
        if topics:
            all_reference_terms.extend(topics)

        aligned_queries = 0
        for query in queries:
            for ref_term in all_reference_terms:
                if ref_term.lower() in query.lower():
                    aligned_queries += 1
                    break

        if aligned_queries > 0:
            alignment_bonus = min(0.2, aligned_queries / max(len(queries), 1) * 0.4)
            quality_score += alignment_bonus

    return min(1.0, quality_score / len(queries)) if queries else 0.0


def check_enrichment_completeness(enrichment_data: EnrichmentData) -> dict[str, bool]:
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
