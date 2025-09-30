import re
from typing import Final

from packages.db.src.json_objects import GrantLongFormSection
from packages.shared_utils.src.nlp import get_spacy_model

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.dto import QualityMetrics, ScientificVocabulary
from services.rag.src.utils.evaluation.text.scientific import create_scientific_vocabulary

PASSIVE_VOICE_PATTERNS: Final[list[re.Pattern[str]]] = [
    re.compile(r"\b(was|were|is|are|been)\s+\w+ed\b", re.IGNORECASE),
    re.compile(r"\b(was|were|is|are|been)\s+\w+en\b", re.IGNORECASE),
]

MEASUREMENT_PATTERNS: Final[list[re.Pattern[str]]] = [
    re.compile(r"\d+\s*(?:mg|kg|ml|cm|mm|nm|μm|°C|°F|Hz|kHz|MHz|GHz)"),
    re.compile(r"\d+\.\d+\s*(?:mg|kg|ml|cm|mm|nm|μm|°C|°F|Hz|kHz|MHz|GHz)"),
    re.compile(r"\d+\s*(?:hours?|days?|weeks?|months?|years?)"),
    re.compile(r"\d+\s*(?:subjects?|patients?|participants?|samples?)"),
]

TECHNICAL_PRECISION_TERMS: Final = frozenset(
    {
        "protocol",
        "methodology",
        "algorithm",
        "framework",
        "parameter",
        "coefficient",
        "variable",
        "threshold",
        "baseline",
        "endpoint",
    }
)

VAGUE_TERMS: Final = frozenset(
    {
        "very",
        "really",
        "quite",
        "rather",
        "somewhat",
        "many",
        "several",
        "various",
        "different",
        "some",
        "thing",
        "stuff",
        "good",
        "bad",
    }
)

HYPOTHESIS_INDICATORS: Final = frozenset(
    {
        "hypothesis",
        "hypothesize",
        "predict",
        "expect",
        "anticipate",
        "propose",
        "suggest that",
        "we predict",
        "we hypothesize",
    }
)

TESTING_METHODOLOGY_TERMS: Final = frozenset(
    {
        "test",
        "measure",
        "analyze",
        "assess",
        "evaluate",
        "examine",
        "statistical analysis",
        "experimental design",
        "data collection",
    }
)

HEDGING_LANGUAGE: Final[set[str]] = {
    "appears",
    "seems",
    "suggests",
    "indicates",
    "may",
    "might",
    "could",
    "would",
    "should",
    "potentially",
    "possibly",
    "likely",
    "presumably",
    "apparently",
    "evidently",
    "arguably",
    "probably",
    "conceivably",
}

ACADEMIC_CONNECTORS: Final[set[str]] = {
    "furthermore",
    "moreover",
    "however",
    "nevertheless",
    "therefore",
    "consequently",
    "specifically",
    "particularly",
    "notably",
    "significantly",
    "in contrast",
    "on the other hand",
    "in addition",
    "for instance",
}

METHODOLOGY_VERBS: Final[set[str]] = {
    "analyze",
    "assess",
    "evaluate",
    "examine",
    "investigate",
    "measure",
    "compare",
    "determine",
    "identify",
    "quantify",
    "characterize",
    "validate",
    "verify",
    "test",
    "observe",
    "monitor",
    "record",
}

EVIDENCE_INDICATORS: Final[set[str]] = {
    "data show",
    "results indicate",
    "findings suggest",
    "evidence demonstrates",
    "studies reveal",
    "research confirms",
    "analysis shows",
    "observations indicate",
    "experiments demonstrate",
    "measurements confirm",
    "trials show",
}


def augment_vocabulary(
    vocabulary: ScientificVocabulary,
    keywords: list[str],
    topics: list[str],
) -> ScientificVocabulary:
    enhanced = ScientificVocabulary(
        biomedical_terms=vocabulary["biomedical_terms"].copy(),
        methodology_terms=vocabulary["methodology_terms"].copy(),
        academic_phrases=vocabulary["academic_phrases"].copy(),
        innovation_keywords=vocabulary["innovation_keywords"].copy(),
    )

    for keyword in keywords:
        keyword_lower = keyword.lower()
        if any(term in keyword_lower for term in ["method", "approach", "technique", "analysis", "design"]):
            enhanced["methodology_terms"].add(keyword_lower)
        elif any(term in keyword_lower for term in ["novel", "innovative", "breakthrough", "pioneering"]):
            enhanced["innovation_keywords"].add(keyword_lower)
        else:
            enhanced["biomedical_terms"].add(keyword_lower)

    for topic in topics:
        enhanced["biomedical_terms"].add(topic.lower())

    return enhanced


def calculate_keyword_density(content: str, keywords: list[str]) -> float:
    if not keywords:
        return 1.0

    content_lower = content.lower()
    words_in_content = content_lower.split()
    total_words = len(words_in_content)

    if total_words == 0:
        return 0.0

    keyword_count = 0
    for keyword in keywords:
        keyword_lower = keyword.lower()
        if " " in keyword_lower:
            keyword_count += content_lower.count(keyword_lower)
        else:
            keyword_count += words_in_content.count(keyword_lower)

    density = keyword_count / total_words
    return min(1.0, density / 0.03)


