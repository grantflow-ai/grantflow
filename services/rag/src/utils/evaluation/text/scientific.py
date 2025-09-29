import asyncio
from typing import Final

import textstat
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from services.rag.src.utils.evaluation.dto import ScientificAnalysis, ScientificVocabulary

BIOMEDICAL_TERMS: Final[set[str]] = {
    "protein",
    "enzyme",
    "gene",
    "dna",
    "rna",
    "cell",
    "tissue",
    "organ",
    "molecular",
    "cellular",
    "genomic",
    "proteomic",
    "metabolic",
    "biochemical",
    "pharmacological",
    "therapeutic",
    "diagnostic",
    "biomarker",
    "assay",
    "in vitro",
    "in vivo",
    "ex vivo",
    "clinical trial",
    "randomized",
    "double-blind",
    "placebo",
    "efficacy",
    "toxicity",
    "pharmacokinetics",
    "pharmacodynamics",
    "metabolism",
    "receptor",
    "ligand",
    "antibody",
    "antigen",
    "pathogen",
    "microorganism",
    "bacteria",
    "virus",
    "fungi",
    "immunology",
    "oncology",
    "cardiology",
    "neurology",
    "endocrinology",
}

METHODOLOGY_TERMS: Final[set[str]] = {
    "hypothesis",
    "methodology",
    "experimental design",
    "control group",
    "statistical analysis",
    "significance",
    "correlation",
    "regression",
    "anova",
    "t-test",
    "chi-square",
    "confidence interval",
    "p-value",
    "sample size",
    "randomization",
    "blinding",
    "stratification",
    "meta-analysis",
    "systematic review",
    "cohort study",
    "case-control",
    "cross-sectional",
    "longitudinal",
    "prospective",
    "retrospective",
    "quantitative",
    "qualitative",
    "mixed methods",
    "survey",
    "interview",
    "observation",
    "experiment",
    "quasi-experimental",
    "pilot study",
}

ACADEMIC_PHRASES: Final[set[str]] = {
    "furthermore",
    "moreover",
    "however",
    "nevertheless",
    "consequently",
    "in contrast",
    "on the other hand",
    "in addition",
    "specifically",
    "notably",
    "significantly",
    "substantially",
    "considerably",
    "therefore",
    "thus",
    "hence",
    "accordingly",
    "subsequently",
    "similarly",
    "likewise",
    "conversely",
    "alternatively",
    "nonetheless",
}

INNOVATION_KEYWORDS: Final[set[str]] = {
    "novel",
    "innovative",
    "breakthrough",
    "cutting-edge",
    "state-of-the-art",
    "unprecedented",
    "first-time",
    "pioneering",
    "revolutionary",
    "advanced",
    "new approach",
    "new method",
    "new technique",
    "new framework",
    "emerging",
    "next-generation",
    "ground-breaking",
    "paradigm shift",
    "transformative",
    "disruptive",
    "forward-thinking",
}


def create_scientific_vocabulary() -> ScientificVocabulary:
    return ScientificVocabulary(
        biomedical_terms=BIOMEDICAL_TERMS,
        methodology_terms=METHODOLOGY_TERMS,
        academic_phrases=ACADEMIC_PHRASES,
        innovation_keywords=INNOVATION_KEYWORDS,
    )


def calculate_tfidf_similarity(content: str, reference_texts: list[str]) -> list[float]:
    if not reference_texts:
        return []

    try:
        vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1, 2), stop_words="english", lowercase=True)

        all_texts = [content, *reference_texts]
        tfidf_matrix = vectorizer.fit_transform(all_texts)

        content_vector = tfidf_matrix[0:1]
        reference_vectors = tfidf_matrix[1:]

        similarities = cosine_similarity(content_vector, reference_vectors).flatten()
        return [float(sim) for sim in similarities]

    except Exception:
        return [0.0] * len(reference_texts)


def analyze_scientific_terminology(content: str, vocabulary: ScientificVocabulary) -> dict[str, float]:
    content_lower = content.lower()
    content_words = content.split()
    total_words = len(content_words)

    if total_words == 0:
        return {
            "biomedical_density": 0.0,
            "methodology_density": 0.0,
            "academic_phrase_usage": 0.0,
            "innovation_language": 0.0,
        }

    biomedical_matches = sum(1 for term in vocabulary["biomedical_terms"] if term in content_lower)
    biomedical_density = biomedical_matches / total_words * 100

    methodology_matches = sum(1 for term in vocabulary["methodology_terms"] if term in content_lower)
    methodology_density = methodology_matches / total_words * 100

    academic_matches = sum(1 for phrase in vocabulary["academic_phrases"] if phrase in content_lower)
    academic_phrase_usage = academic_matches / total_words * 100

    innovation_matches = sum(1 for keyword in vocabulary["innovation_keywords"] if keyword in content_lower)
    innovation_language = innovation_matches / total_words * 100

    return {
        "biomedical_density": biomedical_density,
        "methodology_density": methodology_density,
        "academic_phrase_usage": academic_phrase_usage,
        "innovation_language": innovation_language,
    }


