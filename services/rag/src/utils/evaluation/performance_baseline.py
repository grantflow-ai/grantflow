import statistics
import time
from typing import Any, TypedDict

from packages.db.src.json_objects import GrantLongFormSection
from packages.shared_utils.src.logger import get_logger

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content
from services.rag.src.utils.evaluation.quality_standards import ContentType, assess_content_quality
from services.rag.src.utils.lengths import create_word_constraint

logger = get_logger(__name__)


class PerformanceBaseline(TypedDict):
    content_type: str
    avg_score: float
    min_score: float
    max_score: float
    score_std_dev: float
    avg_execution_time_ms: float
    min_execution_time_ms: float
    max_execution_time_ms: float
    sample_count: int
    baseline_timestamp: float


class PerformanceResult(TypedDict):
    overall_score: float
    execution_time_ms: float
    content_type: ContentType
    meets_quality_standards: bool


BASELINE_CONTENT: dict[ContentType, str] = {
    ContentType.CLINICAL_TRIAL: """# Clinical Trial Results

## Primary Efficacy Endpoints

The randomized, double-blind, placebo-controlled trial (n=240) demonstrated statistically significant efficacy of the investigational biomarker panel for early-stage disease detection. Primary endpoint analysis revealed diagnostic sensitivity of 87.3% (95% CI: 82.1-91.8%) and specificity of 93.6% (95% CI: 89.4-96.7%) in the intention-to-treat population (p < 0.001 vs. placebo).

### Statistical Analysis

Efficacy was analyzed using a pre-specified hierarchical testing procedure. The primary analysis employed logistic regression adjusting for age, sex, and baseline disease stage. Secondary endpoints included time-to-diagnosis and false-positive rates.

## Safety Profile

Safety analysis encompassed all randomized participants (n=240). No serious adverse events related to the diagnostic procedure were reported. The safety profile was consistent with previous phase II studies.""",
    ContentType.BIOMEDICAL_RESEARCH: """# Biomarker Discovery and Validation

## Research Methodology

This prospective cohort study investigated novel protein biomarkers for cardiovascular risk stratification using mass spectrometry-based proteomics. The study population comprised 450 participants enrolled from three academic medical centers.

### Sample Collection and Processing

Blood samples were collected following standardized protocols with participants fasting for 12 hours. Plasma was isolated within 2 hours and stored at -80°C. Proteomic analysis employed tandem mass spectrometry with data-independent acquisition.

## Results

Principal component analysis identified 23 differentially expressed proteins (FDR < 0.05). ROC analysis demonstrated AUC values ranging from 0.72 to 0.89 for individual biomarkers. The combined biomarker panel achieved AUC = 0.93 for cardiovascular risk prediction.""",
    ContentType.METHODOLOGY: """# Experimental Design and Statistical Framework

## Study Design

This investigation employs a randomized controlled design with stratified sampling to ensure representative population coverage. Participants are allocated using computer-generated randomization with permuted blocks of variable size.

### Power Analysis

Sample size calculations assume 80% statistical power to detect a minimum clinically important difference of 0.5 standard deviations between groups, with two-sided alpha = 0.05. Accounting for 15% attrition, the target enrollment is 320 participants.

## Statistical Methods

Primary analysis will use intention-to-treat principles with multiple imputation for missing data. Secondary analyses include per-protocol analysis and sensitivity analyses using complete case analysis. All statistical tests are two-sided with significance level alpha = 0.05.""",
    ContentType.LITERATURE_REVIEW: """# Systematic Review of Biomarker Applications

## Search Strategy and Selection Criteria

A comprehensive literature search was conducted using PubMed, Embase, and Cochrane databases from January 2010 to December 2023. Search terms included biomarker, diagnostic accuracy, sensitivity, specificity, and clinical validation [1-3].

### Study Selection

Inclusion criteria specified prospective studies with sample sizes ≥100 participants, validated biomarker assays, and clinical outcome measures. Two independent reviewers assessed study quality using the STARD checklist for diagnostic accuracy studies [4].

## Evidence Synthesis

Meta-analysis of 47 studies (total n=15,840) revealed pooled sensitivity of 0.84 (95% CI: 0.79-0.88) and specificity of 0.91 (95% CI: 0.87-0.94). Heterogeneity analysis identified study population characteristics as the primary source of between-study variation (I² = 68%).""",
    ContentType.PRELIMINARY_DATA: """# Pilot Study Results

## Initial Findings

Preliminary analysis of 50 samples suggests potential biomarker utility. Mean protein concentration was 15.2 ± 4.7 mg/mL in cases versus 8.9 ± 3.1 mg/mL in controls (p = 0.002).

### Method Development

Assay validation demonstrated acceptable precision (CV < 15%) and accuracy (recovery 95-105%). Detection limit was established at 2.5 mg/mL.

## Next Steps

These encouraging results support proceeding to a larger validation study with 200 participants to confirm diagnostic performance.""",
}

