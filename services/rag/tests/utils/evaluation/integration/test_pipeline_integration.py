from typing import TYPE_CHECKING

import pytest
from packages.db.src.json_objects import GrantLongFormSection

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import FastEvaluationResult


@pytest.mark.asyncio
async def test_evaluate_scientific_content_complete_workflow() -> None:
    content: str = """
    # Research Methodology

    ## Biomarker Analysis Framework

    This research employs systematic analysis of protein biomarkers using standardized protocols.
    The methodology involves rigorous statistical analysis with p-values < 0.05 significance threshold.
    Experimental design includes randomized control groups and blinded assessment procedures.

    We hypothesize that biomarker expression correlates with disease progression markers.
    To test this hypothesis, we will measure protein concentrations using mass spectrometry.
    Statistical analysis will determine correlation coefficients and clinical significance.

    According to previous studies [1], this approach demonstrates reliable and reproducible results.
    Data show significant correlation between molecular indicators and diagnostic outcomes.
    Furthermore, the methodology enables early detection capabilities in clinical settings.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(
            content="Standardized protocols for biomarker analysis demonstrate reliable results in clinical validation studies"
        ),
        DocumentDTO(
            content="Mass spectrometry provides accurate protein concentration measurements with high precision"
        ),
        DocumentDTO(content="Statistical analysis with p-value thresholds ensures reproducible research outcomes"),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="methodology",
        title="Research Methodology",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Describe research methodology with statistical rigor",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "methodology", "analysis", "statistical"],
        max_words=500,
        search_queries=["biomarker analysis", "research methodology", "statistical analysis"],
        topics=["research methods", "biomarker analysis"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_trace_001",
    )

    assert isinstance(result, dict)
    assert "overall_score" in result
    assert "structural_metrics" in result
    assert "source_grounding_metrics" in result
    assert "scientific_quality_metrics" in result
    assert "coherence_metrics" in result

    assert 0.0 <= result["overall_score"] <= 100.0

    assert result["overall_score"] > 20.0, (
        f"Expected reasonable score for quality content, got {result['overall_score']}"
    )


@pytest.mark.asyncio
async def test_evaluate_scientific_content_clinical_trial_weighting() -> None:
    content: str = """
    # Clinical Trial Results

    The randomized controlled trial (n=200) demonstrated significant efficacy of the biomarker panel.
    Primary endpoint: 85% sensitivity and 92% specificity in diagnostic accuracy (p < 0.001).
    Secondary endpoints showed improved patient outcomes with 30% reduction in false positives.

    Statistical analysis employed intention-to-treat principles with 95% confidence intervals.
    Safety profile: No serious adverse events related to the diagnostic procedure were observed.
    The trial protocol was approved by the institutional review board (IRB-2023-001).

    Evidence indicates strong correlation between biomarker levels and disease progression.
    Clinical validation confirms diagnostic utility across diverse patient populations.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Clinical trials demonstrate biomarker diagnostic accuracy in patient populations"),
        DocumentDTO(content="Randomized controlled trials provide evidence for biomarker clinical utility"),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="clinical_results",
        title="Clinical Trial Results",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Describe clinical trial outcomes with statistical rigor",
        is_clinical_trial=True,
        is_detailed_research_plan=False,
        keywords=["clinical", "trial", "results", "efficacy"],
        max_words=400,
        search_queries=["clinical trial results", "biomarker efficacy"],
        topics=["clinical outcomes"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_trace_clinical",
    )

    assert "scientific_quality_metrics" in result
    assert "overall_score" in result
    assert result["overall_score"] >= 0.0


@pytest.mark.asyncio
async def test_evaluate_scientific_content_poor_quality_handling() -> None:
    content: str = """
    bad writing here
    no structure or organization
    random thoughts about stuff
    the biomarker might work maybe
    some results were found
    """

    rag_context: list[DocumentDTO] = []

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="poor_section",
        title="Poor Section",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test poor content",
        is_clinical_trial=False,
        is_detailed_research_plan=False,
        keywords=[],
        max_words=100,
        search_queries=[],
        topics=[],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_trace_poor",
    )

    assert result["overall_score"] < 60.0, f"Expected low score for poor content, got {result['overall_score']}"


@pytest.mark.asyncio
async def test_evaluation_performance_consistency() -> None:
    content: str = """
    The systematic biomarker analysis methodology employs advanced computational techniques
    for protein expression analysis. Statistical significance is determined using rigorous
    protocols with p-value thresholds below 0.05 for clinical validation.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Biomarker analysis employs computational techniques for protein analysis"),
        DocumentDTO(content="Statistical protocols ensure rigorous validation in clinical settings"),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="test_performance",
        title="Performance Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test performance",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "analysis", "computational"],
        max_words=200,
        search_queries=["biomarker analysis"],
        topics=["methodology"],
    )

    results: list[FastEvaluationResult] = []
    for i in range(2):
        result: FastEvaluationResult = await evaluate_scientific_content(
            content=content,
            section_config=section_config,
            rag_context=rag_context,
            research_objectives=[],
            trace_id=f"test_trace_perf_{i}",
        )
        results.append(result)

    for result in results:
        assert "overall_score" in result
        assert "structural_metrics" in result
        assert "source_grounding_metrics" in result
        assert "scientific_quality_metrics" in result
        assert "coherence_metrics" in result

    first_result: FastEvaluationResult = results[0]
    for result in results[1:]:
        assert abs(first_result["overall_score"] - result["overall_score"]) < 5.0, "Overall scores should be consistent"


@pytest.mark.asyncio
async def test_evaluation_with_empty_context() -> None:
    content: str = """
    # Research Methodology

    The biomarker analysis methodology involves systematic protein expression analysis.
    Statistical methods will be employed to determine correlation coefficients.
    Experimental design includes control groups and randomized assignment procedures.
    """

    rag_context: list[DocumentDTO] = []

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="no_context",
        title="No Context Section",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test without context",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "methodology"],
        max_words=300,
        search_queries=["biomarker analysis"],
        topics=["research"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_trace_empty",
    )

    assert isinstance(result, dict)
    assert 0.0 <= result["overall_score"] <= 100.0

    assert "structural_metrics" in result
    assert "coherence_metrics" in result


@pytest.mark.asyncio
async def test_evaluation_with_word_limit_exceeded() -> None:
    content: str = "This is a test sentence with ten words exactly. " * 50

    rag_context: list[DocumentDTO] = [DocumentDTO(content="Test content for word limit evaluation")]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="word_limit_test",
        title="Word Limit Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test word limits",
        is_clinical_trial=False,
        is_detailed_research_plan=False,
        keywords=["test"],
        max_words=200,
        search_queries=["test"],
        topics=["testing"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_trace_wordlimit",
    )

    assert "structural_metrics" in result
    assert result["structural_metrics"]["word_count_compliance"] < 70.0

    assert result["overall_score"] < 90.0
