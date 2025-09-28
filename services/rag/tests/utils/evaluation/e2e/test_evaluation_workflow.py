from typing import TYPE_CHECKING

import pytest
from packages.db.src.json_objects import GrantLongFormSection

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content

if TYPE_CHECKING:
    from services.rag.src.utils.evaluation.dto import FastEvaluationResult


@pytest.mark.asyncio
async def test_complete_evaluation_workflow_biomedical_research() -> None:
    content: str = """
    # Biomarker Discovery and Validation in Cardiovascular Disease

    ## Background and Significance

    Cardiovascular disease (CVD) remains the leading cause of mortality worldwide, accounting for
    approximately 17.9 million deaths annually according to WHO statistics. Early detection and
    risk stratification are critical for improving patient outcomes and reducing healthcare burden.

    Recent advances in proteomics and metabolomics have identified novel biomarkers that may
    enhance cardiovascular risk prediction beyond traditional clinical markers. According to
    Smith et al. (2023) [1], protein biomarkers demonstrate superior predictive accuracy compared
    to conventional lipid panels in asymptomatic populations.

    ## Research Methodology

    ### Study Design

    We propose a prospective cohort study with 2,000 participants aged 45-75 years recruited
    from primary care clinics. The study design includes comprehensive baseline assessment,
    biomarker measurement, and 5-year clinical follow-up for cardiovascular events.

    Inclusion criteria:
    - Age 45-75 years
    - No history of cardiovascular disease
    - Willing to provide informed consent

    Exclusion criteria:
    - Current acute illness
    - Pregnancy
    - Inability to provide blood samples

    ### Biomarker Analysis

    Blood samples will be collected after 12-hour fasting and processed within 2 hours.
    Protein biomarkers will be measured using high-throughput mass spectrometry with
    targeted proteomics approaches. Quality control measures include:

    1. Duplicate measurements for all samples
    2. Internal standard calibration
    3. Batch randomization to minimize technical variation
    4. Coefficient of variation <10% for all assays

    ### Statistical Analysis

    Primary analysis will employ Cox proportional hazards regression to assess biomarker
    association with cardiovascular events. Statistical significance will be determined
    at p < 0.05 with Bonferroni correction for multiple comparisons.

    Sample size calculations indicate 80% power to detect hazard ratios ≥1.5 with
    alpha = 0.05, assuming 10% event rate over 5 years. Secondary analyses will include:

    - Receiver operating characteristic (ROC) analysis
    - Net reclassification improvement (NRI) calculation
    - Decision curve analysis for clinical utility

    ## Expected Outcomes and Impact

    This research will establish whether novel protein biomarkers improve cardiovascular
    risk prediction beyond current clinical guidelines. Expected outcomes include:

    1. Identification of biomarker panel with C-statistic >0.80
    2. Demonstration of significant NRI compared to Framingham Risk Score
    3. Validation of biomarker stability and reproducibility

    The findings will contribute to personalized medicine approaches for cardiovascular
    disease prevention and may inform clinical practice guidelines for risk assessment.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(
            content="Cardiovascular disease remains leading cause of mortality with 17.9 million annual deaths worldwide"
        ),
        DocumentDTO(
            content="Smith et al. 2023 demonstrated protein biomarkers show superior predictive accuracy compared to conventional lipid panels"
        ),
        DocumentDTO(
            content="Proteomics and metabolomics advances identified novel biomarkers for cardiovascular risk prediction"
        ),
        DocumentDTO(
            content="Mass spectrometry with targeted proteomics enables precise protein quantification for biomarker discovery"
        ),
        DocumentDTO(
            content="Cox proportional hazards regression assesses biomarker association with cardiovascular events"
        ),
        DocumentDTO(content="ROC analysis and net reclassification improvement evaluate biomarker clinical utility"),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="biomedical_research_proposal",
        title="Biomarker Discovery Research Proposal",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Develop comprehensive biomedical research proposal with rigorous methodology",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=[
            "biomarker",
            "cardiovascular",
            "proteomics",
            "mass spectrometry",
            "cohort study",
            "statistical analysis",
            "risk prediction",
        ],
        max_words=800,
        search_queries=["cardiovascular biomarker discovery", "proteomics risk prediction", "cohort study methodology"],
        topics=["biomedical research", "cardiovascular disease", "biomarker validation"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_biomedical_001",
    )

    assert result["overall_score"] > 50.0, (
        f"Expected reasonable score for quality biomedical content, got {result['overall_score']}"
    )

    assert "structural_metrics" in result
    assert "source_grounding_metrics" in result
    assert "scientific_quality_metrics" in result
    assert "coherence_metrics" in result


@pytest.mark.asyncio
async def test_complete_evaluation_workflow_clinical_trial() -> None:
    content: str = """
    # Phase III Randomized Controlled Trial Results: Novel Biomarker-Guided Therapy

    ## Trial Design and Participants

    This double-blind, placebo-controlled, randomized clinical trial (ClinicalTrials.gov: NCT04567890)
    enrolled 1,247 patients with moderate-to-severe cardiovascular disease across 45 centers
    in North America and Europe between January 2021 and December 2022.

    Randomization was performed using permuted block design with stratification by age (<65 vs ≥65 years)
    and baseline risk score. The trial protocol was approved by institutional review boards at all
    participating sites (Central IRB approval: IRB-2020-CVD-001).

    ## Primary and Secondary Endpoints

    **Primary Endpoint:** Time to first occurrence of major adverse cardiovascular events (MACE)
    defined as cardiovascular death, non-fatal myocardial infarction, or stroke at 24 months.

    **Secondary Endpoints:**
    - Individual components of MACE
    - All-cause mortality
    - Quality of life measures (SF-36)
    - Safety outcomes and adverse events

    ## Results

    ### Baseline Characteristics

    Mean age was 63.4 ± 12.1 years, with 42% female participants. Baseline characteristics were
    well-balanced between treatment groups (biomarker-guided therapy n=623, standard care n=624).

    ### Efficacy Outcomes

    Primary endpoint occurred in 89 patients (14.3%) in the biomarker-guided group versus
    126 patients (20.2%) in the standard care group (hazard ratio 0.68; 95% CI 0.52-0.89; p=0.005).

    **Key Secondary Results:**
    - Cardiovascular death: HR 0.61 (95% CI 0.41-0.91; p=0.016)
    - Non-fatal MI: HR 0.72 (95% CI 0.48-1.08; p=0.114)
    - Stroke: HR 0.71 (95% CI 0.43-1.17; p=0.182)

    ### Safety Analysis

    Serious adverse events occurred in 156 patients (25.0%) in the biomarker-guided group
    and 168 patients (26.9%) in the standard care group (p=0.452). No safety signals
    were identified with biomarker-guided therapy.

    ## Clinical Implications

    These results demonstrate that biomarker-guided therapy significantly reduces major
    cardiovascular events compared to standard care. The 32% relative risk reduction
    translates to a number needed to treat of 17 patients over 24 months.
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Randomized controlled trials provide gold standard evidence for clinical interventions"),
        DocumentDTO(
            content="Major adverse cardiovascular events (MACE) serve as primary endpoint in cardiovascular trials"
        ),
        DocumentDTO(content="Intention-to-treat analysis maintains randomization benefits in clinical trial analysis"),
        DocumentDTO(content="Number needed to treat provides clinically interpretable measure of treatment benefit"),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="clinical_trial_results",
        title="Clinical Trial Results",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Present clinical trial results with statistical rigor and clinical interpretation",
        is_clinical_trial=True,
        is_detailed_research_plan=False,
        keywords=[
            "randomized controlled trial",
            "clinical trial",
            "cardiovascular",
            "biomarker",
            "efficacy",
            "safety",
            "statistical analysis",
        ],
        max_words=700,
        search_queries=["cardiovascular clinical trial results", "biomarker-guided therapy efficacy"],
        topics=["clinical trials", "cardiovascular intervention", "precision medicine"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_clinical_trial_001",
    )

    assert result["overall_score"] > 40.0, (
        f"Expected reasonable score for clinical trial, got {result['overall_score']}"
    )
    assert "structural_metrics" in result
    assert "scientific_quality_metrics" in result