BASELINE_CONFIGS: dict[ContentType, GrantLongFormSection] = {
    ContentType.CLINICAL_TRIAL: GrantLongFormSection(
        id="clinical_trial_baseline",
        title="Clinical Trial Results",
        order=1,
        evidence="CFP evidence for Clinical Trial Results",
        parent_id=None,
        depends_on=[],
        generation_instructions="Present clinical trial results with statistical rigor",
        is_clinical_trial=True,
        is_detailed_research_plan=False,
        keywords=["clinical trial", "efficacy", "safety", "biomarker"],
        length_constraint=create_word_constraint(500, "Baseline"),
        search_queries=["clinical trial results", "biomarker efficacy"],
        topics=["clinical outcomes"],
    ),
    ContentType.BIOMEDICAL_RESEARCH: GrantLongFormSection(
        id="biomedical_research_baseline",
        title="Biomedical Research",
        order=1,
        evidence="CFP evidence for Biomedical Research",
        parent_id=None,
        depends_on=[],
        generation_instructions="Present biomedical research findings",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["biomarker", "proteomics", "validation"],
        length_constraint=create_word_constraint(400, "Baseline"),
        search_queries=["biomarker discovery", "proteomics analysis"],
        topics=["biomedical research"],
    ),
    ContentType.METHODOLOGY: GrantLongFormSection(
        id="methodology_baseline",
        title="Research Methodology",
        order=1,
        evidence="CFP evidence for Research Methodology",
        parent_id=None,
        depends_on=[],
        generation_instructions="Describe research methodology and statistical approach",
        is_clinical_trial=False,
        is_detailed_research_plan=True,
        keywords=["methodology", "statistical analysis", "study design"],
        length_constraint=create_word_constraint(350, "Baseline"),
        search_queries=["research methodology", "statistical methods"],
        topics=["research methods"],
    ),
    ContentType.LITERATURE_REVIEW: GrantLongFormSection(
        id="literature_review_baseline",
        title="Literature Review",
        order=1,
        evidence="CFP evidence for Literature Review",
        parent_id=None,
        depends_on=[],
        generation_instructions="Synthesize literature evidence",
        is_clinical_trial=False,
        is_detailed_research_plan=False,
        keywords=["literature review", "meta-analysis", "systematic review"],
        length_constraint=create_word_constraint(400, "Baseline"),
        search_queries=["systematic review", "meta-analysis"],
        topics=["literature synthesis"],
    ),
    ContentType.PRELIMINARY_DATA: GrantLongFormSection(
        id="preliminary_data_baseline",
        title="Preliminary Data",
        order=1,
        evidence="CFP evidence for Preliminary Data",
        parent_id=None,
        depends_on=[],
        generation_instructions="Present preliminary findings",
        is_clinical_trial=False,
        is_detailed_research_plan=False,
        keywords=["preliminary data", "pilot study"],
        length_constraint=create_word_constraint(200, "Baseline"),
        search_queries=["pilot study results"],
        topics=["preliminary findings"],
    ),
}


