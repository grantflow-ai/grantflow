import pytest
from packages.db.src.json_objects import GrantLongFormSection, ResearchObjective, ResearchTask

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content


@pytest.fixture
def sample_grant_section() -> GrantLongFormSection:
    return GrantLongFormSection(
        id="research_strategy",
        title="Research Strategy",
        order=1,
        parent_id=None,
        keywords=["methodology", "biomarkers", "clinical trial"],
        topics=["research methods", "experimental design"],
        generation_instructions="Describe the research methodology and experimental approach",
        depends_on=[],
        max_words=1500,
        search_queries=["research methodology", "biomarker validation"],
        is_detailed_research_plan=True,
        is_clinical_trial=False,
    )


@pytest.fixture
def sample_research_objectives() -> list[ResearchObjective]:
    return [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            description="Identify and validate novel biomarkers for early disease detection",
            research_tasks=[
                ResearchTask(number=1, title="Screen candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarker performance"),
            ],
        ),
        ResearchObjective(
            number=2,
            title="Analyze disease mechanisms",
            description="Elucidate molecular mechanisms underlying disease progression",
            research_tasks=[
                ResearchTask(number=1, title="Perform pathway analysis"),
            ],
        ),
    ]


@pytest.fixture
def sample_rag_context() -> list[DocumentDTO]:
    return [
        DocumentDTO(
            content="Recent studies have shown that biomarkers play a crucial role in early disease detection. "
            "The methodology involves systematic screening of candidate proteins using mass spectrometry. "
            "Statistical analysis demonstrates significant correlation between biomarker levels and disease progression."
        ),
        DocumentDTO(
            content="Experimental design for biomarker validation requires careful control groups and randomized protocols. "
            "The research approach utilizes both in vitro and in vivo models to assess biomarker efficacy. "
            "Published findings suggest that this methodology provides reliable and reproducible results."
        ),
    ]


@pytest.fixture
def high_quality_scientific_content() -> str:
    return """
    # Research Methodology

    ## Biomarker Discovery and Validation

    This study employs a systematic approach to identify and validate novel biomarkers for early disease detection.
    The methodology combines advanced proteomic techniques with rigorous statistical analysis to ensure reliability
    and reproducibility of results.

    ### Experimental Design

    The experimental design follows established protocols for biomarker research. We will screen candidate proteins
    using mass spectrometry-based approaches, followed by validation in clinical samples. The study utilizes both
    discovery and validation cohorts to minimize bias and enhance generalizability.

    #### Sample Collection and Processing

    Biological samples will be collected according to standardized protocols. All procedures follow institutional
    guidelines and ethical standards. Sample processing involves immediate freezing at -80°C to preserve protein
    integrity for subsequent analysis.

    ### Statistical Analysis

    Statistical analysis will be performed using established methods for biomarker evaluation. We will assess
    sensitivity, specificity, and area under the curve (AUC) values. P-values less than 0.05 will be considered
    statistically significant. Multiple testing correction will be applied using the Benjamini-Hochberg method.

    ## Expected Outcomes

    Based on preliminary studies, we anticipate identifying 3-5 novel biomarkers with AUC values exceeding 0.8.
    These findings will significantly advance our understanding of disease mechanisms and provide new diagnostic tools.
    """


@pytest.fixture
def poor_quality_content() -> str:
    return """
    We want to find biomarkers. This is important. Biomarkers are good for detecting disease.
    We will use some methods to find them. The results will be very good and helpful.

    Our approach is innovative and novel. We expect great results that will change everything.
    The methodology is standard but also revolutionary. Statistical analysis will confirm our hypothesis.
    """


@pytest.mark.asyncio
async def test_fast_evaluate_high_quality_content(
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_rag_context: list[DocumentDTO],
    high_quality_scientific_content: str,
) -> None:
    result = await evaluate_scientific_content(
        content=high_quality_scientific_content,
        section_config=sample_grant_section,
        rag_context=sample_rag_context,
        research_objectives=sample_research_objectives,
        trace_id="test_high_quality",
    )

    assert result["overall_score"] > 70.0, f"Expected high score, got {result['overall_score']}"
    assert result["recommendation"] in ["accept", "llm_review"], (
        f"Unexpected recommendation: {result['recommendation']}"
    )
    assert result["confidence_score"] > 0.6, f"Expected high confidence, got {result['confidence_score']}"

    assert result["execution_time_ms"] < 10000, f"Execution too slow: {result['execution_time_ms']}ms"

    assert result["structural_metrics"]["overall"] > 0.5, "Structural score too low"
    assert result["source_grounding_metrics"]["overall"] > 0.3, "Source grounding score too low"
    assert result["scientific_quality_metrics"]["overall"] > 0.5, "Scientific quality score too low"
    assert result["coherence_metrics"]["overall"] > 0.5, "Coherence score too low"


