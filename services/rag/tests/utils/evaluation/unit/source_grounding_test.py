import pytest
from packages.db.src.json_objects import GrantLongFormSection

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.text.grounding import (
    analyze_content_source_overlap,
    assess_context_citation_density,
    calculate_keyword_coverage,
    calculate_rouge_based_grounding,
    calculate_search_query_integration,
    evaluate_source_grounding,
)


class TestRougeBasedGrounding:
    def test_calculate_rouge_based_grounding_high_overlap(self) -> None:
        content = "Biomarker research demonstrates significant correlation with disease progression markers."
        rag_context = [
            DocumentDTO(content="Biomarker analysis shows strong correlation with disease progression indicators"),
            DocumentDTO(content="Research findings demonstrate biomarker efficacy in clinical applications"),
        ]

        result = calculate_rouge_based_grounding(content, rag_context)

        assert result["rouge_l_score"] > 0.2, f"Expected decent ROUGE-L score, got {result['rouge_l_score']}"
        assert result["max_similarity"] > 0.0, f"Expected positive max similarity, got {result['max_similarity']}"
        assert 0.0 <= result["avg_similarity"] <= 1.0, f"Average similarity out of range: {result['avg_similarity']}"

    def test_calculate_rouge_based_grounding_no_overlap(self) -> None:
        content = "The weather today is sunny and warm with clear skies."
        rag_context = [
            DocumentDTO(content="Biomarker analysis shows correlation with disease progression"),
            DocumentDTO(content="Clinical research demonstrates protein expression patterns"),
        ]

        result = calculate_rouge_based_grounding(content, rag_context)

        assert result["rouge_l_score"] < 0.15, f"Expected low ROUGE-L score, got {result['rouge_l_score']}"
        assert result["max_similarity"] < 0.15, f"Expected low max similarity, got {result['max_similarity']}"

    def test_calculate_rouge_based_grounding_empty_context(self) -> None:
        content = "Biomarker research demonstrates significant findings."
        rag_context: list[DocumentDTO] = []

        result = calculate_rouge_based_grounding(content, rag_context)

        assert result["rouge_l_score"] == 0.0, f"Empty context should give 0 ROUGE-L, got {result['rouge_l_score']}"
        assert result["max_similarity"] == 0.0, (
            f"Empty context should give 0 max similarity, got {result['max_similarity']}"
        )
        assert result["avg_similarity"] == 0.0, (
            f"Empty context should give 0 avg similarity, got {result['avg_similarity']}"
        )

    def test_calculate_rouge_based_grounding_empty_content_in_context(self) -> None:
        content = "Biomarker research demonstrates significant findings."
        rag_context = [
            DocumentDTO(content=""),
            DocumentDTO(content="   "),
        ]

        result = calculate_rouge_based_grounding(content, rag_context)

        assert result["rouge_l_score"] == 0.0
        assert result["max_similarity"] == 0.0
        assert result["avg_similarity"] == 0.0


class TestKeywordCoverage:
    def test_calculate_keyword_coverage_full_coverage(self) -> None:
        content = "The biomarker analysis methodology involves systematic protein expression research."
        keywords = ["biomarker", "analysis", "methodology", "protein"]

        coverage = calculate_keyword_coverage(content, keywords)
        assert coverage > 0.6, f"Expected good keyword coverage, got {coverage}"

    def test_calculate_keyword_coverage_partial_coverage(self) -> None:
        content = "The research methodology involves systematic analysis of data."
        keywords = ["biomarker", "protein", "expression", "methodology"]

        coverage = calculate_keyword_coverage(content, keywords)
        assert 0.2 <= coverage <= 0.6, f"Expected partial keyword coverage, got {coverage}"

    def test_calculate_keyword_coverage_no_coverage(self) -> None:
        content = "The weather today is sunny and warm."
        keywords = ["biomarker", "protein", "expression", "methodology"]

        coverage = calculate_keyword_coverage(content, keywords)
        assert coverage == 0.0, f"Expected zero keyword coverage, got {coverage}"

    def test_calculate_keyword_coverage_empty_keywords(self) -> None:
        content = "The research methodology involves analysis."
        keywords: list[str] = []

        coverage = calculate_keyword_coverage(content, keywords)
        assert coverage == 1.0, f"Empty keywords should give 1.0 coverage, got {coverage}"

    def test_calculate_keyword_coverage_multi_word_keywords(self) -> None:
        content = "The protein expression analysis demonstrates biomarker efficacy."
        keywords = ["protein expression", "biomarker efficacy", "systematic analysis"]

        coverage = calculate_keyword_coverage(content, keywords)
        assert coverage > 0.4, f"Expected good coverage for multi-word keywords, got {coverage}"