async def evaluate_performance_baseline(
    content_type: ContentType,
    runs: int = 5,
) -> PerformanceBaseline:
    content = BASELINE_CONTENT[content_type]
    section_config = BASELINE_CONFIGS[content_type]

    rag_context = [DocumentDTO(content="Baseline context for evaluation consistency testing")]

    results: list[PerformanceResult] = []

    logger.info(
        "Starting performance baseline evaluation",
        content_type=content_type.value,
        runs=runs,
    )

    for run in range(runs):
        start_time = time.time()

        evaluation_result = await evaluate_scientific_content(
            content=content,
            section_config=section_config,
            rag_context=rag_context,
            research_objectives=[],
            trace_id=f"baseline_{content_type.value}_{run}",
        )

        execution_time = (time.time() - start_time) * 1000

        quality_assessment = assess_content_quality(
            overall_score=evaluation_result["overall_score"] / 100.0,
            component_scores={
                "structural": evaluation_result["structural_metrics"]["overall"],
                "scientific_quality": evaluation_result["quality_metrics"]["overall"],
                "source_grounding": evaluation_result["grounding_metrics"]["overall"],
                "coherence": evaluation_result["coherence_metrics"]["overall"],
            },
            content_type=content_type,
        )

        results.append(
            PerformanceResult(
                overall_score=evaluation_result["overall_score"],
                execution_time_ms=execution_time,
                content_type=content_type,
                meets_quality_standards=quality_assessment["meets_requirements"],
            )
        )

        logger.debug(
            "Baseline run completed",
            run=run + 1,
            score=evaluation_result["overall_score"],
            execution_time_ms=execution_time,
            meets_standards=quality_assessment["meets_requirements"],
        )

    scores = [r["overall_score"] for r in results]
    times = [r["execution_time_ms"] for r in results]

    baseline = PerformanceBaseline(
        content_type=content_type.value,
        avg_score=statistics.mean(scores),
        min_score=min(scores),
        max_score=max(scores),
        score_std_dev=statistics.stdev(scores) if len(scores) > 1 else 0.0,
        avg_execution_time_ms=statistics.mean(times),
        min_execution_time_ms=min(times),
        max_execution_time_ms=max(times),
        sample_count=len(results),
        baseline_timestamp=time.time(),
    )

    quality_rate = sum(1 for r in results if r["meets_quality_standards"]) / len(results)

    logger.info(
        "Performance baseline established",
        content_type=content_type.value,
        avg_score=baseline["avg_score"],
        score_std_dev=baseline["score_std_dev"],
        avg_execution_time_ms=baseline["avg_execution_time_ms"],
        quality_standards_rate=quality_rate,
        sample_count=baseline["sample_count"],
    )

    return baseline


async def run_all_baselines() -> dict[ContentType, PerformanceBaseline]:
    baselines = {}

    for content_type in ContentType:
        baseline = await evaluate_performance_baseline(content_type, runs=3)
        baselines[content_type] = baseline

    return baselines


async def detect_performance_regression(
    content_type: ContentType,
    baseline: PerformanceBaseline,
    tolerance_factor: float = 0.1,
) -> dict[str, Any]:
    current_result = await evaluate_performance_baseline(content_type, runs=1)

    score_degradation = (baseline["avg_score"] - current_result["avg_score"]) / baseline["avg_score"]
    time_degradation = (current_result["avg_execution_time_ms"] - baseline["avg_execution_time_ms"]) / baseline[
        "avg_execution_time_ms"
    ]

    score_regression = score_degradation > tolerance_factor
    time_regression = time_degradation > tolerance_factor

    analysis = {
        "content_type": content_type.value,
        "baseline_score": baseline["avg_score"],
        "current_score": current_result["avg_score"],
        "score_degradation_pct": score_degradation * 100,
        "score_regression_detected": score_regression,
        "baseline_time_ms": baseline["avg_execution_time_ms"],
        "current_time_ms": current_result["avg_execution_time_ms"],
        "time_degradation_pct": time_degradation * 100,
        "time_regression_detected": time_regression,
        "overall_regression": score_regression or time_regression,
        "tolerance_factor": tolerance_factor,
        "analysis_timestamp": time.time(),
    }

    if analysis["overall_regression"]:
        logger.warning(
            "Performance regression detected",
            content_type=content_type.value,
            score_degradation_pct=analysis["score_degradation_pct"],
            time_degradation_pct=analysis["time_degradation_pct"],
            score_regression=score_regression,
            time_regression=time_regression,
        )
    else:
        logger.info(
            "No performance regression detected",
            content_type=content_type.value,
            score_change_pct=analysis["score_degradation_pct"],
            time_change_pct=analysis["time_degradation_pct"],
        )

    return analysis
