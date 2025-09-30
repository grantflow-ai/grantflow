from typing import TYPE_CHECKING

from services.rag.src.utils.evaluation.json.enrichment import (
    check_enrichment_completeness,
    evaluate_enrichment_quality,
)

if TYPE_CHECKING:
    from services.rag.src.dto import EnrichmentData


class TestEnrichmentQualityEvaluation:
    def test_evaluate_enrichment_quality_high_quality(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": [
                "liquid chromatography-tandem mass spectrometry (LC-MS/MS)",
                "stable isotope standards (SIS)",
                "targeted proteomics",
                "ion transitions",
                "liquid biopsy",
                "immunoaffinity enrichment",
                "multiplexed protein analysis",
                "analytical performance metrics",
            ],
            "research_questions": [
                "How can liquid chromatography-tandem mass spectrometry improve cancer biomarker detection sensitivity and specificity?",
                "What are the critical analytical performance metrics required for clinical validation of targeted proteomics assays?",
                "Can stable isotope standards provide sufficient precision for quantitative biomarker analysis in clinical samples?",
                "How does immunoaffinity enrichment compare to traditional immunoassays for biomarker quantification?",
                "What quality assurance protocols are necessary for multi-laboratory reproducibility of targeted proteomics methods?",
            ],
            "context": """
            This research aims to establish a comprehensive targeted proteomics workflow for cancer biomarker
            validation using liquid chromatography-tandem mass spectrometry (LC-MS/MS). The study focuses on
            developing clinically applicable assays that can overcome current limitations in biomarker translation
            from discovery to clinical implementation.

            The methodology employs stable isotope standards (SIS) for precise protein quantification, coupled
            with immunoaffinity enrichment techniques to improve sensitivity for low-abundance biomarkers in
            complex biological matrices. Our approach addresses the critical gap between biomarker discovery
            and clinical validation by implementing robust analytical performance metrics and quality assurance
            programs.

            The workflow includes systematic sample preparation, protein/peptide extraction, optional depletion/
            enrichment steps, enzymatic digestion, liquid chromatography separation, and mass spectrometry
            analysis with quantification using stable isotope labeling. Expected outcomes include development
            of FDA-ready assays with demonstrated reproducibility across multiple laboratories, analytical
            sensitivity of <1 ng/mL, and coefficient of variation <15% for clinical biomarker quantification.

            Clinical validation strategies encompass establishing analytical performance metrics, developing
            robust method validation protocols, implementing quality assurance programs, and demonstrating
            superior performance compared to existing immunoassays for cancer biomarker detection.
            """,
            "search_queries": [
                '"liquid chromatography tandem mass spectrometry" AND "cancer biomarkers" AND clinical validation',
                '"stable isotope standards" OR SIS AND "protein quantification" AND FDA approval',
                '"targeted proteomics" AND "immunoaffinity enrichment" AND analytical performance metrics',
                '"LC-MS/MS" AND "quality assurance" AND "multi-laboratory reproducibility" AND clinical',
                '"biomarker validation" AND "FDA approval" AND "targeted proteomics" AND pharmaceutical',
            ],
        }

        keywords = ["LC-MS/MS", "targeted proteomics", "biomarker", "clinical validation", "mass spectrometry"]
        topics = ["analytical chemistry", "clinical proteomics", "cancer biomarkers", "FDA validation"]

        result = evaluate_enrichment_quality(enrichment_data, keywords, topics)

        assert result["overall"] > 0.7, f"Expected high overall quality, got {result['overall']}"
        assert result["value_added"] > 0.8
        assert result["term_relevance"] > 0.6
        assert result["question_utility"] > 0.7
        assert result["context_depth"] > 0.6
        assert result["search_query_quality"] > 0.6

    def test_evaluate_enrichment_quality_with_keyword_alignment(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": [
                "biomarker analysis",
                "cancer progression",
                "clinical validation",
            ],
            "research_questions": [
                "How do biomarkers relate to cancer outcomes?",
                "What is the clinical significance of these findings?",
            ],
            "context": "Research on biomarker analysis for cancer diagnosis and clinical applications.",
            "search_queries": [
                "biomarker cancer clinical",
                "diagnostic validation methods",
            ],
        }

        keywords = ["biomarker", "cancer", "clinical"]
        result_with_keywords = evaluate_enrichment_quality(enrichment_data, keywords, None)

        result_without_keywords = evaluate_enrichment_quality(enrichment_data, None, None)

        assert result_with_keywords["term_relevance"] > result_without_keywords["term_relevance"]
        assert result_with_keywords["overall"] >= result_without_keywords["overall"]

    def test_evaluate_enrichment_quality_poor_quality(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": ["x", "y"],
            "research_questions": ["zzz", "aaa"],
            "context": "Research.",
            "search_queries": ["a", "b"],
        }

        result = evaluate_enrichment_quality(enrichment_data, None, None)

        assert result["overall"] < 0.4, f"Expected low overall quality, got {result['overall']}"
        assert result["value_added"] <= 0.5
        assert result["term_relevance"] < 0.3
        assert result["question_utility"] < 0.4
        assert result["context_depth"] < 0.3

    def test_evaluate_enrichment_quality_empty_data(self) -> None:
        result = evaluate_enrichment_quality({}, None, None)

        assert result["overall"] == 0.0
        assert result["value_added"] == 0.0
        assert result["term_relevance"] == 0.0
        assert result["question_utility"] == 0.0
        assert result["context_depth"] == 0.0
        assert result["search_query_quality"] == 0.0

    def test_evaluate_enrichment_quality_scientific_terms(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": [
                "protein-protein interactions",
                "enzymatic pathway analysis",
                "receptor-mediated signaling",
                "gene expression profiling",
            ],
            "research_questions": [
                "How do protein interactions affect cellular pathways?",
                "What role do enzymes play in metabolic regulation?",
            ],
            "context": "Research methodology involves systematic analysis of molecular interactions.",
            "search_queries": [
                "protein interactions analysis",
                "enzymatic pathway regulation",
            ],
        }

        result = evaluate_enrichment_quality(enrichment_data, None, None)

        assert result["term_relevance"] > 0.5, "Should recognize scientific terminology"
        assert result["overall"] > 0.5

    def test_evaluate_enrichment_quality_good_questions(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": ["biomarker", "analysis"],
            "research_questions": [
                "How do biomarker levels correlate with disease severity in patients?",
                "What factors influence biomarker expression patterns?",
                "Which analytical methods provide the most reliable results?",
            ],
            "context": "Research on biomarker analysis methodology.",
            "search_queries": ["biomarker correlation analysis"],
        }

        result = evaluate_enrichment_quality(enrichment_data, None, None)

        assert result["question_utility"] > 0.6, "Should recognize well-formed questions"

    def test_evaluate_enrichment_quality_rich_context(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": ["biomarker", "analysis"],
            "research_questions": ["How do biomarkers work?"],
            "context": """
            This comprehensive research study involves systematic analysis of biomarker expression
            patterns using advanced mass spectrometry techniques. The methodology includes rigorous
            statistical analysis with appropriate controls and validation procedures.

            Previous studies have demonstrated the importance of biomarker-based diagnostics,
            with evidence showing improved patient outcomes (Smith et al., 2022). Our approach
            builds upon established research methodologies while incorporating novel analytical
            techniques to enhance detection sensitivity.

            The experimental design includes randomized sample collection, blinded analysis
            procedures, and comprehensive statistical evaluation using appropriate hypothesis
            testing methods. Expected findings include identification of clinically relevant
            biomarkers with strong predictive value for patient outcomes.
            """,
            "search_queries": ["biomarker analysis methodology"],
        }

        result = evaluate_enrichment_quality(enrichment_data, None, None)

        assert result["context_depth"] > 0.7, "Should recognize rich contextual content"

    def test_evaluate_enrichment_quality_diverse_queries(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": ["biomarker"],
            "research_questions": ["How do biomarkers work?"],
            "context": "Research on biomarkers.",
            "search_queries": [
                '"biomarker expression" AND "cancer progression" OR metastasis',
                '"protein biomarkers" AND diagnostic AND "clinical applications"',
                '"mass spectrometry" AND "biomarker quantification" AND validation',
                '"clinical validation" OR "biomarker assays" AND FDA AND approval',
                '"targeted proteomics" AND "analytical performance" AND "reproducibility"',
            ],
        }

        result = evaluate_enrichment_quality(enrichment_data, None, None)

        assert result["search_query_quality"] > 0.55, "Should recognize diverse, well-formed queries"