def assess_methodology_completeness(content: str, vocabulary: ScientificVocabulary) -> float:
    content_lower = content.lower()
    methodology_terms = vocabulary["methodology_terms"]

    found_terms = sum(1 for term in methodology_terms if term in content_lower)
    base_completeness = found_terms / len(methodology_terms)

    methodology_headers = [
        "method",
        "approach",
        "procedure",
        "protocol",
        "design",
        "analysis",
        "statistical",
        "experimental",
        "study design",
    ]

    header_bonus = 0.2 if any(header in content_lower for header in methodology_headers) else 0.0

    return min(1.0, base_completeness + header_bonus)


def calculate_innovation_indicators(content: str, vocabulary: ScientificVocabulary) -> float:
    content_lower = content.lower()
    innovation_keywords = vocabulary["innovation_keywords"]

    innovation_score = sum(1 for keyword in innovation_keywords if keyword in content_lower)

    additional_indicators = [
        "breakthrough",
        "cutting edge",
        "state of the art",
        "unprecedented",
        "first of its kind",
        "paradigm shift",
        "transformative",
        "revolutionary",
    ]

    additional_score = sum(1 for indicator in additional_indicators if indicator in content_lower)

    total_score = innovation_score + additional_score
    return min(1.0, total_score / 8.0)


def assess_field_alignment(content: str, vocabulary: ScientificVocabulary) -> float:
    terminology_analysis = analyze_scientific_terminology(content, vocabulary)

    alignment_score = (
        terminology_analysis["biomedical_density"] * 0.4
        + terminology_analysis["methodology_density"] * 0.3
        + terminology_analysis["academic_phrase_usage"] * 0.2
        + terminology_analysis["innovation_language"] * 0.1
    )

    return min(1.0, alignment_score / 5.0)


def analyze_concept_sophistication(content: str) -> float:
    if not content.strip():
        return 0.0

    try:
        flesch_score = textstat.flesch_reading_ease(content)
        ari_score = textstat.automated_readability_index(content)

        sophistication_score = 0.0

        if 30 <= flesch_score <= 50:
            sophistication_score += 0.5
        elif flesch_score < 30:
            sophistication_score += 0.3
        else:
            sophistication_score += 0.2

        if 12 <= ari_score <= 16:
            sophistication_score += 0.5
        elif ari_score > 16:
            sophistication_score += 0.3
        else:
            sophistication_score += 0.2

        return sophistication_score

    except Exception:
        return 0.5


async def analyze_scientific_content(content: str, reference_corpus: list[str] | None = None) -> ScientificAnalysis:
    if not content.strip():
        return ScientificAnalysis(
            domain_similarity=0.0,
            methodology_completeness=0.0,
            innovation_indicators=0.0,
            field_alignment=0.0,
            concept_sophistication=0.0,
        )

    vocabulary = create_scientific_vocabulary()

    tasks = [
        asyncio.create_task(_assess_methodology_completeness_async(content, vocabulary)),
        asyncio.create_task(_calculate_innovation_indicators_async(content, vocabulary)),
        asyncio.create_task(_assess_field_alignment_async(content, vocabulary)),
        asyncio.create_task(_analyze_concept_sophistication_async(content)),
    ]

    methodology_completeness, innovation_indicators, field_alignment, concept_sophistication = await asyncio.gather(
        *tasks
    )

    domain_similarity = 0.5
    if reference_corpus:
        similarities = calculate_tfidf_similarity(content, reference_corpus)
        domain_similarity = float(max(similarities)) if similarities else 0.5

    return ScientificAnalysis(
        domain_similarity=domain_similarity,
        methodology_completeness=methodology_completeness,
        innovation_indicators=innovation_indicators,
        field_alignment=field_alignment,
        concept_sophistication=concept_sophistication,
    )


async def _assess_methodology_completeness_async(content: str, vocabulary: ScientificVocabulary) -> float:
    return assess_methodology_completeness(content, vocabulary)


async def _calculate_innovation_indicators_async(content: str, vocabulary: ScientificVocabulary) -> float:
    return calculate_innovation_indicators(content, vocabulary)


async def _assess_field_alignment_async(content: str, vocabulary: ScientificVocabulary) -> float:
    return assess_field_alignment(content, vocabulary)


async def _analyze_concept_sophistication_async(content: str) -> float:
    return analyze_concept_sophistication(content)
