import pytest
from packages.db.src.json_objects import GrantLongFormSection

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.text.quality import (
    analyze_evidence_based_claims,
    assess_academic_register,
    assess_hypothesis_methodology_alignment,
    assess_technical_precision,
    calculate_scientific_term_density,
    detect_methodology_language,
    evaluate_scientific_quality,
)
from services.rag.src.utils.evaluation.text.scientific import create_scientific_vocabulary


class TestScientificTermDensity:
    def test_calculate_scientific_term_density_high_density(self) -> None:
        vocabulary = create_scientific_vocabulary()
        content = """
        The systematic analysis of biomarkers involves rigorous statistical methodology.
        Advanced computational algorithms enable comprehensive protein expression analysis.
        Clinical validation demonstrates significant correlation between molecular indicators
        and diagnostic outcomes through evidence-based research approaches.
        """
        score = calculate_scientific_term_density(content, vocabulary)
        assert score > 0.5, f"Expected high scientific term density, got {score}"

    def test_calculate_scientific_term_density_low_density(self) -> None:
        vocabulary = create_scientific_vocabulary()
        content = """
        The quick brown fox jumps over the lazy dog.
        This sentence has no scientific terms at all.
        Simple words and basic language throughout.
        """
        score = calculate_scientific_term_density(content, vocabulary)
        assert score < 0.5, f"Expected low scientific term density, got {score}"

    def test_calculate_scientific_term_density_empty_content(self) -> None:
        vocabulary = create_scientific_vocabulary()
        score = calculate_scientific_term_density("", vocabulary)
        assert score == 0.0, f"Empty content should score 0.0, got {score}"


class TestAcademicRegister:
    def test_assess_academic_register_formal_writing(self) -> None:
        content = """
        The research methodology was systematically developed to examine biomarker efficacy.
        Data were analyzed using sophisticated statistical techniques, which revealed
        significant correlations between variables. Furthermore, the findings suggest
        that additional investigation may be warranted to validate these preliminary results.
        """
        score = assess_academic_register(content)
        assert score > 0.4, f"Expected good academic register score, got {score}"

    def test_assess_academic_register_informal_writing(self) -> None:
        content = """
        We're gonna look at some stuff. It's pretty cool and works great!
        The results are awesome and everyone loves them. Can't wait to see more!
        """
        score = assess_academic_register(content)
        assert score < 0.4, f"Expected low academic register score, got {score}"

    def test_assess_academic_register_empty_content(self) -> None:
        score = assess_academic_register("")
        assert score == 0.0, f"Empty content should score 0.0, got {score}"


class TestMethodologyLanguage:
    def test_detect_methodology_language_strong_methodology(self) -> None:
        content = """
        We will analyze samples using standardized protocols and measure expression levels.
        Statistical significance will be determined with p-values less than 0.05.
        The experimental design includes control groups and randomized assignments.
        """
        score = detect_methodology_language(content)
        assert score > 0.5, f"Expected good methodology score, got {score}"

    def test_detect_methodology_language_weak_methodology(self) -> None:
        content = """
        We will do some research and look at things.
        The results will be good and helpful for everyone.
        This approach is innovative and novel.
        """
        score = detect_methodology_language(content)
        assert score < 0.4, f"Expected low methodology score, got {score}"

    def test_detect_methodology_language_empty_content(self) -> None:
        score = detect_methodology_language("")
        assert score == 0.0, f"Empty content should score 0.0, got {score}"


class TestEvidenceBasedClaims:
    def test_analyze_evidence_based_claims_with_context(self) -> None:
        content = """
        Data show significant correlation between biomarker levels and disease progression.
        Studies reveal [1] that this methodology provides reliable results.
        According to recent research, the findings demonstrate clinical validity.
        """
        rag_context = [
            DocumentDTO(
                content="Research demonstrates correlation between biomarker levels and disease progression in clinical studies"
            ),
            DocumentDTO(
                content="Methodology validation shows reliable and reproducible results across patient populations"
            ),
        ]
        score = analyze_evidence_based_claims(content, rag_context)
        assert score >= 0.4, f"Expected good evidence score with context, got {score}"

    def test_analyze_evidence_based_claims_without_context(self) -> None:
        content = """
        Data show significant correlation between biomarker levels and disease progression.
        Studies reveal that this methodology provides reliable results.
        """
        rag_context: list[DocumentDTO] = []
        score = analyze_evidence_based_claims(content, rag_context)
        assert 0.3 <= score <= 0.8, f"Expected moderate evidence score without context, got {score}"

    def test_analyze_evidence_based_claims_no_evidence(self) -> None:
        content = """
        We think this might work well.
        The approach seems promising and could be useful.
        """
        rag_context: list[DocumentDTO] = []
        score = analyze_evidence_based_claims(content, rag_context)
        assert score < 0.3, f"Expected low evidence score, got {score}"


class TestTechnicalPrecision:
    def test_assess_technical_precision_precise_content(self) -> None:
        content = """
        Protein concentrations were measured at 50 mg/mL using standardized protocols.
        The statistical analysis employed confidence intervals with p < 0.05 threshold.
        Sample size included 150 participants over 12 months duration.
        """
        score = assess_technical_precision(content)
        assert score > 0.5, f"Expected good precision score, got {score}"

    def test_assess_technical_precision_vague_content(self) -> None:
        content = """
        We measured some proteins at various concentrations using different methods.
        The analysis was quite good and showed really significant results.
        Many participants were included over several months.
        """
        score = assess_technical_precision(content)
        assert score < 0.4, f"Expected low precision score, got {score}"

    def test_assess_technical_precision_empty_content(self) -> None:
        score = assess_technical_precision("")
        assert score == 0.0, f"Empty content should score 0.0, got {score}"


