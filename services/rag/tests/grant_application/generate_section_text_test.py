from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import CFPAnalysisResult, GrantLongFormSection, ResearchObjective, ResearchTask

from services.rag.src.grant_application.generate_section_text import handle_generate_section_text


@pytest.fixture
def sample_research_objectives() -> list[ResearchObjective]:
    return [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        ),
        ResearchObjective(
            number=2,
            title="Create ML model",
            research_tasks=[
                ResearchTask(number=1, title="Design algorithms"),
                ResearchTask(number=2, title="Train model"),
            ],
        ),
    ]


@pytest.fixture
def sample_grant_section() -> GrantLongFormSection:
    return GrantLongFormSection(
        id="abstract",
        title="Abstract",
        order=1,
        parent_id=None,
        keywords=["summary", "overview"],
        topics=["project summary", "objectives"],
        generation_instructions="Write a comprehensive abstract summarizing the project objectives, methods, and expected outcomes",
        depends_on=[],
        max_words=250,
        search_queries=["abstract", "project summary", "research overview"],
        is_detailed_research_plan=False,
        is_clinical_trial=None,
    )


@pytest.fixture
def sample_shared_context() -> str:
    return """
    Recent advances in cancer biomarker discovery have shown that proteomics-based approaches
    can identify novel diagnostic markers. Machine learning models have proven effective at
    analyzing complex biological data. Clinical validation studies are essential for
    translating research findings into clinical practice.
    """


@pytest.fixture
def sample_cfp_analysis() -> CFPAnalysisResult:
    from packages.db.src.json_objects import (
        CategorizationAnalysisResult,
        CFPAnalysisEvaluationCriterion,
        CFPAnalysisMetadata,
        CFPAnalysisRequirementWithQuote,
        CFPAnalysisResult,
        CFPSectionAnalysis,
        CFPSectionLengthConstraint,
        CFPSectionRequirement,
    )

    return CFPAnalysisResult(
        cfp_analysis=CFPSectionAnalysis(
            required_sections=[
                CFPSectionRequirement(
                    section_name="Abstract",
                    definition="Project summary",
                    requirements=[
                        CFPAnalysisRequirementWithQuote(
                            requirement="Summarize project goals",
                            quote_from_source="Provide a clear summary of objectives",
                            category="summary"
                        )
                    ],
                    dependencies=[]
                )
            ],
            length_constraints=[
                CFPSectionLengthConstraint(
                    section_name="Abstract",
                    measurement_type="words",
                    limit_description="Maximum 250 words",
                    quote_from_source="Maximum 250 words for abstract",
                    exclusions=[]
                )
            ],
            evaluation_criteria=[
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Innovation and significance",
                    description="Evaluate innovation",
                    quote_from_source="Assess innovation"
                )
            ],
            additional_requirements=[],
            sections_count=5,
            length_constraints_found=3,
            evaluation_criteria_count=4
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
            evaluation_criteria=[]
        ),
        analysis_metadata=CFPAnalysisMetadata(
            content_length=1000,
            categories_found=8,
            total_sentences=50
        )
    )


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_success(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_shared_context: str,
    sample_cfp_analysis: CFPAnalysisResult,
) -> None:
    mock_section_text = """
    This project aims to develop novel biomarkers for early cancer detection through
    innovative proteomics approaches. We will identify and validate candidate biomarkers
    using mass spectrometry techniques, followed by the development of machine learning
    models to enhance diagnostic accuracy. The research combines cutting-edge technology
    with clinical validation to translate findings into practical diagnostic tools.
    """
    mock_with_prompt_evaluation.return_value = mock_section_text
    mock_handle_source_validation.return_value = None

    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=sample_research_objectives,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, str)
    assert result == mock_section_text
    assert len(result.strip()) > 0

    mock_with_prompt_evaluation.assert_called_once()
    mock_handle_source_validation.assert_called_once()


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_empty_research_objectives(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_shared_context: str,
    sample_cfp_analysis: CFPAnalysisResult,
) -> None:
    mock_section_text = "General project abstract without specific research objectives."
    mock_with_prompt_evaluation.return_value = mock_section_text
    mock_handle_source_validation.return_value = None

    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=[],
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, str)
    assert result == mock_section_text

    mock_with_prompt_evaluation.assert_called_once()
    mock_handle_source_validation.assert_called_once()


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_validation_error(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_shared_context: str,
    sample_cfp_analysis: CFPAnalysisResult,
) -> None:
    mock_handle_source_validation.return_value = "Insufficient context for reliable generation"

    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=sample_research_objectives,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    assert result == ""

    mock_handle_source_validation.assert_called_once()
    mock_with_prompt_evaluation.assert_not_called()


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_error_handling(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_research_objectives: list[ResearchObjective],
    sample_shared_context: str,
    sample_cfp_analysis: CFPAnalysisResult,
) -> None:
    mock_with_prompt_evaluation.side_effect = Exception("Section generation service error")
    mock_handle_source_validation.return_value = None

    with pytest.raises(Exception, match="Section generation service error"):
        await handle_generate_section_text(
            section=sample_grant_section,
            research_deep_dives=sample_research_objectives,
            shared_context=sample_shared_context,
            cfp_analysis=sample_cfp_analysis,
            trace_id=str(uuid4()),
        )

    mock_handle_source_validation.assert_called_once()
    mock_with_prompt_evaluation.assert_called_once()


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_single_research_objective(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: GrantLongFormSection,
    sample_shared_context: str,
    sample_cfp_analysis: CFPAnalysisResult,
) -> None:
    single_objective = [
        ResearchObjective(
            number=1,
            title="Develop biomarker assay",
            research_tasks=[
                ResearchTask(number=1, title="Design assay protocol"),
                ResearchTask(number=2, title="Validate assay performance"),
            ],
        )
    ]

    mock_section_text = """
    This project focuses on developing a novel biomarker assay for clinical diagnostics.
    The research will design and validate a robust assay protocol that can be implemented
    in clinical laboratories for routine diagnostic use.
    """
    mock_with_prompt_evaluation.return_value = mock_section_text
    mock_handle_source_validation.return_value = None

    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=single_objective,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    assert isinstance(result, str)
    assert result == mock_section_text

    mock_with_prompt_evaluation.assert_called_once()
    mock_handle_source_validation.assert_called_once()
