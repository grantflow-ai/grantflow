import textwrap

import pytest
from packages.db.src.json_objects import GrantLongFormSection

from services.rag.src.utils.evaluation.text.structure import (
    analyze_paragraph_structure,
    assess_academic_formatting,
    check_section_organization,
    evaluate_header_structure,
    evaluate_structure,
    evaluate_word_count_compliance,
)

WORD_LIMIT = 10


class TestWordCountCompliance:
    def test_evaluate_word_count_compliance_within_limit(self) -> None:
        content = "This is a test content with exactly ten words total."
        score = evaluate_word_count_compliance(content, WORD_LIMIT)
        assert score > 0.6, f"Expected high compliance score, got {score}"

    def test_evaluate_word_count_compliance_at_limit(self) -> None:
        content = "This content has exactly ten words in total here."
        score = evaluate_word_count_compliance(content, WORD_LIMIT)
        assert score >= 0.9, f"Content at limit should score high, got {score}"

    def test_evaluate_word_count_compliance_over_limit(self) -> None:
        content = " ".join(["word"] * 20)
        score = evaluate_word_count_compliance(content, WORD_LIMIT)
        assert score < 0.5, f"Expected low compliance score for excess, got {score}"

    def test_evaluate_word_count_compliance_no_limit(self) -> None:
        content = "This content has no word limit restrictions."
        max_words = None
        score = evaluate_word_count_compliance(content, max_words)
        assert score == 1.0, f"No limit should score 1.0, got {score}"

    def test_evaluate_word_count_compliance_empty_content(self) -> None:
        content = ""
        score = evaluate_word_count_compliance(content, WORD_LIMIT)
        assert score == 0.0, f"Empty content should score 0.0, got {score}"


class TestParagraphStructure:
    def test_analyze_paragraph_structure_well_structured(self) -> None:
        content = """
        This is the first paragraph with substantial content that provides
        meaningful information about the research topic and methodology.

        This is the second paragraph that continues the discussion with
        additional details and supporting information for the research.

        The third paragraph concludes the section with summary points
        and transitions to the next major topic or section.
        """
        score = analyze_paragraph_structure(content)
        assert score >= 0.5, f"Expected good structure score, got {score}"

    def test_analyze_paragraph_structure_poor_structure(self) -> None:
        content = """
        Short.

        Also short.

        Very short paragraph here too.

        Another brief one.

        Still short content here as well.
        """
        score = analyze_paragraph_structure(content)
        assert score <= 0.5, f"Expected low structure score, got {score}"

    def test_analyze_paragraph_structure_single_paragraph(self) -> None:
        content = "This is a single long paragraph with substantial content that discusses the research methodology and approaches in detail."
        score = analyze_paragraph_structure(content)
        assert score < 0.6, f"Single paragraph should have moderate score, got {score}"

    def test_analyze_paragraph_structure_empty_content(self) -> None:
        score = analyze_paragraph_structure("")
        assert score == 0.0, f"Empty content should score 0.0, got {score}"


class TestSectionOrganization:
    def test_check_section_organization_well_organized(self) -> None:
        content = """
        # Research Methodology

        ## Data Collection

        The data collection phase involves systematic sampling procedures.

        ## Analysis Framework

        The analysis employs statistical methods for pattern recognition.

        ### Statistical Methods

        Advanced computational techniques enable comprehensive analysis.

        ## Results Interpretation

        Results are interpreted using established clinical criteria.
        """
        score = check_section_organization(content)
        assert score > 0.6, f"Expected good organization score, got {score}"

    def test_check_section_organization_poor_organization(self) -> None:
        content = """
        Some random text without any structure or organization.
        More unstructured content that lacks clear sections.
        Additional text with no logical flow or hierarchy.
        """
        score = check_section_organization(content)
        assert score < 0.3, f"Expected low organization score, got {score}"

    def test_check_section_organization_partial_structure(self) -> None:
        content = """
        # Main Title

        Some content under the main title without subsections.
        More content that continues without clear structure.

        ## One Subsection

        This has a subsection but limited organization overall.
        """
        score = check_section_organization(content)
        assert 0.0 <= score <= 0.4, f"Expected low organization score for poor content, got {score}"

    def test_check_section_organization_empty_content(self) -> None:
        score = check_section_organization("")
        assert score == 0.0, f"Empty content should score 0.0, got {score}"