@pytest.mark.asyncio
async def test_complete_evaluation_workflow_poor_content() -> None:
    content: str = """
    stuff about biomarkers

    we're gonna do some research on things
    it will be really good and everyone will love it
    the results will be amazing and groundbreaking

    methodology:
    - look at some data
    - analyze stuff
    - write results

    this approach is innovative and novel
    previous work was not as good as ours
    our method is better than everything else

    the biomarkers might work sometimes
    we think they could be useful maybe
    more research is needed to confirm things
    """

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="High-quality biomarker research requires rigorous statistical methodology"),
        DocumentDTO(content="Evidence-based claims must be supported by peer-reviewed literature"),
        DocumentDTO(content="Scientific writing should use precise technical language and avoid vague statements"),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="poor_content_test",
        title="Poor Content Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Evaluate poor quality content",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "research", "methodology", "analysis"],
        max_words=300,
        search_queries=["biomarker research methodology"],
        topics=["research quality"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_poor_content_001",
    )

    assert result["overall_score"] < 45.0, f"Expected low score for poor content, got {result['overall_score']}"

    assert "structural_metrics" in result
    assert "scientific_quality_metrics" in result
    assert "coherence_metrics" in result


@pytest.mark.asyncio
async def test_evaluation_workflow_with_word_limit_violation() -> None:
    base_content: str = """
    The systematic analysis of biomarker patterns in cardiovascular disease research employs
    advanced computational methodologies for comprehensive protein expression evaluation.
    Statistical significance is determined through rigorous protocols with confidence intervals.
    """

    content: str = base_content * 20

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Biomarker analysis requires concise presentation within specified word limits"),
        DocumentDTO(content="Grant proposals must adhere to strict formatting and length requirements"),
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="word_limit_violation",
        title="Word Limit Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test word limit enforcement",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "analysis", "research"],
        max_words=200,
        search_queries=["biomarker research"],
        topics=["research methodology"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_word_limit_001",
    )

    assert "structural_metrics" in result
    assert result["structural_metrics"]["word_count_compliance"] < 40.0

    assert result["overall_score"] < 70.0


@pytest.mark.asyncio
async def test_evaluation_workflow_edge_case_empty_content() -> None:
    content: str = ""

    rag_context: list[DocumentDTO] = [
        DocumentDTO(content="Research proposals require substantial content and methodology description")
    ]

    section_config: GrantLongFormSection = GrantLongFormSection(
        id="empty_content_test",
        title="Empty Content Test",
        order=1,
        parent_id=None,
        depends_on=[],
        generation_instructions="Test empty content handling",
        is_clinical_trial=False,
        is_detailed_research_plan=False,
        keywords=["research"],
        max_words=500,
        search_queries=["research methodology"],
        topics=["research"],
    )

    result: FastEvaluationResult = await evaluate_scientific_content(
        content=content,
        section_config=section_config,
        rag_context=rag_context,
        research_objectives=[],
        trace_id="test_empty_content_001",
    )

    assert result["overall_score"] <= 10.0, f"Expected very low score for empty content, got {result['overall_score']}"

    assert "structural_metrics" in result
    assert "scientific_quality_metrics" in result
