from typing import TYPE_CHECKING

import pytest
from packages.db.src.json_objects import GrantLongFormSection

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.quality_standards import (
    COMPONENT_REQUIREMENTS,
    ContentType,
)
from services.rag.src.utils.evaluation.text.coherence import evaluate_coherence
from services.rag.src.utils.evaluation.text.grounding import evaluate_source_grounding
from services.rag.src.utils.evaluation.text.quality import evaluate_scientific_quality
from services.rag.src.utils.evaluation.text.structure import evaluate_structure

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import (
        CoherenceMetrics,
        GroundingMetrics,
        QualityMetrics,
        StructuralMetrics,
    )


@pytest.mark.asyncio
async def test_coherence_quality_correlation() -> None:
    high_quality_content: str = """
    # Systematic Biomarker Analysis

    ## Methodology Framework

    The research employs rigorous statistical analysis of protein biomarkers using standardized protocols.
    Furthermore, the methodology integrates advanced computational techniques with clinical validation procedures.
    Subsequently, experimental design includes randomized control groups and blinded assessment protocols.

    ## Statistical Analysis

    Statistical significance is determined using p-values below 0.05 threshold with confidence intervals.
    Moreover, the analysis employs multivariate regression modeling for comprehensive pattern recognition.
    Therefore, the results demonstrate reproducible and clinically relevant diagnostic outcomes.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Standardized protocols ensure rigorous biomarker analysis with clinical validation"),
        DocumentDTO(content="Statistical analysis with p-value thresholds provides reliable research outcomes"),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="correlation_test",
        title="Correlation Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test correlation",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "analysis", "statistical"],
        max_words=400,
        search_queries=["biomarker analysis"],
        topics=["methodology"],
    )

    coherence_result: CoherenceMetrics = await evaluate_coherence(high_quality_content)
    quality_result: QualityMetrics = await evaluate_scientific_quality(
        high_quality_content, rag_context, section_config
    )

    assert coherence_result["overall"] > 0.3
    assert quality_result["overall"] > 0.3

    poor_content: str = """
    bad writing here. no structure. random sentences.
    the biomarker stuff might work maybe sometimes.
    results were found somewhere. pretty good results.
    more random text without transitions or logic.
    """

    coherence_poor: CoherenceMetrics = await evaluate_coherence(poor_content)
    quality_poor: QualityMetrics = await evaluate_scientific_quality(poor_content, [], section_config)

    assert coherence_poor["overall"] < 0.4
    assert quality_poor["overall"] < 0.4

    quality_diff: float = quality_result["overall"] - quality_poor["overall"]
    coherence_diff: float = coherence_result["overall"] - coherence_poor["overall"]
    assert quality_diff > 0
    assert coherence_diff > 0


@pytest.mark.asyncio
async def test_structure_coherence_interaction() -> None:
    structured_content: str = """
    # Research Methodology

    ## Data Collection Framework

    The systematic data collection employs standardized protocols for biomarker analysis.
    This approach ensures consistent measurement procedures across all research sites.

    ### Sampling Procedures

    Participants are recruited through randomized selection protocols with inclusion criteria.
    The sampling methodology ensures representative population characteristics.

    ### Quality Control

    Quality assurance protocols include duplicate measurements and control samples.
    These procedures validate measurement accuracy and reproducibility.

    ## Statistical Analysis Framework

    ### Primary Analysis

    Statistical significance is determined using appropriate parametric tests.
    The analysis employs confidence intervals and effect size calculations.

    ### Secondary Analysis

    Exploratory analysis includes subgroup comparisons and sensitivity testing.
    These analyses provide additional validation of primary findings.
    """

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="structure_coherence_test",
        title="Structure Coherence Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test structure and coherence",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["methodology", "analysis"],
        max_words=500,
        search_queries=["research methodology"],
        topics=["methods"],
    )

    structure_result: StructuralMetrics = await evaluate_structure(structured_content, section_config)
    coherence_result: CoherenceMetrics = await evaluate_coherence(structured_content)

    assert structure_result["overall"] > 0.4
    assert coherence_result["overall"] > 0.4

    assert structure_result["header_structure"] >= 0.5, (
        f"Expected good header structure for structured content, got {structure_result['header_structure']}"
    )
    assert coherence_result["global_coherence"] > 0.3

    unstructured_content: str = """
    random text without headers or organization
    more unstructured content mixed together
    some methodology stuff thrown in randomly
    statistical analysis mentioned without context
    quality control procedures described poorly
    """

    structure_poor: StructuralMetrics = await evaluate_structure(unstructured_content, section_config)
    coherence_poor: CoherenceMetrics = await evaluate_coherence(unstructured_content)

    assert structure_poor["overall"] < 0.4
    assert coherence_poor["overall"] < 0.8


@pytest.mark.asyncio
async def test_source_grounding_quality_interaction() -> None:
    content: str = """
    # Evidence-Based Research Analysis

    According to recent studies [1], systematic biomarker analysis demonstrates significant
    correlation with disease progression markers. The methodology employs standardized
    protocols validated in multiple clinical settings for reproducible results.

    Research indicates [2] that this approach provides reliable diagnostic accuracy
    with sensitivity of 85% and specificity of 92% in patient populations.
    Statistical analysis confirms clinical significance with p-values below 0.01.

    Previous investigations [3] demonstrate that protein expression patterns
    correlate with molecular pathways involved in disease pathogenesis.
    The evidence strongly supports biomarker utility in clinical applications.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(
            content="Studies demonstrate biomarker analysis correlation with disease progression in clinical validation"
        ),
        DocumentDTO(
            content="Standardized protocols for biomarker analysis provide reproducible results in clinical settings"
        ),
        DocumentDTO(
            content="Research shows diagnostic accuracy with 85% sensitivity and 92% specificity in patient studies"
        ),
        DocumentDTO(
            content="Protein expression patterns correlate with molecular pathways in disease pathogenesis research"
        ),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="grounding_quality_test",
        title="Grounding Quality Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test evidence-based content",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "analysis", "evidence"],
        max_words=400,
        search_queries=["biomarker analysis", "clinical validation"],
        topics=["research evidence"],
    )

    grounding_result: GroundingMetrics = await evaluate_source_grounding(content, rag_context, section_config)
    quality_result: QualityMetrics = await evaluate_scientific_quality(content, rag_context, section_config)

    assert grounding_result["overall"] > 0.3
    assert quality_result["overall"] > 0.4

    assert quality_result["evidence_based_claims_ratio"] >= 0.4
    assert grounding_result["context_citation_density"] >= 0.1, (
        f"Expected some citation density with citations present, got {grounding_result['context_citation_density']}"
    )

    unsupported_content: str = """
    The weather today is sunny and warm with clear skies.
    Random statements about topics unrelated to research.
    No citations or evidence-based claims are present.
    Just general statements without scientific backing.
    """

    grounding_poor: GroundingMetrics = await evaluate_source_grounding(unsupported_content, rag_context, section_config)
    quality_poor: QualityMetrics = await evaluate_scientific_quality(unsupported_content, rag_context, section_config)

    assert grounding_poor["overall"] < 0.3
    assert quality_poor["overall"] < 0.4