def calculate_scientific_term_density(content: str, vocabulary: ScientificVocabulary) -> float:
    if not content.strip():
        return 0.0

    content_lower = content.lower()
    words = content.split()
    total_words = len(words)

    if total_words == 0:
        return 0.0

    scientific_term_count = 0

    for term_set in [vocabulary["biomedical_terms"], vocabulary["methodology_terms"], vocabulary["academic_phrases"]]:
        for term in term_set:
            if term in content_lower:
                scientific_term_count += 1

    density = scientific_term_count / total_words * 100

    if 5 <= density <= 15:
        return 1.0
    if 3 <= density < 5 or 15 < density <= 20:
        return 0.7
    if density > 0:
        return 0.4
    return 0.0


def assess_academic_register(content: str) -> float:
    if not content.strip():
        return 0.0

    nlp = get_spacy_model()
    doc = nlp(content)

    total_sentences = len(list(doc.sents))
    if total_sentences == 0:
        return 0.0

    register_score = 0.0

    passive_voice_count = 0
    for pattern in PASSIVE_VOICE_PATTERNS:
        passive_voice_count += len(pattern.findall(content))

    passive_ratio = passive_voice_count / total_sentences
    if 0.2 <= passive_ratio <= 0.6:
        register_score += 0.25
    elif 0.1 <= passive_ratio < 0.2 or 0.6 < passive_ratio <= 0.8:
        register_score += 0.15

    content_lower = content.lower()
    hedging_count = sum(1 for hedge in HEDGING_LANGUAGE if hedge in content_lower)
    hedging_ratio = hedging_count / total_sentences

    if 0.1 <= hedging_ratio <= 0.4:
        register_score += 0.25
    elif hedging_ratio <= 0.6:
        register_score += 0.15

    connector_count = sum(1 for connector in ACADEMIC_CONNECTORS if connector in content_lower)
    connector_ratio = connector_count / total_sentences

    if 0.05 <= connector_ratio <= 0.3:
        register_score += 0.25
    elif connector_ratio <= 0.4:
        register_score += 0.15

    total_tokens = len([token for token in doc if token.is_alpha])
    avg_sentence_length = total_tokens / total_sentences

    if 15 <= avg_sentence_length <= 25:
        register_score += 0.25
    elif 12 <= avg_sentence_length < 15 or 25 < avg_sentence_length <= 30:
        register_score += 0.15

    return register_score


def detect_methodology_language(content: str) -> float:
    if not content.strip():
        return 0.0

    content_lower = content.lower()
    methodology_score = 0.0

    methodology_verb_count = sum(1 for verb in METHODOLOGY_VERBS if verb in content_lower)
    if methodology_verb_count >= 5:
        methodology_score += 0.3
    elif methodology_verb_count >= 3:
        methodology_score += 0.2
    elif methodology_verb_count >= 1:
        methodology_score += 0.1

    quantitative_patterns = [
        r"\d+%",
        r"\d+\.\d+",
        r"significant",
        r"correlation",
        r"p-value",
        r"confidence",
        r"statistical",
        r"sample size",
        r"standard deviation",
        r"mean",
        r"median",
    ]

    quantitative_count = 0
    for pattern in quantitative_patterns:
        quantitative_count += len(re.findall(pattern, content_lower))

    if quantitative_count >= 5:
        methodology_score += 0.3
    elif quantitative_count >= 3:
        methodology_score += 0.2
    elif quantitative_count >= 1:
        methodology_score += 0.1

    experimental_terms = [
        "control group",
        "experimental group",
        "randomized",
        "blind",
        "protocol",
        "procedure",
        "experimental design",
        "methodology",
        "approach",
        "framework",
    ]

    experimental_count = sum(1 for term in experimental_terms if term in content_lower)
    if experimental_count >= 3:
        methodology_score += 0.4
    elif experimental_count >= 2:
        methodology_score += 0.3
    elif experimental_count >= 1:
        methodology_score += 0.2

    return min(1.0, methodology_score)


def analyze_evidence_based_claims(content: str, rag_context: list[DocumentDTO]) -> float:
    if not content.strip():
        return 0.0

    nlp = get_spacy_model()
    doc = nlp(content)

    sentences = list(doc.sents)
    if not sentences:
        return 0.0

    evidence_based_count = 0
    content_lower = content.lower()

    for indicator in EVIDENCE_INDICATORS:
        if indicator in content_lower:
            evidence_based_count += 1

    citation_patterns = [
        r"\[[^\]]+\]",
        r"\([^)]*\d{4}[^)]*\)",
        r"according to",
        r"as reported by",
        r"studies show",
        r"research indicates",
    ]

    for pattern in citation_patterns:
        evidence_based_count += len(re.findall(pattern, content_lower, re.IGNORECASE))

    if rag_context:
        context_text = " ".join(doc["content"] for doc in rag_context if doc.get("content")).lower()
        content_words = set(content_lower.split())
        context_words = set(context_text.split())

        overlap_ratio = len(content_words.intersection(context_words)) / max(len(content_words), 1)
        if overlap_ratio > 0.3:
            evidence_based_count += 2

    evidence_ratio = evidence_based_count / len(sentences)

    if 0.3 <= evidence_ratio <= 0.7:
        return 1.0
    if 0.2 <= evidence_ratio < 0.3 or 0.7 < evidence_ratio <= 0.8:
        return 0.7
    if evidence_ratio > 0:
        return 0.4
    return 0.0