class TestAcademicFormatting:
    def test_assess_academic_formatting_well_formatted(self) -> None:
        content = """
        # Research Methodology

        The research employs systematic analysis of biomarkers (n=150) with statistical
        significance determined at p < 0.05. Protein concentrations were measured at
        25 mg/mL using standardized protocols [1, 2].

        ## Data Analysis

        * Statistical analysis using SPSS
        * Correlation coefficients calculated
        * Confidence intervals at 95%

        **Important findings:**
        1. Significant correlation observed
        2. Clinical relevance demonstrated
        3. Reproducible results achieved
        """
        score = assess_academic_formatting(content)
        assert score > 0.3, f"Expected good formatting score, got {score}"

    def test_assess_academic_formatting_poor_formatting(self) -> None:
        content = """
        research methodology
        the research uses some analysis of things and stuff
        we found some results that were good
        the data shows interesting patterns
        """
        score = assess_academic_formatting(content)
        assert score < 0.4, f"Expected low formatting score, got {score}"

    def test_assess_academic_formatting_mixed_formatting(self) -> None:
        content = """
        # Research Methodology

        The research involves analysis of data. Some findings are important.
        We used statistical methods for analysis.

        * One bullet point
        * Another point here

        Results show significance.
        """
        score = assess_academic_formatting(content)
        assert 0.2 <= score <= 0.7, f"Expected moderate formatting score, got {score}"

    def test_assess_academic_formatting_empty_content(self) -> None:
        score = assess_academic_formatting("")
        assert score == 0.0, f"Empty content should score 0.0, got {score}"


class TestHeaderStructure:
    def test_evaluate_header_structure_good_hierarchy(self) -> None:
        content = """
        # Main Research Title

        ## Methodology Section

        ### Data Collection Procedures

        #### Sampling Protocol

        ## Results Analysis

        ### Statistical Methods

        #### Correlation Analysis

        ## Discussion

        ### Clinical Implications
        """
        score = evaluate_header_structure(content)
        assert 0.0 <= score <= 0.6, f"Expected moderate header score for decent hierarchy, got {score}"

    def test_evaluate_header_structure_poor_hierarchy(self) -> None:
        content = """
        #### Starting with H4

        ## Then H2

        ##### Then H5

        # Back to H1

        ### Random H3
        """
        score = evaluate_header_structure(content)
        assert score < 0.4, f"Expected low header score, got {score}"

    def test_evaluate_header_structure_no_headers(self) -> None:
        content = """
        This content has no headers at all.
        Just plain text throughout the document.
        No structural hierarchy is present.
        """
        score = evaluate_header_structure(content)
        assert score == 0.0, f"No headers should score 0.0, got {score}"

    def test_evaluate_header_structure_single_level(self) -> None:
        content = """
        ## Introduction

        ## Methodology

        ## Results

        ## Discussion
        """
        score = evaluate_header_structure(content)
        assert 0.0 <= score <= 0.7, f"Expected decent header score for simple but clean hierarchy, got {score}"