@pytest.mark.asyncio
async def test_keyword_coverage_across_components() -> None:
    section_config: GrantLongFormSection = GrantLongFormSection(
        id="keyword_test",
        title="Keyword Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test keyword integration",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "protein", "analysis", "statistical", "clinical"],
        max_words=300,
        search_queries=["biomarker protein analysis", "statistical methods"],
        topics=["biomarker research"],
    )

    high_keyword_content: str = """
    # Biomarker Protein Analysis

    The biomarker research employs protein expression analysis using statistical methods.
    Clinical validation of biomarker panels demonstrates statistical significance.
    Protein biomarkers enable clinical analysis of disease progression patterns.
    Statistical analysis of biomarker protein levels provides clinical insights.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Biomarker protein analysis employs statistical methods for clinical validation"),
        DocumentDTO(content="Statistical analysis of protein biomarkers provides clinical research insights"),
    ]

    grounding_high: GroundingMetrics = await evaluate_source_grounding(
        high_keyword_content, rag_context, section_config
    )
    await evaluate_scientific_quality(high_keyword_content, rag_context, section_config)

    assert grounding_high["keyword_coverage"] > 0.6
    assert grounding_high["search_query_integration"] > 0.5

    low_keyword_content: str = """
    # Research Methods

    The study involves investigation of molecular indicators using computational approaches.
    Validation of diagnostic panels shows significant results in patient populations.
    Molecular markers enable examination of disease development processes.
    Computational examination of indicator levels provides research findings.
    """

    grounding_low: GroundingMetrics = await evaluate_source_grounding(low_keyword_content, rag_context, section_config)
    await evaluate_scientific_quality(low_keyword_content, rag_context, section_config)

    assert grounding_low["keyword_coverage"] < grounding_high["keyword_coverage"]
    assert grounding_low["search_query_integration"] < grounding_high["search_query_integration"]


@pytest.mark.asyncio
async def test_clinical_trial_weighting_consistency() -> None:
    clinical_content: str = """
    # Clinical Trial Results

    The randomized controlled trial (n=150) demonstrated significant efficacy with p < 0.001.
    Primary endpoint: diagnostic accuracy of 88% sensitivity and 94% specificity.
    Secondary endpoints showed 25% improvement in early detection rates.

    Safety analysis revealed no serious adverse events related to the diagnostic procedure.
    The trial protocol was approved by institutional review board (IRB-2023-005).
    Statistical analysis employed intention-to-treat principles with 95% confidence intervals.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Clinical trials demonstrate diagnostic accuracy with high sensitivity and specificity"),
        DocumentDTO(content="Randomized controlled trials provide evidence for early detection improvements"),
    ]

    clinical_config: GrantLongFormSection = GrantLongFormSection(
        id="clinical_trial",
        title="Clinical Trial Results",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Describe clinical trial results",
        is_clinical_trial=True,
        is_detailed_research_plan=False,
        keywords=["clinical", "trial", "efficacy", "safety"],
        max_words=300,
        search_queries=["clinical trial results"],
        topics=["clinical outcomes"],
    )

    research_config: GrantLongFormSection = GrantLongFormSection(
        id="research_plan",
        title="Research Plan",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Describe research methodology",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["clinical", "trial", "efficacy", "safety"],
        max_words=300,
        search_queries=["clinical trial results"],
        topics=["clinical outcomes"],
    )

    quality_clinical: QualityMetrics = await evaluate_scientific_quality(clinical_content, rag_context, clinical_config)
    quality_research: QualityMetrics = await evaluate_scientific_quality(clinical_content, rag_context, research_config)

    # Use quality standards for clinical trial content
    clinical_requirements = COMPONENT_REQUIREMENTS[ContentType.CLINICAL_TRIAL]
    research_requirements = COMPONENT_REQUIREMENTS[ContentType.BIOMEDICAL_RESEARCH]

    assert quality_clinical["overall"] >= clinical_requirements["scientific_quality"], (
        f"Expected good clinical trial quality, got {quality_clinical['overall']}"
    )
    assert quality_research["overall"] >= research_requirements["scientific_quality"], (
        f"Expected good research quality, got {quality_research['overall']}"
    )

    assert "evidence_based_claims_ratio" in quality_clinical
    assert "evidence_based_claims_ratio" in quality_research