class TestSearchQueryIntegration:
    def test_calculate_search_query_integration_good_integration(self) -> None:
        content = "Biomarker analysis methodology for protein expression research in clinical applications."
        search_queries = ["biomarker analysis", "protein expression", "clinical research"]

        integration = calculate_search_query_integration(content, search_queries)
        assert integration > 0.5, f"Expected good query integration, got {integration}"

    def test_calculate_search_query_integration_poor_integration(self) -> None:
        content = "The weather forecast predicts sunny skies and warm temperatures."
        search_queries = ["biomarker analysis", "protein expression", "clinical research"]

        integration = calculate_search_query_integration(content, search_queries)
        assert integration < 0.2, f"Expected low query integration, got {integration}"

    def test_calculate_search_query_integration_empty_queries(self) -> None:
        content = "Biomarker analysis methodology for research applications."
        search_queries: list[str] = []

        integration = calculate_search_query_integration(content, search_queries)
        assert integration == 1.0, f"Empty queries should give 1.0 integration, got {integration}"


class TestContextCitationDensity:
    def test_assess_context_citation_density_with_verified_citations(self) -> None:
        content = """
        According to recent studies [1], biomarker analysis demonstrates efficacy.
        Research indicates that protein expression correlates with disease progression.
        As reported by clinical trials, the methodology provides reliable results.
        """
        rag_context = [
            DocumentDTO(content="Studies demonstrate biomarker analysis efficacy in clinical settings"),
            DocumentDTO(content="Research shows protein expression correlation with disease progression markers"),
        ]

        density = assess_context_citation_density(content, rag_context)
        assert density > 0.3, f"Expected good citation density with verification, got {density}"

    def test_assess_context_citation_density_citations_without_context(self) -> None:
        content = """
        According to recent studies [1], biomarker analysis demonstrates efficacy.
        Research indicates significant findings in the literature [2].
        """
        rag_context: list[DocumentDTO] = []

        density = assess_context_citation_density(content, rag_context)
        assert 0.3 <= density <= 0.8, f"Expected moderate citation density without context, got {density}"

    def test_assess_context_citation_density_no_citations(self) -> None:
        content = "The research methodology involves systematic analysis of biomarkers."
        rag_context = [DocumentDTO(content="Biomarker research demonstrates clinical efficacy")]

        density = assess_context_citation_density(content, rag_context)
        assert density == 0.0, f"Expected zero citation density, got {density}"


class TestContentSourceOverlap:
    def test_analyze_content_source_overlap_high_overlap(self) -> None:
        content = "Systematic biomarker analysis methodology for protein expression research."
        rag_context = [
            DocumentDTO(content="Biomarker analysis employs systematic methodology for protein research"),
            DocumentDTO(content="Protein expression analysis utilizes systematic biomarker methodology"),
        ]

        overlap = analyze_content_source_overlap(content, rag_context)

        assert overlap["exact_phrase_overlap"] > 0.05, f"Expected phrase overlap, got {overlap['exact_phrase_overlap']}"
        assert overlap["unique_content_ratio"] < 0.8, f"Expected low uniqueness, got {overlap['unique_content_ratio']}"

    def test_analyze_content_source_overlap_no_overlap(self) -> None:
        content = "Weather forecast predicts sunny skies and warm temperatures today."
        rag_context = [
            DocumentDTO(content="Biomarker analysis demonstrates clinical research efficacy"),
            DocumentDTO(content="Protein expression correlates with disease progression markers"),
        ]

        overlap = analyze_content_source_overlap(content, rag_context)

        assert overlap["exact_phrase_overlap"] < 0.1, (
            f"Expected no phrase overlap, got {overlap['exact_phrase_overlap']}"
        )
        assert overlap["unique_content_ratio"] > 0.9, f"Expected high uniqueness, got {overlap['unique_content_ratio']}"

    def test_analyze_content_source_overlap_empty_context(self) -> None:
        content = "Biomarker analysis methodology for research applications."
        rag_context: list[DocumentDTO] = []

        overlap = analyze_content_source_overlap(content, rag_context)

        assert overlap["exact_phrase_overlap"] == 0.0
        assert overlap["semantic_concept_overlap"] == 0.0
        assert overlap["unique_content_ratio"] == 1.0


