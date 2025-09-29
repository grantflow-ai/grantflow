from typing import TYPE_CHECKING

import pytest

from services.rag.src.utils.evaluation.text.coherence import (
    analyze_paragraph_unity,
    analyze_sentence_transitions,
    assess_argument_flow_consistency,
    calculate_lexical_diversity,
    calculate_repetition_penalty,
    evaluate_coherence,
)

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import CoherenceMetrics


def test_analyze_sentence_transitions_with_good_transitions() -> None:
    sentences: list[str] = [
        "The research will focus on biomarkers.",
        "Furthermore, we will analyze protein expression.",
        "However, the methodology requires validation.",
        "Therefore, we propose a systematic approach.",
    ]
    score: float = analyze_sentence_transitions(sentences)
    assert score >= 0.4, f"Expected good transition score, got {score}"


def test_analyze_sentence_transitions_with_poor_transitions() -> None:
    sentences: list[str] = [
        "The research will focus on biomarkers.",
        "Proteins are important for cells.",
        "Blue is a color.",
        "The methodology requires validation.",
    ]
    score: float = analyze_sentence_transitions(sentences)
    assert score < 0.4, f"Expected low transition score, got {score}"


def test_analyze_sentence_transitions_single_sentence() -> None:
    sentences: list[str] = ["The research will focus on biomarkers."]
    score: float = analyze_sentence_transitions(sentences)
    assert score == 1.0, f"Single sentence should score 1.0, got {score}"


def test_analyze_sentence_transitions_empty_list() -> None:
    sentences: list[str] = []
    score: float = analyze_sentence_transitions(sentences)
    assert score == 1.0, f"Empty list should score 1.0, got {score}"


def test_calculate_lexical_diversity_varied_vocabulary() -> None:
    content: str = """
    The innovative research methodology employs sophisticated statistical analysis
    to examine complex biomarker patterns. This comprehensive approach utilizes
    advanced computational techniques for investigating molecular mechanisms.
    """
    score: float = calculate_lexical_diversity(content)
    assert score >= 0.2, f"Expected reasonable diversity score, got {score}"


def test_calculate_lexical_diversity_repetitive_content() -> None:
    content: str = """
    The research research research methodology methodology methodology employs
    sophisticated sophisticated sophisticated analysis analysis analysis to
    examine examine examine biomarker biomarker biomarker patterns patterns.
    """
    score: float = calculate_lexical_diversity(content)
    assert score <= 0.8, f"Expected diversity score affected by repetition, got {score}"


def test_calculate_lexical_diversity_empty_content() -> None:
    score: float = calculate_lexical_diversity("")
    assert score == 0.0, f"Empty content should score 0.0, got {score}"


def test_calculate_lexical_diversity_short_content() -> None:
    content: str = "Short text here"
    score: float = calculate_lexical_diversity(content)
    assert score == 0.5, f"Short content should score 0.5, got {score}"


def test_assess_argument_flow_with_good_progression() -> None:
    content: str = """
    First, we will establish the theoretical framework for biomarker research.
    Second, the methodology will involve systematic protein analysis.
    Subsequently, we will validate findings through clinical trials.
    Finally, the results will be integrated into diagnostic protocols.
    """
    score: float = assess_argument_flow_consistency(content)
    assert score > 0.4, f"Expected good flow score, got {score}"


def test_assess_argument_flow_with_contradictions() -> None:
    content: str = """
    The biomarker is not effective for diagnosis.
    The biomarker is highly effective for diagnosis.
    This method cannot work in clinical settings.
    This method can work perfectly in all settings.
    """
    score: float = assess_argument_flow_consistency(content)
    assert score < 0.5, f"Expected low flow score due to contradictions, got {score}"


def test_assess_argument_flow_empty_content() -> None:
    score: float = assess_argument_flow_consistency("")
    assert score == 0.0, f"Empty content should score 0.0, got {score}"


def test_analyze_paragraph_unity_cohesive_paragraphs() -> None:
    content: str = """
    Biomarker research represents a critical advancement in diagnostic medicine.
    These molecular indicators provide essential information about disease states.
    The biomarker approach enables early detection and monitoring capabilities.

    Computational analysis of biomarker data requires sophisticated algorithms.
    Machine learning techniques enhance pattern recognition in complex datasets.
    Advanced computational methods improve diagnostic accuracy significantly.
    """
    score: float = analyze_paragraph_unity(content)
    assert score >= 0.2, f"Expected reasonable unity score, got {score}"


