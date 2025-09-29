"""Integration tests for JSON evaluation with context passing."""

import pytest
from packages.db.src.json_objects import (
    CFPAnalysisResult,
    GrantLongFormSection,
    ResearchObjective,
)

from services.rag.src.dto import (
    CFPAnalysisData,
    DocumentDTO,
    EnrichmentData,
    RelationshipPair,
)
from services.rag.src.utils.evaluation.context_builder import (
    build_evaluation_context,
    build_evaluation_settings,
)
from services.rag.src.utils.evaluation.json.cfp_analysis import evaluate_cfp_analysis_quality
from services.rag.src.utils.evaluation.json.enrichment import evaluate_enrichment_quality
from services.rag.src.utils.evaluation.json.objectives import evaluate_objectives_quality
from services.rag.src.utils.evaluation.json.relationships import evaluate_relationships_quality


class TestJSONEvaluationIntegration:
    @pytest.mark.asyncio
    async def test_objectives_evaluation_with_context(self) -> None:
        """Test objectives evaluation with full context integration."""
        research_objectives = [
            ResearchObjective(
                number=1,
                title="Biomarker discovery for cancer diagnosis",
                description="Systematic identification and validation of protein biomarkers for early cancer detection using mass spectrometry analysis and clinical validation studies.",
                feasibility_analysis="Feasible with established mass spectrometry protocols and clinical partnerships for sample collection and validation studies.",
                innovation_score=8.5,
                research_questions=[
                    "Which protein biomarkers show the strongest correlation with early-stage cancer?",
                    "How do biomarker expression patterns differ across cancer subtypes?",
                    "What is the optimal combination of biomarkers for diagnostic accuracy?",
                ],
                methodology="Mass spectrometry-based proteomic analysis with statistical correlation studies and clinical validation",
                expected_outcomes="Identification of 3-5 biomarkers with >0.8 correlation coefficient and >90% diagnostic accuracy",
                timeline="24 months",
                resources_required="Mass spectrometry facility, clinical samples, bioinformatics analysis software",
            ),
            ResearchObjective(
                number=2,
                title="Clinical diagnostic assay development",
                description="Development of clinical-grade diagnostic assay based on identified biomarkers for rapid cancer screening applications.",
                feasibility_analysis="Well-established ELISA and immunoassay development capabilities with regulatory approval pathway experience.",
                innovation_score=7.2,
                research_questions=[
                    "What is the optimal assay format for clinical implementation?",
                    "How does assay performance compare to current diagnostic methods?",
                ],
                methodology="ELISA development, clinical validation, regulatory submission",
                expected_outcomes="FDA-approved diagnostic assay with >95% sensitivity and >90% specificity",
                timeline="36 months",
                resources_required="Assay development laboratory, clinical validation samples, regulatory expertise",
            ),
        ]

        section_config = GrantLongFormSection(
            id="objectives",
            title="Research Objectives",
            order=1,
            parent_id=None,
            depends_on=[],
            generation_instructions="Define research objectives",
            is_clinical_trial=False,
            is_detailed_research_plan=True,
            keywords=["biomarker", "cancer", "diagnosis", "clinical", "mass spectrometry"],
            max_words=800,
            search_queries=["biomarker cancer diagnosis", "clinical validation studies"],
            topics=["cancer research", "biomarker discovery", "clinical diagnostics"],
        )

        context = build_evaluation_context(
            section_config=section_config,
            research_objectives=research_objectives,
        )

        # Extract keywords and topics from context
        keywords = context["section_config"].keywords if "section_config" in context else None
        topics = context["section_config"].topics if "section_config" in context else None

        result = evaluate_objectives_quality(research_objectives, keywords, topics)

        assert result["overall"] > 0.7, f"Expected high overall quality with context, got {result['overall']}"
        assert result["keyword_alignment"] > 0.6, "Should have strong keyword alignment"
        assert result["scientific_rigor"] > 0.6, "Should have good scientific rigor"
        assert result["innovation_score"] > 0.7, "Should reflect high innovation scores"

    @pytest.mark.asyncio
    async def test_enrichment_evaluation_with_rag_context(self) -> None:
        """Test enrichment evaluation with RAG context integration."""
        enrichment_data: EnrichmentData = {
            "technical_terms": [
                "proteomics biomarker discovery",
                "mass spectrometry analysis",
                "clinical validation studies",
                "diagnostic accuracy assessment",
                "statistical correlation analysis",
            ],
            "research_questions": [
                "How do protein expression patterns correlate with cancer progression stages?",
                "Which mass spectrometry techniques provide optimal biomarker detection sensitivity?",
                "What statistical methods best validate biomarker diagnostic performance?",
            ],
            "context": """
            This research integrates advanced proteomic analysis with clinical validation to identify
            cancer biomarkers for early diagnostic applications. The methodology employs state-of-the-art
            mass spectrometry techniques combined with rigorous statistical analysis to ensure clinical
            relevance and diagnostic accuracy.

            Previous studies have established the foundation for proteomic biomarker discovery, demonstrating
            significant improvements in cancer detection when multiple biomarkers are analyzed simultaneously.
            Our approach builds upon these findings while incorporating novel analytical methods to enhance
            sensitivity and specificity for early-stage cancer detection.
            """,
            "search_queries": [
                "proteomics biomarker cancer discovery",
                "mass spectrometry clinical validation",
                "diagnostic accuracy statistical analysis",
                "early cancer detection biomarkers",
            ],
        }

        section_config = GrantLongFormSection(
            id="enrichment",
            title="Research Enrichment",
            order=1,
            parent_id=None,
            depends_on=[],
            generation_instructions="Enrich research content",
            is_clinical_trial=False,
            is_detailed_research_plan=True,
            keywords=["proteomics", "biomarker", "mass spectrometry", "clinical"],
            max_words=600,
            search_queries=["proteomics biomarker discovery"],
            topics=["cancer research", "clinical validation"],
        )

        rag_context = [
            DocumentDTO(content="Proteomic analysis enables comprehensive biomarker discovery for cancer diagnostics"),
            DocumentDTO(
                content="Mass spectrometry provides high-resolution protein analysis for clinical applications"
            ),
            DocumentDTO(content="Statistical validation ensures biomarker reliability in clinical diagnostic settings"),
        ]

        context = build_evaluation_context(
            section_config=section_config,
            rag_context=rag_context,
        )

        # Extract keywords and topics from context
        keywords = context["section_config"].keywords if "section_config" in context else None
        topics = context["section_config"].topics if "section_config" in context else None

        result = evaluate_enrichment_quality(enrichment_data, keywords, topics)

        assert result["overall"] > 0.7, f"Expected high overall quality with context, got {result['overall']}"
        assert result["term_relevance"] > 0.6, "Should have strong term relevance with keyword alignment"
        assert result["context_depth"] > 0.6, "Should recognize rich contextual content"
        assert result["search_query_quality"] > 0.6, "Should recognize well-formed search queries"

    @pytest.mark.asyncio
    async def test_relationships_evaluation_quality(self) -> None:
        """Test relationships evaluation with scientific content."""
        relationships = {
            "proteins": [
                RelationshipPair(relation_type="interacts_with", target_entity="tumor_suppressor_p53"),
                RelationshipPair(relation_type="regulates", target_entity="cell_cycle_checkpoint"),
                RelationshipPair(relation_type="phosphorylates", target_entity="downstream_kinase"),
                RelationshipPair(relation_type="activates", target_entity="DNA_repair_pathway"),
            ],
            "genes": [
                RelationshipPair(relation_type="codes_for", target_entity="oncogene_protein"),
                RelationshipPair(relation_type="mutated_in", target_entity="breast_cancer"),
                RelationshipPair(relation_type="expressed_in", target_entity="tumor_tissue"),
            ],
            "biomarkers": [
                RelationshipPair(relation_type="correlates_with", target_entity="disease_progression"),
                RelationshipPair(relation_type="predicts", target_entity="treatment_response"),
                RelationshipPair(relation_type="indicates", target_entity="prognosis"),
            ],
            "pathways": [
                RelationshipPair(relation_type="involves", target_entity="signal_transduction"),
                RelationshipPair(relation_type="regulates", target_entity="metabolic_process"),
            ],
        }

        result = evaluate_relationships_quality(relationships)

        assert result["overall"] > 0.7, (
            f"Expected high overall quality for scientific relationships, got {result['overall']}"
        )
        assert result["validity"] > 0.8, "Should recognize scientific terminology"
        assert result["coverage"] > 0.7, "Should have good category coverage"
        assert result["diversity"] > 0.6, "Should have diverse relationship types"

    @pytest.mark.asyncio
    async def test_cfp_analysis_evaluation_comprehensive(self) -> None:
        """Test CFP analysis evaluation with comprehensive data."""
        cfp_data: CFPAnalysisData = {
            "funding_agency": "National Institutes of Health",
            "program_name": "Cancer Biomarker Research Excellence Program",
            "award_amount": "$750,000",
            "project_duration": "4 years",
            "application_deadline": "2024-04-15",
            "eligibility_requirements": [
                "Principal investigator must hold PhD or MD degree in relevant biomedical field",
                "Institution must be accredited US research university or medical school",
                "Project must focus on cancer biomarker discovery and clinical validation",
                "Minimum 7 years of postdoctoral research experience in cancer biology or related field",
                "Access to clinical samples and patient populations through established partnerships",
            ],
            "evaluation_criteria": [
                "Scientific significance and innovation potential (35%)",
                "Technical approach and methodology rigor (30%)",
                "Principal investigator qualifications and track record (20%)",
                "Institutional resources and collaborative environment (15%)",
            ],
            "required_documents": [
                "Project narrative with specific aims and research plan (20 pages maximum)",
                "Detailed budget and comprehensive budget justification",
                "Biographical sketches for all key personnel including collaborators",
                "Letters of support from clinical partners and advisory board members",
                "Facilities and equipment description with access agreements",
                "Data management and sharing plan including patient privacy protections",
            ],
            "submission_requirements": [
                "Electronic submission through NIH grants.gov portal before 5:00 PM EST",
                "All documents must be in PDF format with embedded fonts",
                "Font size minimum 11 points with single-spaced text formatting",
                "Page margins must be at least 0.5 inches on all sides",
                "File size limitations: 10MB maximum per attachment",
            ],
            "research_focus": [
                "Cancer biomarker discovery using proteomics and genomics approaches",
                "Clinical validation studies in relevant patient populations",
                "Development of diagnostic assays for clinical implementation",
                "Translational research with clear pathway to clinical application",
                "Integration of artificial intelligence for biomarker pattern recognition",
            ],
            "quotes": [
                "Applications must demonstrate clear clinical relevance and translational potential with evidence of preliminary data supporting feasibility",
                "Priority will be given to projects that establish new collaborations between basic scientists and clinical investigators",
                "Proposed research must address significant unmet medical needs in cancer diagnosis or prognosis with potential for broad clinical impact",
                "Strong emphasis on reproducibility and validation across multiple patient cohorts with diverse demographic characteristics",
            ],
        }

        cfp_analysis = CFPAnalysisResult(
            funding_agency=cfp_data["funding_agency"],
            program_name=cfp_data["program_name"],
            award_amount=cfp_data["award_amount"],
            project_duration=cfp_data["project_duration"],
            application_deadline=cfp_data["application_deadline"],
            eligibility_requirements=cfp_data["eligibility_requirements"],
            evaluation_criteria=cfp_data["evaluation_criteria"],
            required_documents=cfp_data["required_documents"],
            submission_requirements=cfp_data["submission_requirements"],
            research_focus=cfp_data["research_focus"],
            quotes=cfp_data["quotes"],
        )

        build_evaluation_context(cfp_analysis=cfp_analysis)

        result = evaluate_cfp_analysis_quality(cfp_data)

        assert result["overall"] > 0.8, (
            f"Expected high overall quality for comprehensive CFP data, got {result['overall']}"
        )
        assert result["requirement_clarity"] > 0.8, "Should recognize detailed requirements"
        assert result["quote_accuracy"] > 0.7, "Should recognize well-formatted quotes"
        assert result["completeness"] > 0.9, "Should reflect complete data"
        assert result["categorization"] > 0.8, "Should recognize good categorization"

    @pytest.mark.asyncio
    async def test_evaluation_settings_json_content(self) -> None:
        """Test evaluation settings for JSON content with different content types."""
        # Test clinical trial JSON settings
        clinical_settings = build_evaluation_settings(
            is_clinical_trial=True,
            is_json_content=True,
        )

        assert clinical_settings["fast_confidence_threshold"] == 0.85
        assert clinical_settings["json_confidence_threshold"] == 0.95
        assert clinical_settings["fast_weight"] == 0.5
        assert clinical_settings["llm_weight"] == 0.5

        # Test research plan JSON settings
        research_settings = build_evaluation_settings(
            is_detailed_research_plan=True,
            is_json_content=True,
        )

        assert research_settings["fast_confidence_threshold"] == 0.8
        assert research_settings["json_confidence_threshold"] == 0.95
        assert research_settings["json_semantic_threshold"] == 0.6

        # Test basic JSON settings
        json_settings = build_evaluation_settings(is_json_content=True)

        assert json_settings["json_confidence_threshold"] == 0.95
        assert json_settings["json_semantic_threshold"] == 0.6
        assert json_settings["fast_weight"] == 0.5
        assert json_settings["llm_weight"] == 0.5

    @pytest.mark.asyncio
    async def test_context_integration_completeness(self) -> None:
        """Test that all context types are properly integrated."""
        section_config = GrantLongFormSection(
            id="integration_test",
            title="Integration Test",
            order=1,
            parent_id=None,
            depends_on=[],
            generation_instructions="Test integration",
            is_clinical_trial=True,
            is_detailed_research_plan=True,
            keywords=["biomarker", "clinical", "validation"],
            max_words=500,
            search_queries=["biomarker clinical validation"],
            topics=["clinical research", "biomarker validation"],
        )

        rag_context = [
            DocumentDTO(content="Clinical validation of biomarkers requires rigorous testing protocols"),
            DocumentDTO(content="Biomarker research integrates laboratory analysis with patient studies"),
        ]

        research_objectives = [
            ResearchObjective(
                number=1,
                title="Clinical biomarker validation",
                description="Validate biomarkers in clinical patient populations",
                feasibility_analysis="Feasible with clinical partnerships",
                innovation_score=8.0,
                research_questions=["How do biomarkers perform in clinical settings?"],
                methodology="Clinical validation studies",
                expected_outcomes="Validated biomarker panel",
                timeline="18 months",
                resources_required="Clinical facilities",
            )
        ]

        cfp_analysis = CFPAnalysisResult(
            funding_agency="NIH",
            program_name="Clinical Research Program",
            award_amount="$400,000",
            project_duration="3 years",
            application_deadline="2024-06-01",
            eligibility_requirements=["Clinical research experience"],
            evaluation_criteria=["Clinical significance"],
            required_documents=["Clinical protocol"],
            submission_requirements=["Electronic submission"],
            research_focus=["Clinical validation"],
            quotes=["Clinical relevance is essential"],
        )

        reference_corpus = [
            "Reference document on clinical biomarker validation",
            "Clinical research methodology guidelines",
        ]

        context = build_evaluation_context(
            section_config=section_config,
            rag_context=rag_context,
            research_objectives=research_objectives,
            cfp_analysis=cfp_analysis,
            reference_corpus=reference_corpus,
        )

        # Verify all context types are present
        assert "section_config" in context
        assert "rag_context" in context
        assert "research_objectives" in context
        assert "cfp_analysis" in context
        assert "reference_corpus" in context

        # Verify context structure and content
        assert context["section_config"] == section_config
        assert context["rag_context"] == rag_context
        assert context["research_objectives"] == research_objectives
        assert context["cfp_analysis"] == cfp_analysis
        assert context["reference_corpus"] == reference_corpus

        # Test that context improves evaluation quality
        keywords = context["section_config"].keywords
        topics = context["section_config"].topics

        # Test objectives evaluation with context
        objectives_result = evaluate_objectives_quality(research_objectives, keywords, topics)
        assert objectives_result["keyword_alignment"] > 0.5, "Should benefit from keyword alignment"

        # Test enrichment evaluation with context
        enrichment_data: EnrichmentData = {
            "technical_terms": ["clinical validation", "biomarker analysis"],
            "research_questions": ["How do biomarkers perform clinically?"],
            "context": "Clinical biomarker validation research with patient populations",
            "search_queries": ["clinical biomarker validation"],
        }

        enrichment_result = evaluate_enrichment_quality(enrichment_data, keywords, topics)
        assert enrichment_result["term_relevance"] > 0.5, "Should benefit from keyword/topic alignment"