class TestSourceGroundingAdvanced:
    @pytest.mark.asyncio
    async def test_evaluate_source_grounding_high_grounding(self) -> None:
        content = """
        # Biomarker Analysis Methodology

        According to recent studies [1], systematic biomarker analysis demonstrates significant
        correlation with disease progression markers. The methodology employs protein expression
        analysis using standardized protocols for clinical research applications.

        Research indicates that this approach provides reliable and reproducible results.
        Previous studies confirm the efficacy of biomarker-based diagnostic approaches.
        """

        rag_context = [
            DocumentDTO(
                content="Studies demonstrate biomarker analysis correlation with disease progression in clinical settings"
            ),
            DocumentDTO(
                content="Systematic methodology for protein expression analysis provides reliable research results"
            ),
            DocumentDTO(
                content="Standardized protocols enable reproducible biomarker analysis in clinical applications"
            ),
        ]

        section_config = GrantLongFormSection(
            id="methodology",
            title="Research Methodology",
            order=1,
            parent_id=None,
            depends_on=[],
            generation_instructions="Describe methodology",
            is_clinical_trial=False,
            is_detailed_research_plan=True,
            keywords=["biomarker", "analysis", "methodology", "protein"],
            max_words=500,
            search_queries=["biomarker analysis", "protein expression", "clinical research"],
            topics=["research methods"],
        )

        result = await evaluate_source_grounding(content, rag_context, section_config)

        assert result["overall"] > 0.3, f"Expected good overall grounding, got {result['overall']}"
        assert result["rouge_l_score"] > 0.1, f"Expected decent ROUGE-L score, got {result['rouge_l_score']}"
        assert result["keyword_coverage"] > 0.5, f"Expected good keyword coverage, got {result['keyword_coverage']}"
        assert result["search_query_integration"] > 0.4, (
            f"Expected good query integration, got {result['search_query_integration']}"
        )
        assert 0.0 <= result["context_citation_density"] <= 1.0

    @pytest.mark.asyncio
    async def test_evaluate_source_grounding_no_context(self) -> None:
        content = "Biomarker analysis methodology for research applications."
        rag_context: list[DocumentDTO] = []

        section_config = GrantLongFormSection(
            id="test",
            title="Test Section",
            order=1,
            parent_id=None,
            depends_on=[],
            generation_instructions="Test",
            is_clinical_trial=False,
            is_detailed_research_plan=False,
            keywords=["biomarker"],
            max_words=100,
            search_queries=["biomarker analysis"],
            topics=["research"],
        )

        result = await evaluate_source_grounding(content, rag_context, section_config)

        assert result["rouge_l_score"] == 0.0, f"No context should give 0 ROUGE-L, got {result['rouge_l_score']}"
        assert result["rouge_2_score"] == 0.0
        assert result["rouge_3_score"] == 0.0
        assert result["context_citation_density"] == 0.0
        assert 0.0 <= result["overall"] <= 0.35, (
            f"No context should result in low overall score, got {result['overall']}"
        )

    @pytest.mark.asyncio
    async def test_evaluate_source_grounding_empty_content(self) -> None:
        rag_context = [DocumentDTO(content="Biomarker research demonstrates clinical efficacy")]

        section_config = GrantLongFormSection(
            id="test",
            title="Test Section",
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

        result = await evaluate_source_grounding("", rag_context, section_config)

        assert result["overall"] == 0.0, f"Empty content should score 0.0, got {result['overall']}"
        assert all(score == 0.0 for score in result.values()), "All scores should be 0.0 for empty content"
