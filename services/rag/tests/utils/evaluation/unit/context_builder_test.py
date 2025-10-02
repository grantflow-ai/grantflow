from packages.db.src.json_objects import (
    CategorizationAnalysisResult,
    CFPAnalysisMetadata,
    CFPAnalysisResult,
    CFPSectionAnalysis,
    GrantLongFormSection,
    ResearchObjective,
    ResearchTask,
)

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.context_builder import (
    build_evaluation_context,
    build_evaluation_settings,
)


class TestBuildEvaluationContext:
    def test_build_evaluation_context_complete(self) -> None:
        section_config = GrantLongFormSection(
            id="methodology",
            title="Research Methodology",
            order=1,
            evidence="CFP evidence for Research Methodology",
            parent_id=None,
            depends_on=[],
            generation_instructions="Describe research methodology",
            is_clinical_trial=False,
            is_detailed_research_plan=True,
            keywords=["biomarker", "methodology", "analysis"],
            max_words=500,
            search_queries=["biomarker analysis methodology"],
            topics=["research methods", "biomarker analysis"],
        )

        rag_documents = [
            DocumentDTO(content="Research methodology document 1"),
            DocumentDTO(content="Biomarker analysis protocol document"),
        ]

        research_objectives = [
            ResearchObjective(
                number=1,
                title="Biomarker Analysis",
                description="Analyze biomarkers using mass spectrometry",
                research_tasks=[
                    ResearchTask(
                        number=1,
                        title="Mass spectrometry analysis",
                        description="Perform mass spectrometry analysis of biomarkers",
                    )
                ],
            )
        ]

        cfp_analysis = CFPAnalysisResult(
            cfp_analysis=CFPSectionAnalysis(
                required_sections=[],
                length_constraints=[],
                evaluation_criteria=[],
                additional_requirements=[],
                count=0,
                constraints_count=0,
                criteria_count=0,
            ),
            nlp_analysis=CategorizationAnalysisResult(
                money=[],
                date_time=[],
                writing_related=[],
                other_numbers=[],
                recommendations=[],
                orders=[],
                positive_instructions=[],
                negative_instructions=[],
                evaluation_criteria=[],
            ),
            analysis_metadata=CFPAnalysisMetadata(content_length=1000, categories_found=3, total_sentences=50),
        )

        reference_corpus = ["Reference document 1", "Reference document 2"]

        context = build_evaluation_context(
            section_config=section_config,
            rag_context=rag_documents,
            research_objectives=research_objectives,
            cfp_analysis=cfp_analysis,
            reference_corpus=reference_corpus,
        )

        assert context["section_config"] == section_config
        assert context["rag_context"] == rag_documents
        assert context["research_objectives"] == research_objectives
        assert context["reference_corpus"] == reference_corpus
        assert context["cfp_analysis"] == cfp_analysis

    def test_build_evaluation_context_string_rag_context(self) -> None:
        rag_string = "This is a string context that should be converted to DocumentDTO"

        context = build_evaluation_context(rag_context=rag_string)

        assert "rag_context" in context
        assert isinstance(context["rag_context"], list)
        assert len(context["rag_context"]) == 1
        rag_doc = context["rag_context"][0]
        assert "content" in rag_doc
        assert rag_doc["content"] == rag_string

    def test_build_evaluation_context_minimal(self) -> None:
        context = build_evaluation_context()

        assert isinstance(context, dict)
        assert len(context) == 0

    def test_build_evaluation_context_partial_data(self) -> None:
        section_config = GrantLongFormSection(
            id="intro",
            title="Introduction",
            order=1,
            evidence="CFP evidence for Introduction",
            parent_id=None,
            depends_on=[],
            generation_instructions="Write introduction",
            is_clinical_trial=False,
            is_detailed_research_plan=False,
            keywords=["research"],
            max_words=300,
            search_queries=["research introduction"],
            topics=["general research"],
        )

        context = build_evaluation_context(
            section_config=section_config,
        )

        assert context["section_config"] == section_config
        assert "rag_context" not in context
        assert "research_objectives" not in context

    def test_build_evaluation_context_empty_lists(self) -> None:
        context = build_evaluation_context(
            rag_context=[],
            research_objectives=[],
            reference_corpus=[],
        )

        assert context.get("rag_context", []) == []
        assert context.get("research_objectives", []) == []
        assert context.get("reference_corpus", []) == []


class TestBuildEvaluationSettings:
    def test_build_evaluation_settings_default(self) -> None:
        settings = build_evaluation_settings()

        assert settings["enable_nlp_evaluation"] is True
        assert settings["force_llm_evaluation"] is False

    def test_build_evaluation_settings_clinical_trial(self) -> None:
        settings = build_evaluation_settings(is_clinical_trial=True)

        assert settings["enable_nlp_evaluation"] is True
        assert settings["force_llm_evaluation"] is False
        assert settings["nlp_confidence_threshold"] == 0.85
        assert settings["nlp_accept_threshold"] == 90.0

    def test_build_evaluation_settings_detailed_research_plan(self) -> None:
        settings = build_evaluation_settings(is_detailed_research_plan=True)

        assert settings["enable_nlp_evaluation"] is True
        assert settings["force_llm_evaluation"] is False
        assert settings["nlp_confidence_threshold"] == 0.8
        assert settings["nlp_accept_threshold"] == 85.0

    def test_build_evaluation_settings_json_content(self) -> None:
        settings = build_evaluation_settings(is_json_content=True)

        assert settings["enable_nlp_evaluation"] is True
        assert settings["force_llm_evaluation"] is False
        assert settings["json_confidence_threshold"] == 0.95
        assert settings["json_semantic_threshold"] == 0.6
        assert settings["nlp_weight"] == 0.5
        assert settings["llm_weight"] == 0.5

    def test_build_evaluation_settings_force_llm(self) -> None:
        settings = build_evaluation_settings(
            enable_nlp_evaluation=False,
            force_llm_evaluation=True,
        )

        assert settings["enable_nlp_evaluation"] is False
        assert settings["force_llm_evaluation"] is True

    def test_build_evaluation_settings_combined_flags(self) -> None:
        settings = build_evaluation_settings(
            is_clinical_trial=True,
            is_detailed_research_plan=True,
            is_json_content=True,
        )

        assert settings["nlp_confidence_threshold"] == 0.85
        assert settings["nlp_accept_threshold"] == 90.0

        assert settings["json_confidence_threshold"] == 0.95
        assert settings["json_semantic_threshold"] == 0.6
        assert settings["nlp_weight"] == 0.5
        assert settings["llm_weight"] == 0.5

    def test_build_evaluation_settings_additional_settings(self) -> None:
        settings = build_evaluation_settings(
            enable_nlp_evaluation=True,
        )

        assert settings["enable_nlp_evaluation"] is True

    def test_build_evaluation_settings_override_defaults(self) -> None:
        settings = build_evaluation_settings(
            is_clinical_trial=True,
            nlp_confidence_threshold=0.95,
        )

        assert settings["nlp_confidence_threshold"] == 0.95
        assert settings["nlp_accept_threshold"] == 90.0