@pytest.mark.asyncio
async def test_fast_evaluate_poor_quality_content(
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_rag_context: list[DocumentDTO],
    poor_quality_content: str,
) -> None:
    result = await evaluate_scientific_content(
        content=poor_quality_content,
        section_config=sample_grant_section,
        rag_context=sample_rag_context,
        research_objectives=sample_research_objectives,
        trace_id="test_poor_quality",
    )

    assert result["overall_score"] < 70.0, f"Expected low score for poor content, got {result['overall_score']}"
    assert result["recommendation"] in ["llm_review", "reject"], (
        f"Poor content should not be accepted: {result['recommendation']}"
    )

    assert result["execution_time_ms"] < 10000, f"Execution too slow: {result['execution_time_ms']}ms"


@pytest.mark.asyncio
async def test_fast_evaluate_empty_content(
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_rag_context: list[DocumentDTO],
) -> None:
    result = await evaluate_scientific_content(
        content="",
        section_config=sample_grant_section,
        rag_context=sample_rag_context,
        research_objectives=sample_research_objectives,
        trace_id="test_empty",
    )

    assert result["overall_score"] == 0.0, f"Expected zero score for empty content, got {result['overall_score']}"
    assert result["recommendation"] == "reject", f"Empty content should be rejected: {result['recommendation']}"
    assert result["confidence_score"] < 0.3, (
        f"Should have low confidence for empty content: {result['confidence_score']}"
    )


@pytest.mark.asyncio
async def test_fast_evaluate_no_rag_context(
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    high_quality_scientific_content: str,
) -> None:
    result = await evaluate_scientific_content(
        content=high_quality_scientific_content,
        section_config=sample_grant_section,
        rag_context=[],
        research_objectives=sample_research_objectives,
        trace_id="test_no_context",
    )

    assert result["overall_score"] > 30.0, "Should have some score even without RAG context"
    assert result["source_grounding_metrics"]["overall"] == 0.0, "Should have zero source grounding without context"
    assert result["structural_metrics"]["overall"] > 0.5, "Structural analysis should still work"


@pytest.mark.asyncio
async def test_evaluation_components_functional() -> None:
    content = "This is a research methodology for analyzing biomarkers using statistical methods."

    section_config = GrantLongFormSection(
        id="test",
        title="Test Section",
        order=1,
        parent_id=None,
        keywords=["research", "biomarkers"],
        topics=["methodology"],
        generation_instructions="Test",
        depends_on=[],
        max_words=100,
        search_queries=["research methodology"],
        is_detailed_research_plan=False,
        is_clinical_trial=False,
    )

    rag_context = [DocumentDTO(content="Research methodology involves systematic analysis of biomarkers.")]

    research_objectives = [
        ResearchObjective(
            number=1,
            title="Test objective",
            description="Test description",
            research_tasks=[ResearchTask(number=1, title="Test task")],
        )
    ]

    result = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=research_objectives,
        trace_id="test_functional",
    )

    assert 0.0 <= result["overall_score"] <= 100.0, f"Overall score out of range: {result['overall_score']}"
    assert result["recommendation"] in ["accept", "llm_review", "reject"], (
        f"Invalid recommendation: {result['recommendation']}"
    )
    assert 0.0 <= result["confidence_score"] <= 1.0, f"Confidence score out of range: {result['confidence_score']}"

    assert "structural_metrics" in result
    assert "source_grounding_metrics" in result
    assert "scientific_quality_metrics" in result
    assert "coherence_metrics" in result
    assert "cpu_scientific_analysis" in result

    assert result["execution_time_ms"] > 0, "Execution time should be positive"

    assert "detailed_feedback" in result
    assert isinstance(result["detailed_feedback"], list)


def test_fast_pipeline_imports() -> None:
    from services.rag.src.utils.evaluation import (
        FastEvaluationResult,
        evaluate_scientific_content,
    )

    assert FastEvaluationResult is not None
    assert evaluate_scientific_content is not None

    assert callable(evaluate_scientific_content)
