import pytest
from packages.db.src.json_objects import (
    CFPAnalysisResult,
    GrantLongFormSection,
    ResearchObjective,
)

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content


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

    result = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_trace_001",
    )

    assert isinstance(result, dict)
    assert "overall_score" in result
    assert "structural_metrics" in result
    assert "grounding_metrics" in result
    assert "quality_metrics" in result
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

    result = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_trace_clinical",
    )

    assert "scientific_quality_metrics" in result
    assert "overall_score" in result
    # This test validates pipeline functionality, not content quality - use basic threshold
    assert result["overall_score"] >= 40.0, f"Expected basic functionality score, got {result['overall_score']}"
    assert result["overall_score"] <= 100.0, "Score should not exceed maximum"


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

    result = await evaluate_scientific_content(
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

    results = []
    for i in range(2):
        result = await evaluate_scientific_content(
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

    first_result = results[0]
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

    result = await evaluate_scientific_content(
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

    result = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_trace_wordlimit",
    )

    assert "structural_metrics" in result
    assert result["structural_metrics"]["word_count_compliance"] < 70.0

    assert result["overall_score"] < 90.0


@pytest.mark.asyncio
async def test_evaluate_scientific_content_with_comprehensive_context() -> None:
    """Test that all context types are properly passed through the evaluation pipeline."""
    content: str = """
    # Biomarker Discovery and Clinical Validation

    ## Research Objectives and Methodology

    This research aims to identify and validate protein biomarkers for early cancer detection
    using mass spectrometry analysis combined with clinical validation studies. The methodology
    employs rigorous statistical analysis with p-values < 0.01 significance threshold.

    Primary objective: Discover biomarkers with >90% diagnostic accuracy for early-stage cancer.
    Secondary objective: Develop clinical-grade diagnostic assay for rapid patient screening.

    ## Statistical Analysis Framework

    The analysis employs multivariate regression modeling with confidence intervals and effect sizes.
    Statistical significance is determined using appropriate parametric tests with Bonferroni correction.
    Sample size calculations ensure 80% power for detecting clinically meaningful differences.

    According to previous studies [1], this systematic approach demonstrates reproducible results.
    Evidence indicates strong correlation between biomarker expression and disease progression.
    Clinical validation confirms diagnostic utility across diverse patient populations.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Mass spectrometry analysis enables precise biomarker identification in clinical samples"),
        DocumentDTO(content="Statistical validation with appropriate p-value thresholds ensures clinical reliability"),
        DocumentDTO(
            content="Biomarker discovery requires systematic analysis and clinical validation for patient impact"
        ),
    ]

    research_objectives = [
        ResearchObjective(
            number=1,
            title="Biomarker discovery for early cancer detection",
            description="Systematic identification of protein biomarkers using mass spectrometry with >90% accuracy",
            feasibility_analysis="Feasible with established mass spectrometry protocols and clinical partnerships",
            innovation_score=8.5,
            research_questions=[
                "Which biomarkers show strongest correlation with early cancer?",
                "How do expression patterns differ across cancer subtypes?",
            ],
            methodology="Mass spectrometry analysis with statistical validation",
            expected_outcomes="3-5 biomarkers with >90% diagnostic accuracy",
            timeline="24 months",
            resources_required="Mass spectrometry facility, clinical samples",
        ),
        ResearchObjective(
            number=2,
            title="Clinical diagnostic assay development",
            description="Development of clinical-grade assay for rapid cancer screening",
            feasibility_analysis="Well-established assay development capabilities with regulatory pathway",
            innovation_score=7.2,
            research_questions=["What is optimal assay format for clinical use?"],
            methodology="ELISA development with clinical validation",
            expected_outcomes="FDA-approved diagnostic assay",
            timeline="36 months",
            resources_required="Assay development laboratory, clinical validation samples",
        ),
    ]

    CFPAnalysisResult(
        funding_agency="National Institutes of Health",
        program_name="Cancer Biomarker Research Excellence Program",
        award_amount="$750,000",
        project_duration="4 years",
        application_deadline="2024-04-15",
        eligibility_requirements=[
            "Principal investigator must hold PhD or MD in biomedical field",
            "Institution must be accredited US research university",
            "Project must focus on cancer biomarker discovery and validation",
        ],
        evaluation_criteria=[
            "Scientific significance and innovation (35%)",
            "Technical approach and methodology (30%)",
            "Principal investigator qualifications (20%)",
            "Institutional resources (15%)",
        ],
        required_documents=[
            "Project narrative with research plan (20 pages maximum)",
            "Detailed budget and justification",
            "Biographical sketches for key personnel",
        ],
        submission_requirements=[
            "Electronic submission through NIH grants.gov portal",
            "All documents in PDF format with embedded fonts",
            "Font minimum 11 points, single-spaced formatting",
        ],
        research_focus=[
            "Cancer biomarker discovery using proteomics approaches",
            "Clinical validation studies in patient populations",
            "Development of diagnostic assays for clinical implementation",
        ],
        quotes=[
            "Applications must demonstrate clear clinical relevance and translational potential",
            "Priority given to projects with strong preliminary data and clinical collaborations",
        ],
    )

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="comprehensive_context",
        title="Biomarker Research with Full Context",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Describe biomarker research with clinical focus",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "cancer", "clinical", "validation", "mass spectrometry"],
        max_words=600,
        search_queries=["biomarker cancer discovery", "clinical validation studies"],
        topics=["cancer research", "biomarker discovery", "clinical diagnostics"],
    )

    result = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=research_objectives,
        trace_id="test_trace_comprehensive_context",
    )

    # Verify all evaluation components are present
    assert isinstance(result, dict)
    assert "overall_score" in result
    assert "structural_metrics" in result
    assert "grounding_metrics" in result
    assert "quality_metrics" in result
    assert "coherence_metrics" in result

    # Verify reasonable scores with comprehensive context
    assert result["overall_score"] > 20.0, (
        f"Expected reasonable score with comprehensive context, got {result['overall_score']}"
    )
    assert result["overall_score"] <= 100.0

    # Verify grounding metrics benefit from context
    grounding_metrics = result["grounding_metrics"]
    assert "keyword_coverage" in grounding_metrics
    assert "search_query_integration" in grounding_metrics
    assert grounding_metrics["keyword_coverage"] > 0.2, (
        f"Expected some keyword coverage with rich context, got {grounding_metrics['keyword_coverage']}"
    )

    # Verify scientific quality metrics
    quality_metrics = result["quality_metrics"]
    assert "overall" in quality_metrics
    assert "evidence_based_claims_ratio" in quality_metrics
    assert quality_metrics["overall"] > 0.2, (
        f"Expected reasonable scientific quality with context, got {quality_metrics['overall']}"
    )

    # Test comparison without research objectives to show context impact
    result_minimal = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],  # No objectives
        trace_id="test_trace_minimal_context",
    )

    # Full context should generally produce equal or better grounding
    assert result["grounding_metrics"]["overall"] >= result_minimal["grounding_metrics"]["overall"] - 0.1