class TestStructureAdvanced:
    @pytest.mark.asyncio
    async def test_evaluate_structure_high_quality(self) -> None:
        content = textwrap.dedent("""
        # Research Methodology

        ## Data Collection Framework

        The systematic data collection employs standardized protocols for biomarker
        analysis (n=150 participants). Statistical significance is determined at
        p < 0.05 using established clinical criteria [1, 2].

        ### Sampling Procedures

        Participants are recruited through randomized selection protocols:

        1. Initial screening assessment
        2. Eligibility confirmation process
        3. Informed consent procedures

        ## Analysis Framework

        ### Statistical Methods

        Advanced computational techniques enable comprehensive pattern recognition:

        * Correlation analysis using Pearson coefficients
        * Multivariate regression modeling
        * Bootstrap confidence intervals (95%)

        **Key Parameters:**
        - Sample size: 150 participants
        - Duration: 12 months
        - Measurements: 25 mg/mL protein concentrations

        ## Results Interpretation

        Clinical significance is evaluated using established diagnostic criteria
        with emphasis on reproducibility and reliability metrics.
        """).strip()

        section_config = GrantLongFormSection(
            id="methodology",
            title="Research Methodology",
            order=1,
            evidence="CFP evidence for Research Methodology",
            parent_id=None,
            depends_on=[],
            generation_instructions="Describe methodology",
            is_clinical_trial=False,
            is_detailed_research_plan=True,
            keywords=["methodology", "analysis"],
            length_constraint={"type": "words", "value": 400, "source": None},
            search_queries=["research methodology"],
            topics=["research methods"],
        )

        result = await evaluate_structure(content, section_config)

        assert result["overall"] > 0.4, f"Expected good overall structure, got {result['overall']}"
        assert result["word_count_compliance"] > 0.2, (
            f"Expected reasonable word count compliance, got {result['word_count_compliance']}"
        )
        assert result["paragraph_distribution"] > 0.3, (
            f"Expected good paragraph distribution, got {result['paragraph_distribution']}"
        )
        assert result["section_organization"] > 0.6, (
            f"Expected good section organization, got {result['section_organization']}"
        )
        assert result["academic_formatting"] > 0.3, (
            f"Expected good academic formatting, got {result['academic_formatting']}"
        )
        assert result["header_structure"] >= 0.3, (
            f"Expected reasonable header structure for well-formatted content, got {result['header_structure']}"
        )

    @pytest.mark.asyncio
    async def test_evaluate_structure_poor_quality(self) -> None:
        content = """
        bad writing here
        no structure at all just random text
        more random content without organization
        some data and results mixed together
        no clear sections or formatting
        """

        section_config = GrantLongFormSection(
            id="test",
            title="Test Section",
            order=1,
            evidence="CFP evidence for Test Section",
            parent_id=None,
            depends_on=[],
            generation_instructions="Test",
            is_clinical_trial=False,
            is_detailed_research_plan=False,
            keywords=[],
            length_constraint={"type": "words", "value": 50, "source": None},
            search_queries=[],
            topics=[],
        )

        result = await evaluate_structure(content, section_config)

        assert result["overall"] < 0.4, f"Expected low overall structure, got {result['overall']}"
        assert result["section_organization"] < 0.3, f"Expected low organization, got {result['section_organization']}"
        assert result["academic_formatting"] < 0.4, f"Expected low formatting, got {result['academic_formatting']}"
        assert result["header_structure"] == 0.0, f"Expected no header structure, got {result['header_structure']}"

    @pytest.mark.asyncio
    async def test_evaluate_structure_word_count_exceeded(self) -> None:
        content = "This is a test sentence with ten words exactly. " * 20

        section_config = GrantLongFormSection(
            id="test",
            title="Test Section",
            order=1,
            evidence="CFP evidence for Test Section",
            parent_id=None,
            depends_on=[],
            generation_instructions="Test",
            is_clinical_trial=False,
            is_detailed_research_plan=False,
            keywords=[],
            length_constraint={"type": "words", "value": 100, "source": None},
            search_queries=[],
            topics=[],
        )

        result = await evaluate_structure(content, section_config)

        assert result["word_count_compliance"] < 0.6, (
            f"Expected low word count compliance, got {result['word_count_compliance']}"
        )

    @pytest.mark.asyncio
    async def test_evaluate_structure_empty_content(self) -> None:
        section_config = GrantLongFormSection(
            id="test",
            title="Test Section",
            order=1,
            evidence="CFP evidence for Test Section",
            parent_id=None,
            depends_on=[],
            generation_instructions="Test",
            is_clinical_trial=False,
            is_detailed_research_plan=False,
            keywords=[],
            length_constraint={"type": "words", "value": 100, "source": None},
            search_queries=[],
            topics=[],
        )

        result = await evaluate_structure("", section_config)

        assert result["overall"] == 0.0, f"Empty content should score 0.0, got {result['overall']}"
        assert all(score == 0.0 for score in result.values()), "All scores should be 0.0 for empty content"