class TestHypothesisMethodologyAlignment:
    def test_assess_hypothesis_methodology_alignment_good_alignment(self) -> None:
        content = """
        We hypothesize that biomarker X correlates with disease progression.
        To test this hypothesis, we will measure biomarker levels in patient samples.
        Statistical analysis will determine correlation coefficients and significance.
        """
        score = assess_hypothesis_methodology_alignment(content)
        assert score > 0.6, f"Expected good alignment score, got {score}"

    def test_assess_hypothesis_methodology_alignment_poor_alignment(self) -> None:
        content = """
        We hypothesize that biomarker X correlates with disease progression.
        Our approach will involve innovative techniques and novel methods.
        The results will be groundbreaking and transformative.
        """
        score = assess_hypothesis_methodology_alignment(content)
        assert score < 0.5, f"Expected low alignment score, got {score}"

    def test_assess_hypothesis_methodology_alignment_no_hypothesis(self) -> None:
        content = """
        We will analyze biomarker data using statistical methods.
        The research involves systematic measurement and evaluation.
        """
        score = assess_hypothesis_methodology_alignment(content)
        assert score == 0.5, f"Content without hypothesis should score 0.5, got {score}"


class TestScientificQualityAdvanced:
    @pytest.mark.asyncio
    async def test_evaluate_scientific_quality_high_quality(self) -> None:
        content = """
        # Biomarker Analysis Methodology

        This research employs systematic analysis of protein biomarkers using standardized protocols.
        The methodology involves rigorous statistical analysis with p-values < 0.05 significance threshold.
        Experimental design includes randomized control groups and blinded assessment procedures.

        We hypothesize that biomarker expression correlates with disease progression markers.
        To test this hypothesis, we will measure protein concentrations using mass spectrometry.
        Statistical analysis will determine correlation coefficients and clinical significance.

        According to previous studies [1], this approach demonstrates reliable and reproducible results.
        Data show significant correlation between molecular indicators and diagnostic outcomes.
        """

        rag_context = [
            DocumentDTO(content="Standardized protocols for biomarker analysis demonstrate reliable results"),
            DocumentDTO(content="Mass spectrometry provides accurate protein concentration measurements"),
        ]

        section_config = GrantLongFormSection(
            id="methodology",
            title="Research Methodology",
            order=1,
            parent_id=None,
            depends_on=[],
            generation_instructions="Describe research methodology",
            is_clinical_trial=False,
            is_detailed_research_plan=True,
            keywords=["biomarker", "methodology", "analysis"],
            max_words=500,
            search_queries=["biomarker analysis"],
            topics=["research methods"],
        )

        result = await evaluate_scientific_quality(content, rag_context, section_config)

        assert result["overall"] > 0.5, f"Expected good overall quality, got {result['overall']}"
        assert result["term_density"] > 0.5
        assert result["methodology_language_score"] > 0.5
        assert result["academic_register_score"] >= 0.3
        assert result["technical_precision"] > 0.4
        assert result["evidence_based_claims_ratio"] > 0.3
        assert 0.0 <= result["hypothesis_methodology_alignment"] <= 1.0

    @pytest.mark.asyncio
    async def test_evaluate_scientific_quality_clinical_trial_weighting(self) -> None:
        content = """
        The clinical trial demonstrates significant efficacy of the biomarker panel.
        Evidence shows [1] correlation with patient outcomes according to published studies.
        Precise measurements of 25 mg/mL protein concentrations were obtained.
        Statistical significance was achieved with p < 0.01 in all analyses.
        """

        rag_context = [DocumentDTO(content="Clinical trials demonstrate biomarker efficacy in patient populations")]

        section_config = GrantLongFormSection(
            id="clinical_results",
            title="Clinical Results",
            order=1,
            parent_id=None,
            depends_on=[],
            generation_instructions="Describe clinical trial results",
            is_clinical_trial=True,
            is_detailed_research_plan=False,
            keywords=["clinical", "trial", "results"],
            max_words=300,
            search_queries=["clinical trial results"],
            topics=["clinical outcomes"],
        )

        result = await evaluate_scientific_quality(content, rag_context, section_config)

        assert result["evidence_based_claims_ratio"] >= 0.2, (
            f"Expected some evidence-based claims, got {result['evidence_based_claims_ratio']}"
        )
        assert result["technical_precision"] >= 0.3, (
            f"Expected decent technical precision, got {result['technical_precision']}"
        )
        assert result["overall"] >= 0.3, f"Expected reasonable overall quality, got {result['overall']}"

    @pytest.mark.asyncio
    async def test_evaluate_scientific_quality_empty_content(self) -> None:
        rag_context: list[DocumentDTO] = []

        section_config = GrantLongFormSection(
            id="test",
            title="Test",
            order=1,
            parent_id=None,
            depends_on=[],
            generation_instructions="Test",
            is_clinical_trial=False,
            is_detailed_research_plan=False,
            keywords=[],
            max_words=100,
            search_queries=[],
            topics=[],
        )

        result = await evaluate_scientific_quality("", rag_context, section_config)

        assert result["overall"] == 0.0, f"Empty content should score 0.0, got {result['overall']}"
        assert all(score == 0.0 for score in result.values()), "All scores should be 0.0 for empty content"