def assess_technical_precision(content: str) -> float:
    if not content.strip():
        return 0.0

    precision_score = 0.0

    measurement_count = sum(len(pattern.findall(content)) for pattern in MEASUREMENT_PATTERNS)

    if measurement_count >= 5:
        precision_score += 0.3
    elif measurement_count >= 3:
        precision_score += 0.2
    elif measurement_count >= 1:
        precision_score += 0.1

    content_lower = content.lower()
    technical_count = sum(1 for term in TECHNICAL_PRECISION_TERMS if term in content_lower)
    if technical_count >= 5:
        precision_score += 0.3
    elif technical_count >= 3:
        precision_score += 0.2
    elif technical_count >= 1:
        precision_score += 0.1

    content_words = content_lower.split()
    vague_count = sum(1 for word in content_words if word in VAGUE_TERMS)
    vague_ratio = vague_count / max(len(content_words), 1)

    if vague_ratio <= 0.02:
        precision_score += 0.4
    elif vague_ratio <= 0.05:
        precision_score += 0.3
    elif vague_ratio <= 0.1:
        precision_score += 0.2

    return min(1.0, precision_score)


def assess_hypothesis_methodology_alignment(content: str) -> float:
    content_lower = content.lower()

    has_hypothesis = any(indicator in content_lower for indicator in HYPOTHESIS_INDICATORS)

    if not has_hypothesis:
        return 0.5

    methodology_count = sum(1 for method in TESTING_METHODOLOGY_TERMS if method in content_lower)

    if methodology_count >= 5:
        return 1.0
    if methodology_count >= 3:
        return 0.8
    if methodology_count >= 1:
        return 0.6
    return 0.3


async def evaluate_scientific_quality(
    content: str, rag_context: list[DocumentDTO], section_config: GrantLongFormSection
) -> QualityMetrics:
    if not content.strip():
        return QualityMetrics(
            term_density=0.0,
            domain_vocabulary_accuracy=0.0,
            methodology_language_score=0.0,
            academic_register_score=0.0,
            technical_precision=0.0,
            evidence_based_claims_ratio=0.0,
            hypothesis_methodology_alignment=0.0,
            overall=0.0,
        )

    base_vocabulary = create_scientific_vocabulary()
    vocabulary = augment_vocabulary(
        base_vocabulary,
        section_config.get("keywords", []),
        section_config.get("topics", []),
    )

    keyword_density = calculate_keyword_density(content, section_config.get("keywords", []))

    term_density = calculate_scientific_term_density(content, vocabulary)
    domain_vocabulary_accuracy = (term_density * 0.7) + (keyword_density * 0.3)
    methodology_language_score = detect_methodology_language(content)
    academic_register_score = assess_academic_register(content)
    technical_precision = assess_technical_precision(content)
    evidence_based_claims_ratio = analyze_evidence_based_claims(content, rag_context)
    hypothesis_methodology_alignment = assess_hypothesis_methodology_alignment(content)

    section_weight_adjustments = {
        "methodology_language_score": 0.20,
        "technical_precision": 0.15,
        "evidence_based_claims_ratio": 0.10,
    }

    if section_config["is_detailed_research_plan"]:
        section_weight_adjustments["methodology_language_score"] = 0.30
        section_weight_adjustments["technical_precision"] = 0.20
        section_weight_adjustments["evidence_based_claims_ratio"] = 0.05

    if section_config["is_clinical_trial"]:
        section_weight_adjustments["evidence_based_claims_ratio"] = 0.20
        section_weight_adjustments["technical_precision"] = 0.25
        section_weight_adjustments["methodology_language_score"] = 0.15

    overall = (
        term_density * 0.15
        + domain_vocabulary_accuracy * 0.15
        + methodology_language_score * section_weight_adjustments["methodology_language_score"]
        + academic_register_score * 0.20
        + technical_precision * section_weight_adjustments["technical_precision"]
        + evidence_based_claims_ratio * section_weight_adjustments["evidence_based_claims_ratio"]
        + hypothesis_methodology_alignment * 0.05
    )

    return QualityMetrics(
        term_density=term_density,
        domain_vocabulary_accuracy=domain_vocabulary_accuracy,
        methodology_language_score=methodology_language_score,
        academic_register_score=academic_register_score,
        technical_precision=technical_precision,
        evidence_based_claims_ratio=evidence_based_claims_ratio,
        hypothesis_methodology_alignment=hypothesis_methodology_alignment,
        overall=overall,
    )