def test_analyze_paragraph_unity_fragmented_paragraphs() -> None:
    content: str = """
    Biomarker research is important.
    The weather today is sunny.
    Programming languages vary greatly.

    Cars need gasoline to function.
    Mathematics involves numbers and equations.
    Cooking requires ingredients and recipes.
    """
    score: float = analyze_paragraph_unity(content)
    assert score < 0.3, f"Expected low unity score, got {score}"


@pytest.mark.asyncio
async def test_calculate_repetition_penalty_unique_sentences() -> None:
    content: str = """
    The research methodology involves systematic analysis of biomarkers.
    Advanced computational techniques enable pattern recognition in data.
    Clinical validation ensures reliability of diagnostic protocols.
    """
    score: float = await calculate_repetition_penalty(content)
    assert score > 0.6, f"Expected good penalty score for unique content, got {score}"


@pytest.mark.asyncio
async def test_calculate_repetition_penalty_repeated_sentences() -> None:
    content: str = """
    The research methodology involves analysis.
    The research methodology involves analysis.
    The research methodology involves analysis.
    """
    score: float = await calculate_repetition_penalty(content)
    assert score < 0.6, f"Expected low penalty score for repeated content, got {score}"


@pytest.mark.asyncio
async def test_calculate_repetition_penalty_empty_content() -> None:
    score: float = await calculate_repetition_penalty("")
    assert score == 1.0, f"Empty content should score 1.0, got {score}"


@pytest.mark.asyncio
async def test_evaluate_coherence_high_quality() -> None:
    content: str = """
    # Research Methodology

    ## Biomarker Analysis Framework

    First, we establish a comprehensive theoretical foundation for biomarker research.
    This approach involves systematic analysis of molecular indicators in diagnostic contexts.
    Furthermore, the methodology integrates advanced computational techniques with clinical validation.

    Subsequently, we implement rigorous statistical analysis protocols.
    The validation process ensures reliability through multiple independent assessments.
    Therefore, our findings demonstrate significant improvements in diagnostic accuracy.

    ## Clinical Applications

    The proposed biomarker panel enables early disease detection capabilities.
    Moreover, this diagnostic approach provides quantitative measurements of disease progression.
    Clinical trials confirm the effectiveness of our methodology in diverse patient populations.
    """

    result: CoherenceMetrics = await evaluate_coherence(content)

    assert result["overall"] > 0.3, f"Expected reasonable overall coherence, got {result['overall']}"
    assert result["local_coherence"] >= 0.2, f"Expected decent local coherence, got {result['local_coherence']}"
    assert result["global_coherence"] >= 0.2, f"Expected decent global coherence, got {result['global_coherence']}"
    assert 0.0 <= result["lexical_diversity"] <= 1.0
    assert 0.0 <= result["sentence_transition_quality"] <= 1.0
    assert 0.0 <= result["argument_flow_consistency"] <= 1.0
    assert 0.0 <= result["paragraph_unity"] <= 1.0
    assert 0.0 <= result["repetition_penalty"] <= 1.0


@pytest.mark.asyncio
async def test_evaluate_coherence_poor_quality() -> None:
    content: str = """
    Bad writing here. No connections. Random sentences.
    The biomarker is good. Also bad. Maybe works.
    Random thoughts about stuff. Nothing makes sense.
    Repetitive text here. Repetitive text here. Repetitive text here.
    """

    result: CoherenceMetrics = await evaluate_coherence(content)

    assert result["overall"] <= 0.6, f"Expected low overall coherence, got {result['overall']}"
    assert 0.0 <= result["local_coherence"] <= 1.0
    assert 0.0 <= result["global_coherence"] <= 1.0
    assert 0.0 <= result["lexical_diversity"] <= 1.0
    assert 0.0 <= result["sentence_transition_quality"] <= 1.0
    assert 0.0 <= result["argument_flow_consistency"] <= 1.0
    assert 0.0 <= result["paragraph_unity"] <= 1.0
    assert 0.0 <= result["overall"] <= 1.0


@pytest.mark.asyncio
async def test_evaluate_coherence_empty_content() -> None:
    result: CoherenceMetrics = await evaluate_coherence("")

    assert result["overall"] == 0.0, f"Expected zero score for empty content, got {result['overall']}"
    assert result["local_coherence"] == 0.0
    assert result["global_coherence"] == 0.0
    assert result["lexical_diversity"] == 0.0
    assert result["sentence_transition_quality"] == 0.0
    assert result["argument_flow_consistency"] == 0.0
    assert result["paragraph_unity"] == 0.0
    assert result["repetition_penalty"] == 1.0