class TestEnrichmentCompleteness:
    def test_check_enrichment_completeness_complete(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": ["term1", "term2", "term3", "term4"],
            "research_questions": ["Question 1?", "Question 2?", "Question 3?"],
            "context": "Detailed context with sufficient information about the research methodology and background.",
            "search_queries": ["query1", "query2", "query3"],
        }

        result = check_enrichment_completeness(enrichment_data)

        assert result["has_enrichment"] is True
        assert result["has_technical_terms"] is True
        assert result["has_research_questions"] is True
        assert result["has_context"] is True
        assert result["has_search_queries"] is True
        assert result["minimum_terms"] is True
        assert result["minimum_questions"] is True

    def test_check_enrichment_completeness_incomplete(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": ["term1", "term2"],
            "research_questions": ["Question 1?"],
            "context": "",
        }

        result = check_enrichment_completeness(enrichment_data)

        assert result["has_enrichment"] is True
        assert result["has_technical_terms"] is True
        assert result["has_research_questions"] is True
        assert result["has_context"] is False
        assert result["has_search_queries"] is False
        assert result["minimum_terms"] is False
        assert result["minimum_questions"] is False

    def test_check_enrichment_completeness_empty(self) -> None:
        result = check_enrichment_completeness({})

        assert result["has_enrichment"] is False
        assert result["has_technical_terms"] is False
        assert result["has_research_questions"] is False
        assert result["has_context"] is False
        assert result["has_search_queries"] is False
        assert result["minimum_terms"] is False
        assert result["minimum_questions"] is False

    def test_check_enrichment_completeness_partial_fields(self) -> None:
        enrichment_data: EnrichmentData = {
            "technical_terms": ["term1", "term2", "term3"],
            "context": "Some context information",
        }

        result = check_enrichment_completeness(enrichment_data)

        assert result["has_enrichment"] is True
        assert result["has_technical_terms"] is True
        assert result["has_research_questions"] is False
        assert result["has_context"] is True
        assert result["has_search_queries"] is False
        assert result["minimum_terms"] is True
        assert result["minimum_questions"] is False
